/*
 * Copyright (c) 2010 Brent Weston Robinett
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */
(function () {
	// -----------------------------------------------------------------------
	// 	Module declarations
	// -----------------------------------------------------------------------	
	var calc, createQueryUri, extractCalcOutput, resultHtml;
	
	// -----------------------------------------------------------------------
	// 	Event Handlers
	// -----------------------------------------------------------------------
	// TODO: re-write this section, fill in missing pieces
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
		
		console.debug("$calcResults", $calcResults[0])
		
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
			console.log("keydown!")
			var inputVal = this.value.trim();
			// handle special keys
			if (e.which === 13 && inputVal) { // enter
				// check for commands
				if (inputVal === 'clear') {
					// clear results
					$calcResults.empty();					
				} else if (inputVal === 'alphaOn') {
					localStorage.alphaOn = 'true';
				} else if (inputVal === 'alphaOff') {
					localStorage.alphaOn = 'false';
				} else {													
					// do calculation
					calc.findResult(inputVal, function () {						
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
	// TODO: organize this stuff better...	
	
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
	function getVarRhExpr(input) {
		// TODO
		return input;
	}
	function getVarLhExpr(input) {
		// TODO
		return input;
	}
	function getVarVal(varName) {
		// TODO
		return varName;
	}	
	function substVar(input) {
		// TODO
		return input;
	}
	
	// -----------------------------------------------------------------------
	// 	Module definitions
	// -----------------------------------------------------------------------
	
	// -----------------------------------------------------------------------
	// 	calc 
	//	calc.findResult(input, callback)
	//		Takes user input and tries to find a result.
	// 	calc.result
	//		An object with stuff about result in it. (Used for generating html for result, among other things.)
	// -----------------------------------------------------------------------
	//	calc.findResult(input, callback)	
	// 	calc.result	
	// 		{
	//			origInput: <original user input>,			
	//			number: <original user input, only if it was a number>,
	//			varVal: <value of varaible, only if insepecting variable>,			
	//			varLhExpr: <lh side of variable assignment, only if there was an assignment>,
	//			varRhExpr: <rh side of variable assignment, only if there was an assignment>,		
	//			varSubstInput: <input with variables substituted, only if there were any>,
	//			correctedInput: <corrected input, only if it was corrected>,
	//			uri: <uri of query, only if there was a successful query>,
	//			queryType: <query type, only if there was a successful query>,
	//			output: <final output>, // TODO: need displayOutput and varOutput???
	//		}
	var calc = (function () {
		var queryTypeByStatus = { // Used to decide to query Google or Wolfram|Alpha				
				"trying google": "google",
				"trying google, did you mean": "google",
				"trying alpha": "alpha",		
				"failed": ""
			},		
			nextStatusByStatus = { // Used to decide what query to try next if last query failed
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
			var inputIsNothing = isNothing(input), 
				inputIsNumber = isNumber(input), 
				inputIsVarInspect = isVarInspect(input), 
				inputIsVarAssign = isVarAssign(input);
			
			// Reset result object
			calc.result = {}; // Used to help contruct all the pieces of the result html
			
			// Save original input to result object
			calc.result.origInput = input;			
			
			// Input is nothing, no query
			if (inputIsNothing) {				
				calc.result.output = "";	
				callback && callback(calc.result);
				return;			
			// Input is just a number, no query		
			} else if (inputIsNumber) {
				calc.result.output = calc.result.number = input;
				callback && callback(calc.result);
				return;
			// Input is a variable inspection, no query
			} else if (inputIsVarInspect) {
				calc.result.output = calc.result.varVal = getVarVal(input);		
				callback && callback(calc.result);
				return;
			// Input is a variable assignment
			} else if (inputIsVarAssign) {
				// Save LH and RH parts of input
				calc.result.varLhExpr = getVarLhExpr(input);			 
				calc.result.varRhExpr = getVarRhExpr(input);						
				
				// Update input to RH expression for calcQuery
				input = calc.result.varRhExpr;
			}				
			
			// Variable substitution
			input = substVar(input);					
			// Update result object if there were any substitutions
			if (input !== calc.result.origInput && input !== calc.result.varRhExpr) {			
				calc.result.varSubstInput = input;
			}	
			
			// Go fishing for a result
			console.log("1 calcQuery!!!")
			calcQuery(input, function () {
				// TODO
				// Display results
				console.log("calcQuery!!!")
				$calcResults.append(resultHtml.fullResult());
				callback && callback();
			});		
		}
		
		// Go find a result
		function calcQuery(input, callback) {			
			
			console.log("2 calcQuery!!!")
			// New query (start with google)
			if (!calcQuery.status) {			
				calcQuery.status = "trying google";
			}	
			var queryType = queryTypeByStatus[calcQuery.status || ""];
			
			// Query for result			
			$.ajax({
				url: createQueryUri[queryType](input),
				success: function (doc) {					
					var output = extractCalcOutput[queryType](doc).forDisplay;
					console.log("3 calcQuery!!!", output)
					calc.result = calc.result || {};
					
					// No result yet...
					if (!output) {
						calcQuery.status = nextStatusByStatus[calcQuery.status];
						// Keep trying...
						if (calcQuery.status && calcQuery.status !== "failed") {
							calcQuery(input, options);
						// No result found. Give up.						
						} else { 
							calc.result.output = input;							
							calc.result.queryType = queryType;
							callback && callback(calc.result);
						}
					// Result found.
					} else {						
						calc.result.output = output;
						calc.result.queryType = queryType;
						calc.result.uri = createQueryUri[queryType](input);
						callback && callback(calc.result);
					}
				}
			});
		}		
		
		function isNothing(input) {
			return !!input.match(input, rx.nothing);
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
			// TODO
			return input;
		}
		function getVarLhExpr(input) {
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
	var createQueryUri = (function () {		
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
	//		outputForDisplay = output.forDisplay;
	//	* Returns:
	//		{
	//			forDisplay: <output for display>,
	//			forVars: <output for storing in variables>
	// 		}
	var extractCalcOutput = (function () {			
		// Extract output from google query result doc
		function extractGoogleCalcOutput(doc) {		
			var $doc = $(doc);

			// grab result of calculation (doing fragile, goofy stuff to find google calculation within google search results)
			var resultHtml = $doc.find("img[src*=calc_img.gif]").
				parents('td:eq(0)').siblings().find('*').
				filter(function () {return $(this).text().match(' = ')}).
				slice(-1).html();		
			
			// clean up result for copy/paste...
			resultHtml = resultHtml.
				// ...fix exponents so we can copy/paste result
				replace(/<sup>/g, '<div style="display:inline-block; opacity:0; width:0px;">^</div><sup>').
				// ...remove weird font tags in long numbers
				replace(/<font[^>]*>/g, '').replace(/<\/font>/g, '').
				// ...remove spaces between numbers
				replace(/&nbsp;/g, ' ').replace(/([0-9])\s+([0-9])/g, '$1$2');
			
			return {
				// get output for display (only using RH part of result for now)
				forDisplay: resultHtml.replace(/.*=\s(.*)/, '$1'), // get stuff after = sign
				// get raw output (used for calculator variables)
				forVars: $('<div>'+resultHtml+'</div>').text() // output cleaned of all markup					
			}
		}
		// Extract result from Wolfram|Alpha query doc	
		function extractAlphaCalcOutput(doc) {		
			var resultsArray = doc.match(/^.*context.jsonArray.popups.*$/gm) || [];
			var context = {jsonArray: {popups: {}}};
			var resultObj = context.jsonArray.popups;
			
			$.each(resultsArray, function (i, val) {					
				console.log("heleo?!??!", val.replace(/",.*/, '"}'));
				try {						
					eval(val.replace(/",.*/, '"}'));
				}
				catch (e) {
					// Do nothing 
				}
			});
								
			var input = inputExpr, output;				
			var afterEqual; 
			if (resultObj.i_0100_1) {
				flag.hasAlphaResult = true;
				afterEqual = $.trim(resultObj.i_0100_1.stringified.replace(/[^=]*/, "")).replace("=", "");
			}
			if (afterEqual &&  !input.match(/^\s*solve/i)) {
				flag.hasAlphaResult = true;
				// make output look nicer
				output = afterEqual.
					replace("+", " + ").
					replace("-", " - ").
					replace(/^ - /, "-").
					replace(/\( - /, "(-");
				console.log("i_0100_1", output)
			} else if (resultObj.i_0200_1) {					
				flag.hasAlphaResult = true;
				output = resultObj.i_0200_1.stringified;
				console.log("i_0200_1", output)
			} else if (resultObj.i_0300_1) {
				flag.hasAlphaResult = true;
				output = resultObj.i_0300_1.stringified;
				console.log("i_0300_1", output)
			} else if (resultObj.i_0400_1) {
				flag.hasAlphaResult = true;
				output = resultObj.i_0400_1.stringified;
				console.log("i_0400_1", output)
			}
			
			return {
				forDisplay: output,
				forVars: output
			};
		}			
		
		return {
			google: extractGoogleCalcOutput,
			alpha: extractAlphaCalcOutput
		}		
	})();	
	
	// -----------------------------------------------------------------------
	// 	resultHtml.fullResult(result)
	// -----------------------------------------------------------------------
	//  Generates query uri from user input.
	//	* Examples:	
	//		uri = createQueryUri[queryType](input);	
	//	* Returns:
	//		<a uri>
	var resultHtml = (function () {		
		function createIntputHtml(type, expr) {
			if (!expr) {
				return '';
			}
			return "<div class='input'><span class='"+type+"'>" + expr + " =</span></div>";
		}		
		
		function createOutputHtml(type, expr) {
			if (!expr) {
				return '';
			}
			return "<div class='output'><span class='"+type+"'>" + expr + " =</span></div>";
		}
		
		function createLinkHtml(queryType, uri) {		
			if (!queryType) {
				return '';
			}
			
			var	linkText = {
				google: "G",
				alpha: "W"
			};	
			
			
			var resultLink = "<a target='_blank' class='resultLink'>"+linkText[queryType]+"</a>";		
			resultLink = $("<div>"+resultLink+"</div>").find('a').attr("href", calc.result.uri).end()[0].innerHTML;
			console.debug("linkText[queryType]", linkText[queryType], queryType, resultLink)
			return resultLink;
		}	
			
		function resultHtml() {			
			var result = calc.result;							
			var linkHtml = createLinkHtml(result.queryType, result.uri);			
			var resultInnerHtml = linkHtml;
			
			// Input correction
			if (result.correctedInput) {			
				// Variable substitutions made
				if (result.varSubstInput) {
					resultInnerHtml += createIntputHtml('inputText', result.origInput);					
					resultInnerHtml += createIntputHtml('replacedInputText', result.varSubstInput);
				// No variable substitutions
				} else {
					resultInnerHtml += createIntputHtml('replacedInputText', result.origInput);	
				}
				
				// Corrected and substituted input
				resultInnerHtml += createIntputHtml('inputText', result.correctedInput);				
				
			// No input correction	
			} else {				
				// Variable substitutions made
				if (result.varSubstInput) {
					resultInnerHtml += createIntputHtml('inputText', result.origInput);	
					resultInnerHtml += createIntputHtml('inputText', result.varSubstInput);
				// No variable substitutions
				} else {
					resultInnerHtml += createIntputHtml('inputText', result.origInput);	
				}
			}			
			
			// Output
			resultInnerHtml += createOutputHtml('outputText', result.output);
			
			console.log("calc.result.origInput", calc.result.origInput)
			console.log("result.output", result.output)
			// Full result html
			return "<li class='result'>"+ resultInnerHtml + "</li>";
		}	
		
		return {
			fullResult: resultHtml			
		};
	})();	
	
})();