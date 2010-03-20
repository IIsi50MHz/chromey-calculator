/*
 * Copyright (c) 2010 Brent Weston Robinett
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */
var cCalc = (function () {
	// -----------------------------------------------------------------------
	// 	Module declarations
	// -----------------------------------------------------------------------
	var calc, createQueryUri, extractCalcOutput, resultHtml, calcVar, calcStore;
	
	// -----------------------------------------------------------------------
	// 	Variables 
	// -----------------------------------------------------------------------
	var	calcSelStart, calcSelEnd, // variables to keep track of caret postion or selection in calc input area		
		maxResults = 500, history = History(maxResults), // variables for history			
		lastRawOutput, // gets substitued for @ (last result) variable
		lastAns,
		background = chrome.extension.getBackgroundPage();		
	
	// -----------------------------------------------------------------------
	// 	Event Handlers
	// -----------------------------------------------------------------------
	// TODO: This section pasted and chopped up from old calc.js. Still need to re-write this section, fill and fill missing pieces
	var $calcInput,	$calcResults, $calcResultsWrapper;
	function calcInit() {
		//delete localStorage.calcResults; delete localStorage.prevInputs; delete localStorage.varMap, localStorage.lastAns;
		//////
		// Stuff to do before DOM is ready
		function showSourceLink(e) {		
			$(this).stop().css("opacity", "").show();		
		}	
		function hideSourceLink(e) {		
			$(this).animate({opacity: "0"}, 500);	
		}	
		// Show/hide link to result source on hover	
		$(".resultLink").live("mouseenter", showSourceLink);
		$(".resultLink").live("mouseleave", hideSourceLink);	
		
		//////
		// Stuff to do once DOM is ready
		$(function () {		
			$calcInput = $("#calcInput");
			$calcResults = $("#calcResults");
			$calcResultsWrapper = $("#calcResultsWrapper");					
			
			// Restore calculator state
			calcStore.load();

			// Focus input area
			$calcInput.focus();
			
			// function to copy text to the clipboard
			function Copy(v) {
				var txt = $("<textarea/>").val(v).css({ position: "absolute", left: "-100%" }).appendTo("body");
				txt[0].select();
				document.execCommand("Copy");
				txt.remove();
			}			
			
			function popOutCalc() {		
				var defaultPopOutWindowInfo = "width=300,height=400,scrollbars=no"
				calcStore.save();		
				if (background.calcPopOut) {
					// don't let popout overwrite most current restults
					background.calcPopOut.jQuery(background.calcPopOut).unbind("unload blur");
					background.calcPopOut.close();			
				}
				background.calcPopOut = window.open('calc.html', 'calcPopOut', localStorage.popOutWindowInfo || defaultPopOutWindowInfo);		
			}		
			
			// Store pop-out position and dimentions as a single string that can be passed to window.open()
			function savePopOutWindowInfo() {			
				var height = ",height="+window.innerHeight;
				var width = ",width="+window.innerWidth;
				var top = ",top="+window.screenTop;
				var left = ",left="+window.screenLeft;		
				localStorage.popOutWindowInfo = "resizable=yes"+height+width+top+left;					
			}
			
			$(window).bind("unload blur", function () {
				calcStore.save();			
				// If there's a popup, update if we're enntering stuff in the dropdown
				if (background.calcPopOut && background.calcPopOut !== window) {		
					// don't let popout overwrite most current restults
					background.calcPopOut.jQuery(background.calcPopOut).unbind("unload blur");
					background.calcPopOut.location.reload();					
				} else if (background.calcPopOut && background.calcPopOut === window) {
					// save popout size and position info
					savePopOutWindowInfo();
				}
			});
			
			$("body").height(0);

			$("#clearAll").click(function () {
				// Clear results
				$calcResults.empty();
			});

			$("#popOut").click(function () {
				popOutCalc();
			});			
			
			// Handle enter and arrow keydown events
			$calcInput.keydown(function (e) {
				var inputVal = this.value.trim(), iconName, iconFile;
				// Handle special keys
				if (e.which === 13 && inputVal) { // Enter
					// Check for commands
					if (inputVal === 'clear') {
						// Clear results
						$calcResults.empty();			
					} else if (inputVal.indexOf('useIcon(') == '0') { // Change Chromey's toolbar icon
						iconName = inputVal.slice(8, inputVal.length - 1); // Strip the 'useIcon(' and ')' from our param here
						iconFile = "icon_"+iconName +".png";	
						// Don't change icon unless it exsits (list of possible icons set in background.html)
						if (background.icons.available[iconFile]) {
							localStorage.useIcon = iconFile;
							chrome.browserAction.setIcon({path: iconFile});							
						}									
					} else {
						// Do calculation
						calc.findResult(inputVal, function () {
							// Show result
							$calcResults.append(resultHtml.fullResult());
							// Sroll to bottom
							$calcResultsWrapper[0].scrollTop = $calcResultsWrapper[0].scrollHeight;
							// Limit nubmer of results to maxResults
							var $results = $calcResults.children();
							if ($results.length > maxResults) {
								$results.slice(0, $results.length - maxResults).remove();
							}
							// If there's a popup, update if we're enntering stuff in the dropdown
							if (background.calcPopOut && background.calcPopOut !== window) {
								calcStore.save();
								// Don't let popout overwrite most current results
								background.calcPopOut.jQuery(background.calcPopOut).unbind("unload blur");
								background.calcPopOut.location.reload();
							}
							$results.eq($results.length-1).find(".resultLink").show().css({opacity: ".8"}).animate({opacity: "0"}, 2000);
						});
					}
					// Update history
					history.add(inputVal);

					// Clear input area
					this.value = "";
				} else if (e.which === 38) { // Up arrow
					this.value = history.up(this.value);

					// Set cursor position to end of input
					setTimeout(function(){
						$calcInput[0].selectionStart = $calcInput[0].selectionEnd = $calcInput.val().length;
					}, 0);
				} else if (e.which === 40) { // Down arrow
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
	}
	// -----------------------------------------------------------------------
	// 	Stuff that needs a home
	// -----------------------------------------------------------------------
	// TODO: Find a better home for this stuff

	// query uri heads
	var queryUriHead = {
		google: "http://www.google.com/search?q=",
		alpha: "http://www.wolframalpha.com/input/?i="
	};	
	
	// -----------------------------------------------------------------------
	// 	Module definitions
	// -----------------------------------------------------------------------
	
	// -----------------------------------------------------------------------
	// 	calcStore
	// -----------------------------------------------------------------------
	calcStore = (function () {
		function loadCalcInfo() {
			// restore displayed results
			$calcResults[0].innerHTML = localStorage.calcResults || '';

			// restore results scroll position (actually... scroll to bottom);
			if (background.calcPopOut === window) {				
				$calcResultsWrapper[0].scrollTop = $calcResultsWrapper[0].scrollHeight;
			} else {				
				$calcResultsWrapper[0].scrollTop = $calcResultsWrapper[0].scrollHeight;
			}

			// restore input history
			if (localStorage.prevInputs) {
				history.set(JSON.parse(localStorage.prevInputs));
			}

			// restore user variables
			if (localStorage.varMap) {
				calcVar.init(JSON.parse(localStorage.varMap));
			}
			// restore last output
			calcVar.lastAns = localStorage.lastAns;
			
			// restore calc input value and caret positon (or text selection)
			if (localStorage.calcInput) {
				$calcInput.val(localStorage.calcInput);
				$calcInput[0].selectionStart = localStorage.calcSelStart;
				$calcInput[0].selectionEnd = localStorage.calcSelEnd;
			}			
		}
		
		function storeCalcInfo() {			
			// store results and inputs
			$calcResults.find(".resultLink").css({display: "block", opacity: "0"});
			localStorage.calcResults = $calcResults[0].innerHTML;
			localStorage.prevInputs = JSON.stringify(history);

			// store user variables			
			localStorage.varMap = JSON.stringify(calcVar.varMap());
			
			// store last answer
			localStorage.lastAns = calcVar.lastAns;

			// store state of calc input ares
			localStorage.calcInput = $calcInput.val();
			localStorage.calcSelStart = $calcInput[0].selectionStart;
			localStorage.calcSelEnd = $calcInput[0].selectionEnd;

			// store scroll position
			if (background.calcPopOut === window) {
				localStorage.popOutScrollTop = $calcResultsWrapper.scrollTop();				
			} else {
				localStorage.scrollTop = $calcResultsWrapper.scrollTop();
			}			
		}
		
		return {
			save: storeCalcInfo,
			load: loadCalcInfo
		}		
	}());	

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
	//			varName: <lh side of variable assignment, only if there was an assignment>,
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
				varAssign:  /^\s*@\w*\s*=\s*.+$/,
				varAssignNoSubst:  /^\s*@\w*\s*:=\s*.+$/,
			};

		// Extract output from query result doc			
		function findResult(input, callback) {		
			// Reset result object
			var result = calc.result = {prevResult: calc.result}, // Used to help contruct all the pieces of the result html				
				inputIsVarAssignNoSubst = isVarAssignNoSubst(input);
			
			// Save original input to result object
			result.origInput = $.trim(input);
			
			// Input is a variable assignment						
			if (isVarAssign(input) || inputIsVarAssignNoSubst) {				
				// Save LH and RH parts of input
				result.varName = calcVar.getName(input);
				result.varRhExpr = calcVar.getRhExpr(input);					
				// Update input to rh expression for calcQuery
				input = result.varRhExpr;
			}			

			// Input is nothing, no query
			var doQuery = true;
			if (inputIsVarAssignNoSubst) {
				result.outputDisplay = result.outputPlain = result.varRhExpr;
				doQuery = false;
			} else if (isNothing(input)) {				
				result.outputDisplay = result.outputPlain = "";
				doQuery = false;				
			// Input is just a number, no query
			} else if (isNumber(input)) {				
				result.outputDisplay = result.outputPlain = result.number = input;
				doQuery = false;
			// Input is a variable inspection, no query
			} else if (isVarInspect(input)) {				
				result.outputDisplay = result.outputPlain = result.varVal = calcVar.getVal(input);				
				doQuery = false;				
			}
			
			// Variable substitution
			if (!isVarInspect(input) && !inputIsVarAssignNoSubst) {
				calcVar.subst(input);
				input = calcVar.substResult;				
			}
			
			// Update result object if there were any substitutions
			if (input !== result.origInput && input !== result.varRhExpr) {
				calcVar.subst(result.origInput);
				result.varSubstInput = calcVar.substResult;				
				// Make output undefined sustitution contains undefined
				if (input.match(/undefined/)) {					
					result.outputDisplay = result.outputPlain = "undefined";
					doQuery = false;
				} else if (result.varSubstInput === "too much recursion") {
					result.outputDisplay = "<i>"+calcVar.substResult+"</i>";
					result.outputPlain = "undefined";
					result.varSubstInput = null;
					doQuery = false;
				}
			}
			
			if (doQuery) {
				// Go fishing for a result
				calcQuery(input, afterQuery);
			} else {
				// Done. No query needed.				
				afterQuery();				
			}
			
			function afterQuery() {
				// Save last answer				
				calcVar.lastAns = calc.result.outputPlain;				
				
				// Create variable if we need to
				if (result.varRhExpr) {
					calcVar.create(result.varName, result.outputPlain);
				}									
				callback && callback();	
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
				result.outputDisplay = "<i>no result found</i>";
				result.outputPlain = "undefined"; //calcQuery.origQueryInput || result.varSubstInput || result.origInput;
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
							// If "did you mean" failed, revert back to original query input
							if (result.status === "trying google, did you mean") {								
								input = calcQuery.origQueryInput;	
								delete calcQuery.origQueryInput;
								delete calcQuery.correctedInput;
							}
							// Set status for next query					
							result.status = nextStatus[result.status];
							// See if next status is "did you mean"
							if (result.status === "trying google, did you mean") {
								calcQuery.correctedInput = grabDidYouMeanInput(doc);
								// Save uncorrected query input
								calcQuery.origQueryInput = input;
								if (calcQuery.correctedInput) {									
									// Next input query will be the corrected one
									input = calcQuery.correctedInput;																							
								}
							}
							// Keep trying...
							calcQuery(input, callback);
						// Result found.
						} else {
							// If input was corrected, save it
							if (result.status === "trying google, did you mean") {							
								// Tack variable to front of corrected input if user is doing an assignment
								if (result.varName) {
									// @x = <corrected stuff>
									result.correctedInput = result.varName + ' = ' + calcQuery.correctedInput;
								} else {
									result.correctedInput = calcQuery.correctedInput;
								}
							}
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
			return !!$.trim(input).replace(/\./, "").match(rx.integer);
		}
		function isVarInspect(input) {
			return !!input.match(rx.varInspect);
		}
		function isVarAssign(input) {
			return !!input.match(rx.varAssign);
		}
		function isVarAssignNoSubst(input) {
			return !!input.match(rx.varAssignNoSubst);
		}
		return {
			findResult: findResult,
			result: {}
		};
	}());

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
			input = input.
				// add multipication sign between parentheses
				replace(/\)\s*\(/g, ')*(').
				// add multipication between digit char and "(" 
				replace(/(\d)\s*\(/g, '$1*(').
				// add multipication between ")" and digit char				
				replace(/\)\s*(\d)/g, ')*$1').
				// add an equals sign at the end of expressions that end with a number, or a number followed by a ")"
				//	NOTE: this forces expressions that look like, say, phone numbers to be evaluated
				//	NOTE: adding the = for some expressions gives no results when wrapped in parentheses
				//		Example: "(1000 km in ft)" works, but "(1000 km in ft)=" doesn't
				replace(/(.*\d\s*\)*\s*)$/g, '$1=');
				
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
	}());

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
				
				var outputDisplay = docHtml.replace(/.*=\s(.*)/, '$1'); // get stuff after = sign
				return {
					// get output for display (only using RH part of result for now)
					display: outputDisplay,
					// get raw output (used for calculator variables)
					plain: $('<div>'+outputDisplay+'</div>').text() // output cleaned of all markup
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
	}());

	// -----------------------------------------------------------------------
	// 	resultHtml.fullResult()
	// -----------------------------------------------------------------------
	//  Generates result html for display
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
			
			var origInputType = "inputText", varSubstInputType = "inputText";
			if (result.correctedInput) {
				if (result.varSubstInput) {
					varSubstInputType = "replacedInputText";
				} else {
					origInputType = "replacedInputText";
				}
			}			
			
			var resultInstructions; // [<result object property name>, <input type>, <html creator function name>]
			if (result.varName) {
				// Instructions for creating variable assignment input html
				resultInstructions = [	
					["origInput", origInputType, "createIntputHtml"], 
					["varSubstInput", varSubstInputType, "createIntputHtml"], 
					["correctedInput", "inputText", "createIntputHtml"]
				];			
			} else {
				// Instructions for regular input html								
				resultInstructions = [						
					["origInput", origInputType, "createIntputHtmlEq"], 
					["varSubstInput", varSubstInputType, "createIntputHtmlEq"], 
					["correctedInput", "inputText", "createIntputHtmlEq"]
				];
			}			
			
			// Create instructions for generating html for result
			var instr, func, prop, type, i, len = resultInstructions.length;			
			for (i = 0; i < len; i++) {
				instr = resultInstructions[i];	
				func = instr[2];
				prop = instr[0];
				type = instr[1];				
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
	}());
	
	calcVar = (function () {
		var varMap = {};
		// create a calculator variable
		// varName always starts with and "@" sign followed by one or more letters, numbers, or underscores
		// The most recent variables are kept. When the limit is reached, the oldes variables get tossed.
		// Need to clean up code and improve comments for this function
		function createVar(varName, varVal) {
			// remove outermost parentheses before storing (if there are no inner ones)
			varVal = varVal.replace(/\s*([\(\)])\s*/g, "$1").replace(/^\(+([^\(\)]*)\)+$/, "$1");
			
			if (varName !== "@" && varVal != null && varVal !== "undefined") { // don't save @ or undefined variables
				varMap.size || (varMap.size = 0);
				varMap.maxSize || (varMap.maxSize = 500);
				var varAlreadyExists = !!varMap[varName];

				if (varAlreadyExists) {
					// if variable already exsits, remove old links, create new links in the empty space
					if (varMap[varName].prevName) {
						varMap[varMap[varName].prevName].nextName = varMap[varName].nextName;
					} else if (varMap[varName].nextName) { // we're removing the oldest, set oldest to next oldest
						varMap.oldestVarName = varMap[varName].nextName;
					}
					if (varMap[varName].nextName) {
						varMap[varMap[varName].nextName].prevName = varMap[varName].prevName;
					}
				}

				// save new var
				varMap[varName] = {name: varName, val: varVal};

				if (!varMap.size) {
					// keep track of oldest var
					varMap.oldestVarName = varName;
				} else {
					// link new var to previous var
					varMap[varName].prevName = varMap.prevVarName;
				}

				// link previous variable to this one
				if (varMap.prevVarName) { // make sure there is a previous variable
					varMap[varMap.prevVarName].nextName = varName;
				}

				if (!varAlreadyExists) {
					if (varMap.size === varMap.maxSize) { // remove oldest variable if max size reached
						var nextOldestVarName = varMap[varMap.oldestVarName].nextName;

						// get rid of link to oldest variable
						delete varMap[nextOldestVarName].prevName;
						// remove oldest variable from list
						delete varMap[varMap.oldestVarName];

						// make next oldest variable the new oldest
						varMap.oldestVarName = nextOldestVarName;
					} else { // if variable name isn't in use already, variable map size gets one bigger
						varMap.size++
					}
				}

				// now, prevVarName becomes varName for next time user creates a variable
				varMap.prevVarName = varName;			
			}
		}

		// substitute values for caclulator variables into an expression		
		function substVar(expr) {
			var lhName = getVarLhName(expr), origExpr = expr;
			expr = getVarRhExpr(expr);
			if (expr) {
				// extract all variable names in expr
				var varNameArr = expr.match(/@\w+/g),
					openParen = "(",
					closedParen = ")";				
				// handle "@" variable
				expr = expr.
					// add spaces between @'s
					replace(/@@/g, "@ @").replace(/@@/g, "@ @").					
					// wrap substitute variable and wrap in parentheses
					replace(/@([^\w|@]+|$)/g, openParen+calc.result.prevResult.outputDisplay+closedParen+"$1");				
				// substitute the value of each variable into the expression (wrapped in parentheses)
				if (varNameArr) { // make sure we have variables other than the previous output "@" variable
					$.each(varNameArr, function () {
						var val = getVarVal(this);
						expr = expr.replace(/@\w+/i, openParen+val+closedParen);
					});
				}
				
				// get rid of spaces between parentheses
				expr = expr.replace(/\)\s*\(/g, ")(");
				// put lh var name back if original expr was an assignement
				if (lhName) {	
					expr = lhName + ' = ' + expr;
				}
			} else {
				expr = "undefined";
			}						
			
			// Keep going until we've replaced all variables					
			if (expr !== origExpr) {
				if (substVar.numCalls > 100) {
					substVar.numCalls = 0;
					calcVar.substResult = "too much recursion";
				} else {
					substVar.numCalls++
					substVar(expr);
				}
			} else {	
				substVar.numCalls = 0;
				calcVar.substResult = expr;
			}
		}
		substVar.numCalls = 0;
		function getVarRhExpr(input) {	
			// clean up input
			input = $('<div>'+input+'</div>').text();
			// grab rh expr
			return input.replace(/^\s*@\w*\s*:*=\s*(.+)\s*$/i, "$1");
		}
		function getVarLhName(input) {
			// return empty string if there is no rh variable
			if (!input.match(/^\s*@\w*\s*:*=/)) {
				return "";
			} else {
				return input.replace(/^\s*(@\w*)\s*:*=\s*.+\s*$/i, "$1");
			}
		}
		function getVarVal(varName) {
			if (varName === '@') {				
				return calcVar.lastAns;
			} else {
				return varMap[varName] && varMap[varName].val;
			}				
		}	
		function setVarMap(vm) {
			varMap = vm;
		}
		function getVarMap() {
			return varMap;
		}
		return {
			varMap: getVarMap,			
			init: setVarMap,
			create: createVar,
			subst: substVar,
			getRhExpr: getVarRhExpr,
			getName: getVarLhName,
			getVal: getVarVal,
			//substResult: null;
			//lastAns: null
		};
	}());
	
	// -----------------------------------------------------------------------
	// 	Initialize Chromey Calculator
	// -----------------------------------------------------------------------
	calcInit();
}());