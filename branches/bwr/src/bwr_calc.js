/*
 * Copyright (c) 2010 Brent Weston Robinett
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */
var cCalc =(function () {
	// -----------------------------------------------------------------------
	// 	Module declarations
	// -----------------------------------------------------------------------
	var calc, createQueryUri, extractCalcOutput, resultHtml;

	// -----------------------------------------------------------------------
	// 	Event Handlers
	// -----------------------------------------------------------------------
	// TODO: This section pasted and chopped up from old calc.js. Still need to re-write this section, fill and fill missing pieces
	var $calcInput,	$calcResults, $calcResultsWrapper;
	$(function () {
		var storeCalcInfo, background = chrome.extension.getBackgroundPage();

		$calcInput = $("#calcInput");
		$calcResults = $("#calcResults");
		$calcResultsWrapper = $("#calcResultsWrapper");

			// variables to keep track of caret postion or selection in calc input area
		var	calcSelStart,
			calcSelEnd,

			// variables for history
			maxResults = 500,
			history = History(maxResults), // new history!

			// user variables
			lastRawOutput, // gets substitued for @ (last result) variable
			lastAns,
			varMap = {};

		// focus input area
		$calcInput.focus();

		$("body").height(0);

		$("#clearAll").click(function () {
			// clear results
			$calcResults.empty();
		});

		$("#popOut").click(function () {
			popOutCalc();
		});

		// handle enter and arrow keydown events
		$calcInput.keydown(function (e) {
			var inputVal = this.value.trim();
			// handle special keys
			if (e.which === 13 && inputVal) { // enter
				// check for commands
				if (inputVal === 'clear') {
					// clear results
					$calcResults.empty();			
				} else {
					// do calculation
					calc.findResult(inputVal, function () {
						$calcResults.append(resultHtml.fullResult());
						// limit nubmer of results to maxResults
						var $results = $calcResults.children();
						if ($results.length > maxResults) {
							$results.slice(0, $results.length - maxResults).remove();
						}
						// If there's a popup, update if we're enntering stuff in the dropdown
						if (background.calcPopOut && background.calcPopOut !== window) {
							storeCalcInfo();
							// don't let popout overwrite most current restults
							background.calcPopOut.jQuery(background.calcPopOut).unbind("unload blur");
							background.calcPopOut.location.reload();
						}
						$results.eq($results.length-1).find(".resultLink").show().css({opacity: ".8"}).animate({opacity: "0"}, 2000);
					});
				}
				// update history
				history.add(inputVal);

				// clear input area
				this.value = "";
			} else if (e.which === 38) { // up arrow
				this.value = history.up(this.value);

				// set cursor position to end of input
				setTimeout(function(){
					$calcInput[0].selectionStart = $calcInput[0].selectionEnd = $calcInput.val().length;
				}, 0);
			} else if (e.which === 40) { // down arrow
				this.value = history.down(this.value);
			}
		});

		// insert input or output at caret position
		$calcInput.blur(function () {
			// saving text selection info on blur so we can insert clicked result at caret position
			calcSelStart = this.selectionStart;
			calcSelEnd = this.selectionEnd;
		});

		// insert result when user clicks on it
		$(".outputText, .inputText, .replacedInputText, .errorInputText, .errorOutputText, .inputTextWithVars, .replacedVarAssignmentInputText, .varAssignmentInputText, .varAssignmentOutputText").live("click", function (e) {
			var $this = $(this);
			var resultText = $this.text().replace(/\s*=\s*$/, '');  // prepare result text for insertion

			if (e.ctrlKey || e.metaKey) {
				Copy(resultText);
				$this.css({opacity: "0"});
				$this.animate({opacity: "1"}, 700);
			} else {
				var	inputVal = $calcInput.val(),
					head = inputVal.substring(0, calcSelStart),
					tail = inputVal.substring(calcSelEnd);

				// caclulate new location for insertion (so results are inserted from left to right)
				calcSelStart = calcSelEnd = calcSelStart + resultText.length;
				$calcInput.val(head + resultText + tail);

				// focus calc input
				$calcInput.focus();

				// set caret to end of insterted result
				$calcInput[0].selectionStart = $calcInput[0].selectionEnd = calcSelStart;
			}
		});

		// refocus calc input no matter where user clicks
		$(document).click(function () {$calcInput.focus();});
		$calcResultsWrapper.scroll(function () {$calcInput.focus();});
	});
	// -----------------------------------------------------------------------
	// 	Stuff that needs a home
	// -----------------------------------------------------------------------
	// TODO: Find a better home for this stuff

	// query uri heads
	var queryUriHead = {
		google: "http://www.google.com/search?q=",
		alpha: "http://www.wolframalpha.com/input/?i="
	};

	function loadCalcInfo() {
		// TODO
	}
	function storeCalcInfo() {
		// TODO
	}
	
	// -----------------------------------------------------------------------
	// 	Module definitions
	// -----------------------------------------------------------------------

	// -----------------------------------------------------------------------
	// 	calc
	//	calc.findResult(input, callback)
	//		Takes user input and tries to find a result.
	// 	calc.result
	//		An object containing a bunch of result info. (Used for generating html for result, among other things.)
	// -----------------------------------------------------------------------
	//	calc.findResult(input, callback)
	// 	calc.result
	// 		{
	//			origInput: <original user input>,
	//			number: <original user input, only if it was a number>,
	//			varVal: <value of variable, only if insepecting variable>,
	//			varLhExpr: <lh side of variable assignment, only if there was an assignment>,
	//			varRhExpr: <rh side of variable assignment, only if there was an assignment>,
	//			varSubstInput: <input with variables substituted, only if there were any>,
	//			correctedInput: <corrected input, only if it was corrected>,
	//			uri: <uri of query, only if there was a successful query>,
	//			queryType: <query type, only if there was a successful query>,
	//			status: <current status of result search>,
	//			output: <final output>,
	//			outputDisplay: <final output for display>,
	//			outputPlain: <final plain text output>
	//		}
	calc = (function () {
		var queryTypeByStatus = { // Used to decide to query Google or Wolfram|Alpha or give up
				"trying google": "google",
				"trying google, did you mean": "google",
				"trying alpha": "alpha",
				"failed": ""
			},			
			nextStatus = { // Used to decide what query to try next if last query failed
				"trying google": "trying google, did you mean",
				"trying google, did you mean": "trying alpha",
				"trying alpha": "failed"
			},
			rx = { // regexp
				nothing: /^\s*$/,
				integer: /^\s*\d+\s*$/,
				varInspect: /^\s*@\w*\s*=*\s*$/,
				varAssign:  /^\s*@\w*\s*=\s*.+$/
			};

		// Extract output from query result doc
		function findResult(input, callback) {
			// Reset result object
			var result = calc.result = {}; // Used to help contruct all the pieces of the result html	
			
			// Save original input to result object
			result.origInput = input;
			
			// Input is a variable assignment			
			if (isVarAssign(input)) {
				//console.debug("----inputIsVarAssign", input)
				// Save LH and RH parts of input
				result.varLhExpr = getVarLhName(input);
				result.varRhExpr = getVarRhExpr(input);

				// Update input to RH expression for calcQuery
				input = result.varRhExpr;
			}		

			// Input is nothing, no query
			var doQuery = true;
			if (isNothing(input)) {
				//console.debug("----inputIsNothing", input)
				result.outputDisplay = result.outputPlain = "";
				doQuery = false;				
			// Input is just a number, no query
			} else if (isNumber(input)) {
				//console.debug("----inputIsNumber", input)
				result.outputDisplay = result.outputPlain = result.number = input;
				doQuery = false;
			// Input is a variable inspection, no query
			} else if (isVarInspect(input)) {
				//console.debug("----inputIsVarInspect", input)
				result.outputDisplay = result.outputPlain = result.varVal = getVarVal(input);
				doQuery = false;				
			}
			
			// Variable substitution
			input = substVar(input);
			// Update result object if there were any substitutions
			if (input !== result.origInput && input !== result.varRhExpr) {
				result.varSubstInput = input;
			}
			
			if (doQuery) {
				// Go fishing for a result
				calcQuery(input, function () {
					callback && callback();
				});
			} else {
				// Done. No query needed.
				callback && callback();
				return;
			}
		}

		// Go find a result
		function calcQuery(input, callback) {
			// New query (start with google)
			if (!calc.result.status) {
				calc.result.status = "trying google";
			}
			var queryType = queryTypeByStatus[calc.result.status || ""],
				didYouMeanInfo = {},
				result = calc.result;
			if (result.status === "failed") {
				// No result found. Give up.
				result.outputDisplay = result.outputPlain = input;
				result.queryType = queryType;
				callback && callback(result);
			} else {
				// Query for result
				$.ajax({
					url: createQueryUri[queryType](input),
					success: function (doc) {
						var output = extractCalcOutput[queryType](doc);
						result = result || {};
						// No result yet...
						if (!output.plain) {
							// Update status
							result.status = nextStatus[result.status];
							// Check for "Did You Mean"
							if (result.status === "trying google, did you mean") {
								result.correctedInput = grabDidYouMeanInput(doc);
								if (result.correctedInput) {
									input = result.correctedInput;
								}
							}
							// Keep trying...
							calcQuery(input, callback);
						// Result found.
						} else {
							result.outputDisplay = output.display;
							result.outputPlain = output.plain;
							result.queryType = queryType;
							result.uri = createQueryUri[queryType](input);
							callback && callback(result);
						}
					}
				});
			}
		}

		// Grab "Did You Mean" if it exists
		function grabDidYouMeanInput(doc) {
			return $(doc).find(".spell").filter('a').eq(0).text();
		}
		function isNothing(input) {
			return !!input.match(rx.nothing);
		}
		function isNumber(input) {
			return $.trim(input).replace(/\./, "").match(rx.integer);
		}
		function isVarInspect(input) {
			return !!input.match(rx.varInspect);
		}
		function isVarAssign(input) {
			return !!input.match(rx.varAssign);
		}
		function getVarRhExpr(input) {			
			return input.replace(/^\s*@\w*\s*=\s*(.+)\s*$/i, "$1");
		}
		function getVarLhName(input) {
			return input.replace(/^\s*(@\w*)\s*=\s*.+\s*$/i, "$1");		
		}
		function substVar(input) {
			// TODO
			return input;
		}		
		function getVarVal(varName) {
			// TODO
			return varName;
		}		
		return {
			findResult: findResult,
			result: {}
		};
	})();

	// -----------------------------------------------------------------------
	// 	createQueryUri[queryType](input)
	// -----------------------------------------------------------------------
	//  Generates query uri from user input
	//	* Examples:
	//		uri = createQueryUri[queryType](input);
	//	* Returns:
	//		<a uri>
	createQueryUri = (function () {
		// Google uri
		function generateInputGoogleQueryUri(input) {
			return queryUriHead.google + encodeURIComponent(input);
		}
		// Wolfram|Alpha uri
		function generateInputAlphaQueryUri(input) {
			return queryUriHead.alpha + encodeURIComponent(input);
		}
		return {
			google: generateInputGoogleQueryUri,
			alpha: generateInputAlphaQueryUri
		};
	})();

	// -----------------------------------------------------------------------
	// 	extractCalcOutput[queryType](doc)
	// -----------------------------------------------------------------------
	//  Extracts output from query result doc.
	//	* Examples:
	//		output = extractCalcOutput[queryType](doc);
	//		outputdisplay = output.display;
	//	* Returns:
	//		{
	//			display: <output for display>,
	//			plain: <output for storing in variables>
	// 		}
	extractCalcOutput = (function () {
		// Extract output from google query result doc
		function extractGoogleCalcOutput(doc) {
			var $doc = $(doc);

			// grab result of calculation (doing fragile, goofy stuff to find google calculation within google search results)
			var docHtml = $doc.find("img[src*=calc_img.gif]").
				parents('td:eq(0)').siblings().find('*').
				filter(function () {return $(this).text().match(' = ')}).
				slice(-1).html();

			if (docHtml) {
				// clean up result for copy/paste...
				docHtml = docHtml.
					// ...fix exponents so we can copy/paste result
					replace(/<sup>/g, '<div style="display:inline-block; opacity:0; width:0px;">^</div><sup>').
					// ...remove weird font tags in long numbers
					replace(/<font[^>]*>/g, '').replace(/<\/font>/g, '').
					// ...remove spaces between numbers
					replace(/&nbsp;/g, ' ').replace(/([0-9])\s+([0-9])/g, '$1$2');

				return {
					// get output for display (only using RH part of result for now)
					display: docHtml.replace(/.*=\s(.*)/, '$1'), // get stuff after = sign
					// get raw output (used for calculator variables)
					plain: $('<div>'+docHtml+'</div>').text() // output cleaned of all markup
				};
			} else {
				return  {
					display: null,
					plain: null
				};
			}
		}
		// Extract result from Wolfram|Alpha query doc
		function extractAlphaCalcOutput(doc) {
			var resultsArray = doc.match(/^.*context.jsonArray.popups.*$/gm) || [];
			var context = {jsonArray: {popups: {}}};
			var resultObj = context.jsonArray.popups;

			$.each(resultsArray, function (i, val) {
				try {
					eval(val.replace(/",.*/, '"}'));
				}
				catch (e) {
					// Do nothing
				}
			});

			var input = calc.result.origInput,
				output, afterEqual;
			if (resultObj.i_0100_1) {
				afterEqual = $.trim(resultObj.i_0100_1.stringified.replace(/[^=]*/, "")).replace("=", "");
			}
			if (afterEqual &&  !input.match(/^\s*solve/i)) {
				// make output look nicer
				output = afterEqual.
					replace("+", " + ").
					replace("-", " - ").
					replace(/^ - /, "-").
					replace(/\( - /, "(-");
				//console.log("i_0100_1", output)
			} else if (resultObj.i_0200_1) {
				output = resultObj.i_0200_1.stringified;
				//console.log("i_0200_1", output)
			} else if (resultObj.i_0300_1) {
				output = resultObj.i_0300_1.stringified;
				//console.log("i_0300_1", output)
			} else if (resultObj.i_0400_1) {
				output = resultObj.i_0400_1.stringified;
				//console.log("i_0400_1", output)
			}

			return {
				display: output,
				plain: output
			};
		}

		return {
			google: extractGoogleCalcOutput,
			alpha: extractAlphaCalcOutput
		}
	})();

	// -----------------------------------------------------------------------
	// 	resultHtml.fullResult()
	// -----------------------------------------------------------------------
	//  Generates restult html for display
	//	* Examples:
	//		resultHtml.fullResult()
	//	* Returns:
	//		<a string>
	resultHtml = (function () {
		function createIntputHtml(type, expr) {			
			return "<div class='input'><span class='"+type+"'>" + expr + "</span></div>";
		}
		
		function createIntputHtmlEq(type, expr) {			
			return "<div class='input'><span class='"+type+"'>" + expr + " =</span></div>";
		}

		function createOutputHtml(type, expr) {			
			return "<div class='output'><span class='"+type+"'>" + expr + "</span></div>";
		}	

		function createLinkHtml(queryType, uri) {			
			var	linkText = {google: "G", alpha: "W"};
			var $resultLink = $("<div><a target='_blank' class='resultLink'>" + (linkText[queryType] || "") + "</a></div>");
			$resultLink = $resultLink.find("a").attr("href", calc.result.uri);
			return $($resultLink).parent().html() || "";
		}						
		
		function resultHtml() {
			var result = calc.result;
			var linkHtml = createLinkHtml(result.queryType, result.uri);
			var resultInnerHtml = linkHtml;				
			var funcPicker = {
				"createIntputHtml": createIntputHtml,
				"createIntputHtmlEq": createIntputHtmlEq
			}		
			console.log("ofig INPUT?", calc.result.origInput)
			// [<result object property name>, <input type>, <html creator function name>]
			var resultInstructions;			
			if (result.varLhExpr) {
				// Instructions for creating variable assignment input html
				resultInstructions = [	
					["origInput", "inputText", "createIntputHtml"], 
					["varSubstInput", "inputText", "createIntputHtml"], 
					["correctedInput", "replacedInputText", "createIntputHtml"]
				];			
			} else {
				// Instructions for regular input html
				resultInstructions = [						
					["origInput", "inputText", "createIntputHtmlEq"], 
					["varSubstInput", "inputText", "createIntputHtmlEq"], 
					["correctedInput", "replacedInputText", "createIntputHtmlEq"]
				];
			}			
			
			var instr, func, prop, type, i, len = resultInstructions.length;			
			for (i = 0; i < len; i++) {
				instr = resultInstructions[i];	
				func = instr[2];
				prop = instr[0];
				type = instr[1];
				console.log("prop", prop, result[prop], result)
				if (result[prop]) {
					resultInnerHtml += funcPicker[func](type, result[prop]);
				}
			}
		
			// Output
			resultInnerHtml += createOutputHtml('outputText', result.outputDisplay);

			// Full result html
			return "<li class='result'>"+ resultInnerHtml + "</li>";
		}

		return {
			fullResult: resultHtml			
		};
	})();

})();