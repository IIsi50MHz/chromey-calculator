/*
 * Copyright (c) 2009 Brent Weston Robinett
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */
 (function ($) {
	// hook up live event handlers before page loads
	// show/hide link to result source on hover	
	function showSourceLink(e) {
		var $this = $(this);
		var $resultLink = $this.find(".resultLink");
		$resultLink.stop().css("opacity", "").show();
		clearTimeout($this.data("showLinkTimeout"));
		var showLinkTimeout = setTimeout(function () {
			$resultLink.fadeOut(500);
		}, 2000);
		$this.data("showLinkTimeout", showLinkTimeout);
	}
	
	$(".result").live("mousemove", showSourceLink);	
	
	// flags
	var hasAlphaResult, hasGoogleResult;
	
	// query uri heads
	var googleQueryUriHead = "http://www.google.com/search?q=";
	var alphaQueryUriHead = "http://www.wolframalpha.com/input/?i=";
	
	// function to copy text to the clipboard
	function Copy(v) {
		var txt = $("<textarea/>").val(v).css({ position: "absolute", left: "-100%" }).appendTo("body");
		txt[0].select();
		document.execCommand("Copy");
		txt.remove();
	}
	
	// functions and variables for dealing with calculator pop-out 
	var storeCalcInfo, background = chrome.extension.getBackgroundPage();	
	
	function popOutCalc() {		
		var defaultPopOutWindowInfo = "width=300,height=400,scrollbars=no"
		storeCalcInfo();		
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
	
	// focus calc function (DOESN"T WORK)
	function focusCalc() {		
		//background.calcPopOut.focus(); // chrome has a bug where focus does nothing
		//background.calcPopOut.blur();  // blur brings window to front but still doesn't have focus	
	}
	
	$(function () {
		var $calcInput = $("#calcInput"),
			$calcResults = $("#calcResults"),
			$calcResultsWrapper = $("#calcResultsWrapper"),

			// variables to keep track of caret postion or selection in calc input area
			calcSelStart,
			calcSelEnd,
			
			// variables for history
			maxResults = 500,
			history = History(maxResults), // new history!

			// user variables
			lastRawOutput, // gets substitued for @ (last result) variable
			lastAns,
			varMap = {};
		
		
		// restore displayed results
		$calcResults[0].innerHTML = localStorage.calcResults || '';

		// restore results scroll position (actually... scroll to bottom);
		if (background.calcPopOut === window) {
			//$calcResultsWrapper.scrollTop(localStorage.popOutScrollTop);
			$calcResultsWrapper[0].scrollTop = $calcResultsWrapper[0].scrollHeight
		} else {
			//$calcResultsWrapper.scrollTop(localStorage.scrollTop);
			$calcResultsWrapper[0].scrollTop = $calcResultsWrapper[0].scrollHeight
		}

		// restore input history
		if (localStorage.prevInputs) {
			history.set(JSON.parse(localStorage.prevInputs));
		}

		// restore user variables
		if (localStorage.varMap) {
			varMap = JSON.parse(localStorage.varMap);
		}
		// restore last output
		lastAns = lastRawOutput = localStorage.lastAns;
		
		// restore calc input value and caret positon (or text selection)
		if (localStorage.calcInput) {
			$calcInput.val(localStorage.calcInput);
			$calcInput[0].selectionStart = localStorage.calcSelStart;
			$calcInput[0].selectionEnd = localStorage.calcSelEnd;
		}

		// focus input area
		$calcInput.focus();

		// store results when we unload the calculator
		storeCalcInfo = function () {			
			// store results and inputs
			$calcResults.find(".resultLink").hide();
			localStorage.calcResults = $calcResults[0].innerHTML;
			localStorage.prevInputs = JSON.stringify(history);

			// store user variables			
			localStorage.varMap =  JSON.stringify(varMap);
			
			// store last answer
			localStorage.lastAns = lastRawOutput;

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
			//delete localStorage.calcResults; delete localStorage.prevInputs; delete localStorage.varMap, localStorage.lastAns;
		}
		$(window).bind("unload blur", function () {
			storeCalcInfo();			
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
				} else if (inputVal === 'alphaOn') {
					localStorage.alphaOn = 'true';
				} else if (inputVal === 'alphaOff') {
					delete localStorage.alphaOn;
				} else {													
					// do calculation
					calc(inputVal, function () {						
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
						$results.eq($results.length-1).find(".resultLink").show().fadeOut(2000);
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

		// use google to do a calculation
		var isFirstSearch;
		function calc(inputExpr, callback) {
			// update lastAns for calculation			
			lastAns = lastRawOutput;
			
			// clean up input expression in case it was copied from displayed results...
			// ...replace spaces between numbers with times sign...
			var regexSpacesToTimesSign = /([0-9])\s+([0-9])/g;
			inputExpr = inputExpr.replace(regexSpacesToTimesSign, '$1×$2').replace(regexSpacesToTimesSign, '$1×$2');
			// ...strip trailing '=' sign (we alaways include an '=' sign end of search query; '==' messes google up)...
			var	regexStripTrailingEq = /\s*=\s*$/g;
			inputExpr = inputExpr.replace(regexStripTrailingEq, '');

			// check if there are any variables in expression (but not an assignment)
			var inputExprWithVars,
				wrappedInputExprWithVars = "";			
			if (inputExpr.match(/@\W*/g) || inputExpr.match(/@\w+/g) && !inputExpr.match(/^\s*@\w+\s*=\s*.+\s*$/i)) {
				// save out expression with variables still in
				inputExprWithVars = inputExpr;
				// substitute values for variables into expression
				inputExpr = substVar(inputExpr);
				wrappedInputExprWithVars = "<div class='input'><span class='inputTextWithVars'>" + inputExprWithVars + " =</span></div>";				
			}

			// convert calculation to google search
			var uriInputExpr = inputExpr.
				// add multipication sign between parentheses
				replace(/\)\s*\(/g, ')*(').
				// add multipication between digit char and "(" 
				//replace(/([\d])\s*\(/g, '$1*(').
				// add multipication between ")" and digit char				
				//replace(/\)\s*([\d])/g, ')*$1').
				// add an equals sign at the end of expressions that end with a number, or a number follow by a ")"
				//	NOTE: this forces expressions that look like, say, phone numbers to be evaluated
				//	NOTE: adding the = for some expressions gives no results when wrapped in parentheses
				//		Example: "(1000 km in ft)" works, but "(1000 km in ft)=" doesn't
				replace(/(.*[0-9]\s*\)*\s*)$/g, '$1=').
				// 10' in " --> 10 feet in inches
				replace(/'/g, " feet").replace(/"/g, " inches");

			isFirstSearch = true;			
			if (inputExprWithVars && inputExprWithVars.match(/^\s*@\w*\s*=\s*.+\s*$/i)) { // variable assignment
				// get unevaluated variable value
				var varName = inputExprWithVars.replace(/^\s*(@\w*)\s*=\s*.+\s*$/i, "$1");
				var varValInput = inputExprWithVars.replace(/^\s*@\w*\s*=\s*(.+)\s*$/i, "$1");
				var uriVarValInput = inputExpr.replace(/^[^=]*=\s*(.+)\s*$/i, "$1");	
				uriVarValInput = substVar(uriVarValInput);
				
				// evaluate variable value
				var varValInputUri = googleQueryUriHead + encodeURIComponent(uriVarValInput);
				getResult(varValInputUri, varValInput, function (result) {
					var inputExpr = result.inputExpr,
						outputExpr = result.outputExpr,
						uncorrectedInputExpr = result.uncorrectedInputExpr,
						rawOutput = result.rawOutput;			
						
					// construct html for displaying results					
					var wrappedInputWithVars;
					if (varValInput.match(/@/)) { // input contains variables
						inputExpr = substVar(inputExpr);
						outputExpr = substVar(outputExpr);
						rawOutput = substVar(rawOutput);
						
						// if result contains "undefined", make the whole result undefined						
						if (outputExpr && outputExpr.match(/undefined/)) {
							outputExpr = undefined;
						}
						if (rawOutput && rawOutput.match(/undefined/)) {
							rawOutput = undefined;
						}				
						
						wrappedInputWithVars  = "<div class='input'><span class='varAssignmentInputText'>" + varName + " = " + varValInput + "</span></div>";
					}
					
					if (!outputExpr) { // no result						
						var inputExprOutput = inputExpr;
						// if input contains "undefined", create output with whole result undefined					
						if (inputExprOutput && inputExprOutput.match(/undefined/)) {
							inputExprOutput = "undefined";
						}						
						
						// assign original rh string to caclulator variable if value doesn't evaluate to anyting
						createVar(varName, inputExprOutput);

						// prepare result html						
						wrappedInput  = "<div class='input'><span class='varAssignmentInputText'>" + varName + " = " + inputExpr + "</span></div>";						
						wrappedOutput = "<div class='output'><span class='varAssignmentOutputText'>" + inputExprOutput + "</span></div>";
					} else if (uncorrectedInputExpr) { // result was found and input corrected						
						// assign rh input result to caclulator variable
						createVar(varName, rawOutput);
						wrappedInput =
							"<div class='input'><span class='replacedVarAssignmentInputText'>" + varName + " = " + uncorrectedInputExpr + "</span></div>"+
							"<div class='input'><span class='varAssignmentInputText'>" + varName + " = " + inputExpr + "</span></div>";
						wrappedOutput = "<div class='output'><span class='varAssignmentOutputText'>" + outputExpr + "</span></div>";
					} else { // result found, no input correction						
						// assign rh input result to caclulator variable
						createVar(varName, rawOutput);
						wrappedInput = "<div class='input'><span class='varAssignmentInputText'>" + varName + " = " + inputExpr + "</span></div>";
						wrappedOutput = "<div class='output'><span class='varAssignmentOutputText'>" + outputExpr + "</span></div>";
					}

					// create link to result
					var resultLink = "";
					if (hasGoogleResult) {
						resultLink = "<a target='_blank' class='resultLink' href='"+googleQueryUriHead+encodeURIComponent(varValInput)+"'>G</a>"
					} else if (hasAlphaResult) {
						var uriInputExprEqualStripped = varValInput.replace(/=$/, "");
						resultLink = "<a target='_blank' class='resultLink' href='"+alphaQueryUriHead+encodeURIComponent(varValInput)+"'>W</a>"
					}
					
					var wrappedResultsInner;	
					wrappedOutput = wrappedOutput.replace(/\s*([\(\)])\s*/g, "$1").replace(/>\(+([^\(\)]*)\)+</, ">$1<"); // get rid of parentheses if just outer
					if (wrappedInputWithVars) { // assingment with vars in rh
						wrappedResultsInner = wrappedInputWithVars + wrappedInput + wrappedOutput;
					} else {
						wrappedResultsInner = wrappedInput + wrappedOutput;
					}
					var resultHtml = "<li class='result'>"+ resultLink + wrappedResultsInner + "</li>";					
					$calcResults.append(resultHtml);

					// scroll to bottom of results area
					var $calcResultsWrapper = $("#calcResultsWrapper");
					$calcResultsWrapper[0].scrollTop = $calcResultsWrapper[0].scrollHeight;
					callback && callback();					
				});
			} else if (inputExprWithVars && inputExprWithVars.match(/^\s*@\w*\s*$/)) { // variable inspection
				wrappedInput = "<div class='input'><span class='inputText'>" + inputExprWithVars + " =</span></div>";
				wrappedOutput = "<div class='output'><span class='outputText'>" + substVar(inputExprWithVars) + "</span></div>";	
				wrappedOutput = wrappedOutput.replace(/\s*([\(\)])\s*/g, "$1").replace(/>\(+([^\(\)]*)\)+</, ">$1<"); // get rid of parentheses if just outer
				
				var wrappedResultsInner = wrappedInput + wrappedOutput;				
				var resultHtml = "<li class='result'>"+ wrappedResultsInner + "</li>";
				$calcResults.append(resultHtml);

				// scroll to bottom of results area
				var $calcResultsWrapper = $("#calcResultsWrapper");
				$calcResultsWrapper[0].scrollTop = $calcResultsWrapper[0].scrollHeight;				
			} else { // no variable assignment
				var inputUri = googleQueryUriHead + encodeURIComponent(uriInputExpr);
				// get result from google
				getResult(inputUri, inputExpr, function (result) {
					// results
					var inputExpr = result.inputExpr,
						outputExpr = result.outputExpr,
						uncorrectedInputExpr = result.uncorrectedInputExpr,
						rawOutput = result.rawOutput;					
					// stuff to display
					var	wrappedInput,
						wrappedOutput,
						resultLink = "";

					// construct html for displaying results
					if (!outputExpr) { // no result
						var inputExprOutput = inputExpr;
						// if input contains "undefined", create output with whole result undefined					
						if (inputExprOutput && inputExprOutput.match(/undefined/)) {
							inputExprOutput = "undefined";
						}		
						// no result found -- give up
						wrappedInput  = "<div class='input'><span class='errorInputText'>" + inputExpr + " =</span></div>";
						wrappedOutput = "<div class='output'><span class='errorOutputText'>" + inputExprOutput + "</span></div>";
					} else if (uncorrectedInputExpr) { // result found, input corrected
						wrappedInput =
							"<div class='input'><span class='replacedInputText'>" + uncorrectedInputExpr + " =</span></div>"+
							"<div class='input'><span class='inputText'>" + inputExpr + " =</span></div>";
						wrappedOutput = "<div class='output'><span class='outputText'>" + outputExpr + "</span></div>";
					} else { // result found
						wrappedInput = "<div class='input'><span class='inputText'>" + inputExpr + " =</span></div>";
						wrappedOutput = "<div class='output'><span class='outputText'>" + outputExpr + "</span></div>";
					}
					
					// create link to result
					if (hasGoogleResult) {
						resultLink = "<a target='_blank' class='resultLink' href='"+googleQueryUriHead+encodeURIComponent(uriInputExpr)+"'>G</a>"
					} else if (hasAlphaResult) {
						var uriInputExprEqualStripped = uriInputExpr.replace(/=$/, "");
						resultLink = "<a target='_blank' class='resultLink' href='"+alphaQueryUriHead+encodeURIComponent(uriInputExprEqualStripped)+"'>W</a>"
					}
					
					var wrappedResultsInner;		
					if (!hasAlphaResult) {
						// NOTE: not sure why we're doing this... removing for W|Alpha results so we format them better.
						wrappedOutput = wrappedOutput.replace(/\s*([\(\)])\s*/g, "$1").replace(/>\(+([^\(\)]*)\)+</, ">$1<"); // get rid of parentheses if just outer
					}
					
					wrappedResultsInner = (wrappedInputExprWithVars + wrappedInput) + wrappedOutput;					
					var resultHtml = "<li class='result'>"+ resultLink + wrappedResultsInner + "</li>";
					$calcResults.append(resultHtml);

					// scroll to bottom of results area
					var $calcResultsWrapper = $("#calcResultsWrapper");
					$calcResultsWrapper[0].scrollTop = $calcResultsWrapper[0].scrollHeight;
					callback && callback();
				});
			}
		}

		// get results of an expression from google or W|Alpha
		// callback takes result object argument:
		//	{
		//		uncorrectedInputExpr: uncorrectedInputExpr,
		//		inputExpr: inputExpr,
		//		outputExpr: outputExpr,
		//		rawOutput: rawOutput // all markup stripped (used for calculator variables)
		//	{
		var uncorrectedInputExpr;
		var getResult = getGoogleResult;		
		
		// get W|Alpha result
		function getAlphaResult(uri, inputExpr, callback) {
			$.get(uri, function (htmlDoc) {				
				var resultsArray = htmlDoc.match(/^.*context.jsonArray.popups.*$/gm) || [];
				var context = {jsonArray: {popups: {}}};
				var resultObj = context.jsonArray.popups;
				$.each(resultsArray, function (i, val) {					
					try {
						eval(val.replace('\n', ''));
					}
					catch (e) {
						// do nothing 
					}
				});
									
				var input = inputExpr, output;				
				var afterEqual; 
				if (resultObj.i_0100_1) {
					hasAlphaResult = true;
					afterEqual = $.trim(resultObj.i_0100_1.stringified.replace(/[^=]*/, "")).replace("=", "");
				}
				if (afterEqual &&  !input.match(/^\s*solve/i)) {
					// make ouput look nicer
					output = afterEqual.
						replace("+", " + ").
						replace("-", " - ").
						replace(/^ - /, "-").
						replace(/\( - /, "(-");
				} else if (resultObj.i_0200_1) {
					output = resultObj.i_0200_1.stringified;
				} else if (resultObj.i_0300_1) {
					output = resultObj.i_0300_1.stringified;
				} else if (resultObj.i_0400_1) {
					output = resultObj.i_0400_1.stringified;
				}
				
				// if there is no outp	ut, output the input
				output = $.trim(output);
				output = output || inputExpr;				
				
				// remove outermost parentheses before storing (if there are no inner ones)	
				var outputExpr;				
				lastRawOutput = output && substVar(output).replace(/\s*([\(\)])\s*/g, "$1").replace(/^\(+([^\(\)]*)\)+$/, "$1");							
				if (output === undefined || (typeof outputExpr === "string" &&  output.match(/undefined/))) {
					output = "undefined";
				}
				if (outputExpr === undefined || (typeof outputExpr === "string" &&  outputExpr.match(/undefined/))) {
					outputExpr = "undefined";
				}
				if (lastRawOutput === undefined || (typeof lastRawOutput === "string" &&  lastRawOutput.match(/undefined/))) {
					lastRawOutput = "undefined";
				}
				
				callback && callback({
					uncorrectedInputExpr: undefined,
					inputExpr: input,
					outputExpr: output,
					rawOutput: output
				});
			});
		}
		
		// get google result
		function getGoogleResult(uri, inputExpr, callback) {
			hasAlphaResult = false;
			hasGoogleResult = false;
			$.get(uri, function (htmlDoc) {
				var $htmlDoc = $(htmlDoc);

				// grab result of calculation (doing fragile, goofy stuff to find google calculation within google search results)
				var resultHtml = $htmlDoc.find("img[src*=calc_img.gif]").
					parents('td:eq(0)').siblings().find('*').
					filter(function () {return $(this).text().match(' = ')}).
					slice(-1).html();
				var outputExpr;
				var rawOutput;				
				if (resultHtml) {
					hasGoogleResult = true;
					// clean up result for copy/paste...
					resultHtml = resultHtml.
						// ...fix exponents so we can copy/paste result
						replace(/<sup>/g, '<div style="display:inline-block; opacity:0; width:0px;">^</div><sup>').
						// ...remove weird font tags in long numbers
						replace(/<font[^>]*>/g, '').replace(/<\/font>/g, '').
						// ...replace spaces between numbers with commas
						replace(/&nbsp;/g, ' ').replace(/([0-9])\s+([0-9])/g, '$1,$2');

					// get output for display (only using RH part of result for now)
					outputExpr = resultHtml.replace(/.*=\s(.*)/, '$1'); // get stuff after = sign
					// get raw output (used for calculator variables)
					rawOutput = $('<div>'+outputExpr+'</div>').text(); // output cleaned of all markup
				} else {
					// if there is no result, see if there is spelling correction, and retry one more time
					var $didYouMean = $htmlDoc.find(".spell").filter('a').eq(0);					
					if (isFirstSearch && $didYouMean.length) {
						isFirstSearch = false;
						// clean up input expression...
						var didYouMeanExpr = $didYouMean.text().
							// ...replace spaces between numbers with commas...
							replace(/([0-9])\s+([0-9])/g, '$1,$2').
							// ...strip trailing '=' sign (we alaways include an '=' sign end of search query; '==' messes google up)...
							replace(/=\s*$/g, '');
						// save original input expression
						uncorrectedInputExpr = inputExpr;
						// try caclation a second time using "Did you mean...?" expression
						getResult(googleQueryUriHead + encodeURIComponent(didYouMeanExpr+'='), didYouMeanExpr, function (result) {
							callback(result);
							uncorrectedInputExpr = undefined; // reset uncorrectedInputExpr
						});
						return;
					} else {
						// no result found
						outputExpr = false;
						if (inputExpr !== "@") {
							// don't even try to use W|Alpha for plain numbers
							if (localStorage.alphaOn && !inputExpr.match(/^\s*\(*\d*\)*\s*$/)) {
								var waUri = uri.replace(googleQueryUriHead, alphaQueryUriHead);
								getAlphaResult(waUri, inputExpr, callback);	
								return;	
							} else {					
								rawOutput = inputExpr;							
							}
						} else { // use lastRawOutput if user is  just inspecting @ variable
							outputExpr = rawOutput = lastRawOutput;
						}
					}
				}
				
				// remove outermost parentheses before storing (if there are no inner ones)				
				lastRawOutput = rawOutput && substVar(rawOutput).replace(/\s*([\(\)])\s*/g, "$1").replace(/^\(+([^\(\)]*)\)+$/, "$1");							
				if (rawOutput === undefined || (typeof outputExpr === "string" &&  rawOutput.match(/undefined/))) {
					rawOutput = "undefined";
				}
				if (outputExpr === undefined || (typeof outputExpr === "string" &&  outputExpr.match(/undefined/))) {
					outputExpr = "undefined";
				}
				if (lastRawOutput === undefined || (typeof lastRawOutput === "string" &&  lastRawOutput.match(/undefined/))) {
					lastRawOutput = "undefined";
				}
				
				callback && callback({
					uncorrectedInputExpr: uncorrectedInputExpr,
					inputExpr: inputExpr,
					outputExpr: outputExpr,
					rawOutput: rawOutput // all markup stripped out
				});
			});
		}

		// create a calculator variable
		// varName always starts with and "@" sign followed by one or more letters, numbers, or underscores
		// The most recent variables are kept. When the limit is reached, the oldes variables get tossed.
		// Need to clean up code and improve comments for this function
		function createVar(varName, varVal) {
			// remove outermost parentheses before storing (if there are no inner ones)
			varVal = varVal.replace(/\s*([\(\)])\s*/g, "$1").replace(/^\(+([^\(\)]*)\)+$/, "$1");
			
			if (varName !== "@") { // don't save @
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
					if (varMap.size === varMap.maxSize) { // remove oldest varaible if max size reached
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
					replace(/@([^\w|@]+|$)/g, openParen+lastAns+closedParen+"$1");				
				// substitute the value of each variable into the expression (wrapped in parentheses)
				if (varNameArr) { // make sure we have variables other than the previous output "@" variable
					$.each(varNameArr, function () {
						var val = varMap[this] ? varMap[this].val : undefined;
						expr = expr.replace(/@\w+/i, openParen+val+closedParen);
					});
				}
				
				// get rid of spaces between parentheses
				expr = expr.replace(/\)\s*\(/g, ")(");
			} else {
				expr = undefined;
			}
			
			return expr;
		}
	});
})(jQuery);