/*
 * Copyright (c) 2009, 2010, 2011 Brent Weston Robinett <bwrobinett@gmail.com>
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */
var cCalc = (function (window, document) {	
	// -----------------------------------------------------------------------
	// 	Module declarations
	// -----------------------------------------------------------------------
	var calc, createQueryUri, extractCalcOutput, resultHtml, calcVar, calcStore, calcCmd;

	// -----------------------------------------------------------------------
	// 	Variables
	// -----------------------------------------------------------------------
	var precision = 13;
	
	var digitGroupSeparator = ",",
		digitGroupSize = "3",
		decimalMark = ".";
	
	var maxResultLinkOpacity = 0.99, // There's a weird Chrome bug that messes up bottom margin of the last result if this is set to 1
		minResultLinkOpacity = 0.35;
	
	var	calcSelStart, calcSelEnd, // variables to keep track of caret postion or selection in calc input area
		maxResults = 500, history = History(maxResults), // variables for history		
		queryCount = 0,		
		background = chrome.extension.getBackgroundPage(), 
		//chromeyCalcHelperId = "kncknbclhdncdolkfleoeefggfbclgpp"; // dev id
		chromeyCalcHelperId = "hfgnndipkjcpghbagmmcemdbjfclkcla"; // relase id	
	var queryMode = {
		all: {
			firstStatus: "trying js",
			queryTypeByStatus: { // Used to decide to query js or Google or give up
				"trying js": "js",
				"trying google": "google",
				"trying google, did you mean": "google",				
				"failed": ""
			},
			nextStatus: { // Used to decide what query to try next if last query failed
				"trying js": "trying google",
				"trying google": "trying google, did you mean",
				"trying google, did you mean": "failed"								
			}		
		},		
		js: { // Only "query" js
			firstStatus: "trying js",
			queryTypeByStatus: { // Used to decide to query js or Google give up
				"trying js": "js",				
				"failed": ""
			},
			nextStatus: { // Used to decide what query to try next if last query failed
				"trying js": "failed"				
			}			
		},
		google: { // Only query Google
			firstStatus: "trying google",
			queryTypeByStatus: { // Used to decide to query js or Google or give up
				"trying google": "google",
				"trying google, did you mean": "google",				
				"failed": ""
			},
			nextStatus: { // Used to decide what query to try next if last query failed
				"trying google": "trying google, did you mean",
				"trying google, did you mean": "failed",				
			}			
		},
	};
	var currentQueryMode = queryMode.all;
	var rxCleanInput = /:\s*(g|c|cg)$/i;
	// -----------------------------------------------------------------------
	// 	Some functions that need a better home...
	// -----------------------------------------------------------------------
	// function to copy text to the clipboard
	function Copy(v) {
		var txt = $("<textarea/>").val(v).css({ position: "absolute", left: "-100%" }).appendTo("body");
		txt[0].select();
		document.execCommand("Copy");
		txt.remove();
	}

	function popOutCalc() {
		var defaultPopOutWindowInfo = "width=300,height=400,scrollbars=no";
		calcStore.save();		
		if (background.calcPopOut) {
			// don't let popout overwrite most current restults
			background.calcPopOut.jQuery(background.calcPopOut).unbind("unload blur");
			background.calcPopOut.close();
		}
		background.calcPopOut = background.open('calc.html', 'calcPopOut', localStorage.popOutWindowInfo || defaultPopOutWindowInfo);
	}

	// Store pop-out position and dimentions as a single string that can be passed to window.open()
	function savePopOutWindowInfo() {
		var height = ",height="+window.outerHeight;
		var width = ",width="+window.outerWidth;
		var top = ",top="+window.screenTop;
		var left = ",left="+window.screenLeft;
		localStorage.popOutWindowInfo = "resizable=yes"+height+width+top+left;
	}			
	
	// Get option value from localStorage
	function getOption(opt, getFirst) {
		if (localStorage["opt_"+opt]) {
			return JSON.parse(localStorage["opt_"+opt]);
		} else {
			return "";
		}
	}
	
	// -----------------------------------------------------------------------
	// 	Initialization Code //**TODO: clean up this section
	// -----------------------------------------------------------------------
	var $calcInput,	$calcResults, $calcResultsWrapper;
	function calcInit(currentWindow) {		
		background.helperIsInstalled = false;
		chrome.extension.sendRequest(chromeyCalcHelperId, {"ding": "dong"}, function (response) {
			background.helperIsInstalled = true;			
		});
		// Set window to whatever window was passed to calcInit
		window = currentWindow;
		document = window.document;
		// Make sure we're using jQuery for current window
		$ = jQuery = background.jQuery = background.$ = window.jQuery;
		//delete localStorage.calcResults; delete localStorage.prevInputs; delete localStorage.varMap, localStorage.lastAns;		
		//////
		// Stuff to do before DOM is ready
		function showSourceLink(e) {
			$(this).stop().css("opacity", maxResultLinkOpacity);
		}
		function hideSourceLink(e) {
			$(this).animate({opacity: minResultLinkOpacity}, 500);
		}
		// Show/hide link to result source on hover
		$(document).undelegate();
		$(document).delegate(".resultLink", "mouseenter", showSourceLink);
		$(document).delegate(".resultLink", "mouseleave", hideSourceLink);

		//////
		// Stuff to do once DOM is ready
		$(function () {			
			$calcInput = $("#calcInput").unbind();
			$calcResults = $("#calcResults").unbind();
			$calcResultsWrapper = $("#calcResultsWrapper").unbind();			

			// Restore calculator state
			calcStore.load();

			// Focus input area
			$calcInput.focus();				

			$("body").height(0);

			$("#clearAll").unbind().click(function () {
				// Clear results
				$calcResults.empty();
			});

			$("#popOut").unbind().click(function () {
				popOutCalc();
			});
			
			$(window).unbind().bind("unload blur", function () {
				calcStore.save();				
				
				// If there's a popup, update if we're enntering stuff in the dropdown
				if (background.calcPopOut && background.calcPopOut !== window) {
					// don't let popout overwrite most current restults
					background.calcPopOut.jQuery(background.calcPopOut).unbind("unload blur");					
				} else if (background.calcPopOut && background.calcPopOut === window) {
					// save popout size and position info
					savePopOutWindowInfo();
				}
			}).bind("blur.helperFlag", function () {				
				// update flag for chekcing if helper extention is isntalled
				background.helperIsInstalled = false;
				chrome.extension.sendRequest(chromeyCalcHelperId, {"ding": "dong"}, function (response) {
					background.helperIsInstalled = true;			
				});
			});		

			// Handle enter and arrow keydown events
			$calcInput.keydown(function (e) {		
				var inputVal = this.value.trim(), iconName, cmdArgs, $calcPopOut, bg$;
				// Handle special keys
				if (e.which === 13 && inputVal) { // Enter					
					// Update query mode					
					if (inputVal.match(/:\s*g$/i)) {						
						currentQueryMode = queryMode.google;
					} else if (inputVal.match(/:\s*c$/i)) {
						currentQueryMode = queryMode.js;
					} else {
						currentQueryMode = queryMode.all;
					}					
					//inputVal = inputVal.replace(rxCleanInput, '');
					//console.debug('inputVal', inputVal, currentQueryMode)
					
					// Check for commands
					if (inputVal === 'clear') {
						// Clear results
						$calcResults.empty();
					} else if (inputVal.indexOf('useIcon(') == '0') { // Change Chromey's toolbar icon
						iconName = "icon_" + inputVal.slice(8, inputVal.length - 1) + ".png"; // Strip the 'useIcon(' and ')' from our param here
						// Don't change icon unless it exsits (list of possible icons set in background.html)
						if (iconName in background.icons) {
							localStorage.useIcon = iconName;
							chrome.browserAction.setIcon({path: background.icons[iconName]});
						}
					} else if (inputVal.indexOf('cc(') == '0') { // A Chromey Calculator Command
						// Strip the 'cc(' and ')' from our param here. Make an array of arguments
						cmdArgs = inputVal.slice(3, inputVal.length - 1).split(/\s*,\s*/);
						calcCmd[cmdArgs[0]] && calcCmd[cmdArgs[0]].apply({}, cmdArgs.slice(1));
					} else {
						// Continue from previous result (when we can). Looking for: + - * / ^ % (sticking with the basics for now...)
						if (inputVal.match(/^[+\-*\/^%]/)) { // operator doesn't need space before it
							inputVal = '@' + inputVal;							
						} else if (inputVal.match(/^plus\s+|^minus\s+|^times\s+|^x\s+|^divided\s+by\s+|^mod\s+|^modulo\s+|^modulus\s+/i)) { // operator needs space before it
							inputVal = '@ ' + inputVal;
						}
						
						// Do calculation
						calc.findResult(inputVal, function () {
							function updateResultsArea($calcResults, $calcResultsWrapper) {
								// Show result
								$calcResults.append(resultHtml.fullResult());
								// Scroll to bottom
								$calcResultsWrapper[0].scrollTop = $calcResultsWrapper[0].scrollHeight;
								// Limit nubmer of results to maxResults
								var $results = $calcResults.children();
								if ($results.length > maxResults) {
									$results.slice(0, $results.length - maxResults).remove();
								}
								$results.eq($results.length-1).find(".resultLink").show().css({opacity: maxResultLinkOpacity}).animate({opacity: minResultLinkOpacity}, 2000);
							}
							updateResultsArea($calcResults, $calcResultsWrapper);
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
			$(document).delegate(".outputText, .inputText, .replacedInputText, .errorInputText, .errorOutputText, .inputTextWithVars, .replacedVarAssignmentInputText, .varAssignmentInputText, .varAssignmentOutputText", "click", function (e) {
				var $this = $(this);
				var resultText = $this.text().replace(/\s*=\s*$/, '');  // prepare result text for insertion
				console.debug("e.target()", e.target, $(e.target).is(".plotLink"));
				if ($(e.target).is(".plotLink")) {
					// do nothing
				} else if (e.ctrlKey || e.metaKey) {
					Copy(resultText);
					$this.css({opacity: "0"});
					$this.animate({opacity: "1"}, 700);
				} else {
					var	inputVal = $calcInput.val(),
						head = inputVal.substring(0, calcSelStart),
						tail = inputVal.substring(calcSelEnd);

					// caclulate new location for insertion (so results are inserted from left to right)
					calcSelStart = calcSelEnd = calcSelStart + resultText.length;
					if (!window.getSelection().toString()) {
						$calcInput.val(head + resultText + tail);

					// focus calc input
						$calcInput.focus();
					}

					// set caret to end of inserted result
					$calcInput[0].selectionStart = $calcInput[0].selectionEnd = calcSelStart;
				}
				return {
					popOutCalc: popOutCalc
				}
			});

			// refocus calc input no matter where user clicks
			$(document).click(function () {
				if (!window.getSelection().toString()) {
					$calcInput.focus();
				}
			});
			$calcResultsWrapper.scroll(function () {$calcInput.focus();});			
		});
	}
	// -----------------------------------------------------------------------
	// 	Stuff that needs a home
	// -----------------------------------------------------------------------
	// TODO: Find a better home for this stuff

	// query uri heads
	var queryUriHead = {
		defaultGoogle: "http://www.google.com/search?q=",
		google: "http://www.google.com/search?q="
	};
	
	// Set google url
	function setGoogleQueryUriHead() {
		var localGoogleOn, localGoogleUrl, uri;
		if (background.helperIsInstalled && getOption("localGoogleOn") && getOption("localGoogleUrl")) {
			localGoogleOn = getOption("localGoogleOn")[0];
			localGoogleUrl = getOption("localGoogleUrl")[0];
			if (localGoogleOn && localGoogleUrl) {
				uri = localGoogleUrl
					.replace(/^(?!https?:\/\/)(.*)$/, "http://$1")
					.replace(/([^\/])$/, "$1/")
					+ "search?q=";
				queryUriHead.google = uri;				
			} else {				
				queryUriHead.google = queryUriHead.defaultGoogle;
			}
		} else {
			queryUriHead.google = queryUriHead.defaultGoogle;
		}
	}
	
	function doHelperQuery(queryType) {
		console.debug("------->", queryType, queryType === "google" && queryUriHead.google !== queryUriHead.defaultGoogle, 
		"\n-->", queryUriHead.google, "\n-->", background.helperIsInstalled, queryUriHead.defaultGoogle);
		return background.helperIsInstalled && queryType === "google" && queryUriHead.google !== queryUriHead.defaultGoogle;
	}

	// -----------------------------------------------------------------------
	// 	Module definitions
	// -----------------------------------------------------------------------

	// -----------------------------------------------------------------------
	// 	calcStore
	// -----------------------------------------------------------------------
	calcStore = (function () {
		// make sure there is a place to store options
		localStorage.options || (localStorage.options = {});	

		function loadCalcInfo() {			
			// restore user options
			calcCmd.loadOptions();
			
			// set default options
			calcCmd.setDefaultOptions();

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
			$calcResults.find(".resultLink").css({display: "block", opacity: minResultLinkOpacity});
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
		var rx = { // regexp
				nothing: /^\s*$/,
				integer: /^\s*\d+\s*$/,
				varInspect: /^\s*@\w*\s*=*\s*$/,
				varAssign:  /^\s*@\w*\s*=\s*.+$/,
				varAssignNoSubst:  /^\s*@\w*\s*:=\s*.+$/
			};
		
		// Remove digit separators and make sure we're using "." for decimal markers
		function cleanNumbers(input) {
			return input.
				// Remove digit seperators
				replace(RegExp("(\\d)\\" + digitGroupSeparator + "(\\d)", "g"), "$1$2").
				// Replace decimal marker with "."
				replace(RegExp("(\\d)\\" + decimalMark + "(\\d)", "g"), "$1.$2");
		}
		
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
				(function () {
					var queryNum = ++queryCount;					
					calcQuery(input, function () {
						// Don't bother doing anything with the result if a new query was made before this one came back.
						if (queryNum === queryCount) {
							afterQuery.call(this, arguments);
						}
					});
				}());				
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
			var uri;
			var queryTypeByStatus = currentQueryMode.queryTypeByStatus;
			var nextStatus = currentQueryMode.nextStatus;	
			
			// Remove digit seperators, set decimal marker to "."
			input = cleanNumbers(input);
			// ======================================================  CHECK ME  ========================================================
			// 	This might be a good place to put a query-rate limiter, to prevent spamming Google and WolframAlpha
			// ======================================================  /CHECK ME  ========================================================
			
			// New query (set starting query type "try js", "try google", etc.)
			if (!calc.result.status) {
				calc.result.status = currentQueryMode.firstStatus;
			}
			console.debug('[----calc.result.status----]::::::', calc.result.status);
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
				if (getOption("localGoogleUrl")) {
					localGoogleOn = getOption("localGoogleOn")[0];
					localGoogleUrl = getOption("localGoogleUrl")[0];
					if (localGoogleOn && localGoogleUrl) {
					}
				}				
				// Set google query head
				setGoogleQueryUriHead();				
				// Create query uri
				uri = createQueryUri[queryType](input.replace(rxCleanInput, ''));				
				if (!uri) {
					queryCallback(input);
				} else {
					// Query for result								
					if (doHelperQuery(queryType)) {
						// Let Chromey Calculator Enhancer handle query
						chrome.extension.sendRequest(chromeyCalcHelperId, {queryUri: uri}, function (response) {							
							queryCallback(response.doc);		
						});
					} else {
						$.ajax({
							url: uri,
							success: queryCallback
						});
					}
				}
			}

			function queryCallback(doc) {
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
					result.uri = createQueryUri[queryType](input.replace(rxCleanInput, ''));
					callback && callback(result);
				}
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
		// no uri for javascript "query"
		function generateJsUri(input) {
			return false;
		}

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
		return {
			js: generateJsUri,
			google: generateInputGoogleQueryUri
		};
	}());

	// -----------------------------------------------------------------------
	// 	extractCalcOutput[queryType](doc)
	// -----------------------------------------------------------------------
	//  Extracts output from query result doc.
	//	* Examples:
	//		output = extractCalcOutput[queryType](doc);
	//		outputDisplay = output.display;
	//	* Returns:
	//		{
	//			display: <output for display>,
	//			plain: <output for storing in variables>
	// 		}
	extractCalcOutput = (function () {
		var maxDigits = 13;
		
		// Check to see if input has numbers too big for js or google to calculate accurately
		function hasBigNumbers(input) {
			var numArr = input.match(/\d+\.\d*|\d*\.\d+|\d+/g);
			var hasBigNum = false;
			var i = numArr.length;
			while (i--) {				
				if (numArr[i].replace(/\./, '').length > maxDigits) {					
					hasBigNum = true;
				};				
			};			
			return hasBigNum;
		}		
		
		// Attempt js eval only if input is safe and (checks for big numbers too)
		function sanitaryEval(input) {			
			var output = null, max = Math.pow(10, maxDigits), regexInputNotSanitary = /[^+\-*\/%.()\d\s]/;
			var inputIsSanitary = !regexInputNotSanitary.test(input);			
			var unroundedResult;
			// Get rid of leading zeros (otherwise js will treat them as octal)
			input = input.replace(/(^|[^\d.])0+([^.])/g, '$1$2');			
			if (inputIsSanitary && !hasBigNumbers(input)) {		
				// Try to fix it so we don't get goofy results when calculating things like 2.01 - 2.0				
				unroundedResult = eval(input);				
				if (unroundedResult <= max) {					
					output = +(unroundedResult.toPrecision(maxDigits));				
					console.debug("unroundedResult", unroundedResult);
					console.debug("roundedResult", output);
				}
			}			
			return output;
		}
		
		// Group digits to make output easier to read
		function insertDigitGroupSeparator(output) {
			// var integerPart = output.replace(/^(-?[0-9]+)([^0-9].*)$/, "$1"); 
				// afterIntegerPart = output.replace(RegExp("^" + integerPart + "(.*$)"), "$1");
			// console.debug("output>>>>>>>>>>", output);
			// console.debug("integerPart>>>>>", integerPart);
			// console.debug("afterIntegerPart", integerPart);
			// if (integerPart) {
				// output = integerPart.split("").reverse().join("").
					// replace(RegExp("(\\d{"+digitGroupSize+"})", "g"), "$1"+digitGroupSeparator).
					// split("").reverse().join("").
					// replace(RegExp("^[" + digitGroupSeparator + "]"), "") + 
					// afterIntegerPart;
			// }
			// NOTE: Have this do nothing for now. Bring back later... maybe...
			return output;
		}

		function extractUnitJsCalcOutput(input) {
			try {
				var output = unitsJsCalc(input);
				
				// Make js scientific notation look like google				
				if (/e[+-]\d+/.test(output)) {
					displayOutput = output.replace(/(.*)e\+*(-*\d+)(\s*\w.*$|$)/, '$1 &times; 10<div style="display:inline-block; opacity:0; width:0px;">^</div><sup>$2</sup><span>$3</span>');
				} else {
					displayOutput = output;
				}
				console.debug("output", output);
				return {
					display: insertDigitGroupSeparator(displayOutput),
					plain: $('<div>'+displayOutput+'</div>').text() // output cleaned of all markup
				};
			} catch (err) {
				return {
					display: null,
					plain: null
				};
			}
		}
		
		// Extract output from javascript "query"
		function extractJsCalcOutput(input) {
			var output, displayOutput;
						
			// // For now, don't use javscript ever
			// return {
				// display: null,
				// plain: null
			// };
			
			input = input.replace(rxCleanInput, '');
			try {
				// try using js to evaluate input
				output = sanitaryEval(input);					
				console.debug("typeof output", typeof output)
				if (typeof output === "number") {						
					// Make js scientific notation look like google				
					output = output.toString();
					if (/e[+-]\d+$/.test(output)) {
						displayOutput = output.replace(/(.*)e\+*(-*\d+)/, '$1 &times; 10<div style="display:inline-block; opacity:0; width:0px;">^</div><sup>$2</sup>');
					} else {
						displayOutput = output;
					}					
					return {
						display: insertDigitGroupSeparator(displayOutput),
						plain: $('<div>'+displayOutput+'</div>').text() // output cleaned of all markup
					};
				} else {
					return {
						display: null,
						plain: null
					};
				}
 			} catch (err) {
				return {
					display: null,
					plain: null
				};
			}
		}

		// Extract output from google query result doc
		function extractGoogleCalcOutput(doc) {
			var $doc = $(doc);

			// grab result of calculation (doing fragile, goofy stuff to find google calculation within google search results)
			var docHtml = $doc.find("img[src*=calculator-40.gif]").
				parents('td:eq(0)').siblings().find('*').
				filter(function () {return $(this).text().match(' = ')}).
				slice(-1).html();
			if (!docHtml) {
				docHtml = $doc.find("img[src*=calc_img.gif]").
				parents('td:eq(0)').siblings().find('*').
				filter(function () {return $(this).text().match(' = ')}).
				slice(-1).html();					
			}
			// If no result try currency
			if (!docHtml) {
				docHtml = $doc.find(".currency").find("b").html();
			}
			// If no result try unit convertion boxes
			if (!docHtml) {
				docHtml = $doc.find("#ucw_rhs_d").val();
				if (docHtml) {
					docHtml += " " + $doc.find("#ucw_rhs_u").val();
				}
			}
			// If no result try oneBox
			if (!docHtml) {
				docHtml = $doc.find(".answers").find("b").html();
			}
			// If no result try obcontainer? Really fragile? Sometimes needed for population (sometimes not)
			if (!docHtml) {
				docHtml = $doc.find(".obcontainer").find("em").html();
			}			

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
					display: insertDigitGroupSeparator(outputDisplay),
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

		return {
			js: extractUnitJsCalcOutput,
			google: extractGoogleCalcOutput
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
			var	linkText = {google: "G"};
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
			// open plots in a new tab... 
			// var $out = $(result.outputDisplay);			
			// if ($out.is('.plotLink')) {
				// //background.open($out.attr('href'));
				// //$out.trigger('click'); // doesn't work
			// }
			resultInnerHtml += createOutputHtml('outputText', result.outputDisplay);

			// Full result html
			return "<li class='result'>"+ resultInnerHtml + "</li>";
		}

		return {
			fullResult: resultHtml
		};
	}());

	// -----------------------------------------------------------------------
	// 	calcVar
	// -----------------------------------------------------------------------
	// **TODO: explain how calcVar is used
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
				var varNameArr = expr.match(/@\w+|@/g),
					openParen = "(",
					closedParen = ")";				
				// substitute the value of each variable into the expression (wrapped in parentheses)
				if (varNameArr) { // make sure we have variables other than the previous output "@" variable
					$.each(varNameArr, function (i, varName) {				
						var val = getVarVal(varName);						
						expr = expr.replace(/@\w+|@/, openParen+val+closedParen);
					});
				}

				// get rid of spaces between parentheses (**TODO: see if we can get rid of this)
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
			if (varName == '@') {
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
			getVal: getVarVal
			//substResult: null;
			//lastAns: null
		};
	}());

	// -----------------------------------------------------------------------
	// 	calcCmd
	// -----------------------------------------------------------------------
	// User commands/options live here
	calcCmd = (function () {
		// -----------------------------------------------------------------------
		var
		options, // List of stored options
		obj; // Used to reference public returned object
		// -----------------------------------------------------------------------
		function zoom(fac) {
			fac || fac == 0 || (fac = "");

			// Chrome only allows popout to get so wide before adding scroll-bars
			var maxAllowed = 3;
			if (fac > maxAllowed) {
				fac = maxAllowed;
			}

			// Don't let user set things too narrow...
			var minAllowed = .5;
			if (fac !== "" && fac < minAllowed) {
				fac = minAllowed;
			}

			$("#calcResults").css("zoom", fac);
			if (this != null) {
				localStorage.opt_zoom = JSON.stringify([fac]);
			}
		}
		// -----------------------------------------------------------------------
		function width(w) {
			w = parseInt(w);
			w || (w = "");

			// Chrome only allows popout to get so wide before adding scroll-bars
			var maxAllowed = 800;
			if (w > maxAllowed) {
				w = maxAllowed;
			}

			// Don't let user set things too narrow...
			var minAllowed = 230;
			if (w !== "" && w < minAllowed) {
				w = minAllowed;
			}

			$("#calcWrapper").css("width", w);
			if (this != null) {
				!w || (w += "px");
				localStorage.opt_width = JSON.stringify([w]);
			}
		}
		// -----------------------------------------------------------------------
		function height(min, max) {
			min = parseInt(min);
			max = parseInt(max);
			min || min === 0 || (min = "");
			max || max === 0 || (max = "");

			// Chrome only allows popout to get so tall before adding scroll-bars
			var maxAllowed = 600;
			if (min > maxAllowed) {
				min = maxAllowed;
			}
			if (max > maxAllowed) {
				max = maxAllowed;
			}

			// Don't let user set height too small (keep scroll-bars from showing up when result area is empty)...
			var minAllowed = 153;
			if (min !== "" && min < minAllowed) {
				min = minAllowed;
			}
			if (max !== "" && max < minAllowed) {
				max = minAllowed;
			}

			if (min && max) { // Set min and max
				$("#calcWrapper").css({height: "auto", minHeight: min+"px", maxHeight: max+"px"});
			} else if (min) { // Just set the height
				$("#calcWrapper").css({height: min+"px", minHeight: "", maxHeight: ""});
			} else { // Reset
				$("#calcWrapper").css({height: "", minHeight: "", maxHeight: ""});
			}
			if (this != null) {
				!min || (min += "px");
				!max || (max += "px");
				localStorage.opt_height = JSON.stringify([min, max]);
			}
		}
		// -----------------------------------------------------------------------
		// Make dropdown as big as possible and make result text bigger
		function big() {
			width(10000);
			height(10000);
			zoom(1.4);
		}
		// -----------------------------------------------------------------------
		// Make dropdown as big as possible and make result text bigger
		function small() {
			width();
			height();
			zoom();
		}
		// -----------------------------------------------------------------------
		// Fonts
		function resultFont(fam) {
			$("#calcResultsWrapper").css({fontFamily: fam || ""});
			if (this != null) {
				localStorage.opt_resultFont = JSON.stringify([fam]);
			}
		}
		function inputFont(fam) {
			$("#calcInput").css({fontFamily: fam || ""});
			if (this != null) {
				localStorage.opt_inputFont = JSON.stringify([fam]);
			}
		}
		function titleFont(fam) {
			$("#chromeyCalcName").css({fontFamily: fam || ""});
			if (this != null) {
				localStorage.opt_titleFont = JSON.stringify([fam]);
			}
		}
		function headerLinksFont(fam) {
			$("#headerLinks").css({fontFamily: fam || ""});
			if (this != null) {
				localStorage.opt_headerLinksFont = JSON.stringify([fam]);
			}
		}
		function font(fam) {
			resultFont(fam);
			inputFont(fam);
			titleFont(fam);
			headerLinksFont(fam);
		}
		// -----------------------------------------------------------------------
		// Quick Key
		function quickKeyOn(isOn) {
			localStorage.opt_quickKeyOn = JSON.stringify([!!isOn]);
		}
		// -----------------------------------------------------------------------
		// Local Google URL
		function localGoogleOn(isOn) {
			localStorage.opt_localGoogleOn = JSON.stringify([!!isOn]);
		}
		// -----------------------------------------------------------------------
		// Local Google URL
		function localGoogleUrl(url) {
			localStorage.opt_localGoogleUrl = JSON.stringify([url]);
		}
		// -----------------------------------------------------------------------
		// Reset options
		function reset(opt) {
			var args;
			if (opt == null || opt === "all") {
				args = options;	
			} else {
				args = $.makeArray(arguments);
			}
			$(args).each(function (i, opt) {
				obj[opt] && obj[opt]();
			});
		}
		// -----------------------------------------------------------------------
		// Load all options (make sure this is called before page is loaded)
		function loadOptions() {
			$(options).each(function (i, opt) {
				console.debug("LAOD!", opt, "->", JSON.parse(localStorage["opt_"+opt] || "false"), "->", [defaultOptions[opt]], "???", defaultOptions);
				obj[opt] && obj[opt].apply(null, JSON.parse(localStorage["opt_"+opt] || "false") || [defaultOptions[opt]]);
			});
		}
		// -----------------------------------------------------------------------
		// Set default options
		var defaultOptions = {
			zoom: 1,
			width: "450px",
			height: "400px", 
			resultFont: "times",
			inputFont: "courier",
			titleFont: "courier",
			headerLinksFont: "arial"
		};
		function setDefaultOptions() {
			var key;
			for (key in defaultOptions) {
				console.debug("otpn!!!!!!!!", key, getOption(key)[0], typeof getOption(key)[0]);
				console.debug('localStorage["opt_'+key+'"]:', localStorage["opt_"+key], 'getOption("'+key+'")[0]', getOption(key)[0]); 
				if (!localStorage["opt_"+key] || getOption(key)[0] === "") {
					console.debug("set opt '", key, "' to:", defaultOptions[key]);
					obj[key](defaultOptions[key]);
				}
			}		
		}
		function resetOption(optName) {
			obj[optName](defaultOptions[optName]);
		}
		// -----------------------------------------------------------------------
		// List of stored options
		// =====================================================================  CHECK ME  =================================================================================
		options = [
			"zoom", "width", "height", "resultFont", "titleFont", "inputFont", "headerLinksFont", 
			"quickKeyOn", "localGoogleOn", "localGoogleUrl"
		];
		// -----------------------------------------------------------------------
		return obj = {
			loadOptions: loadOptions,
			defaultOptions: defaultOptions,
			setDefaultOptions: setDefaultOptions,
			resetOption: resetOption,
			zoom: zoom,
			width: width,
			height: height,
			big: big,
			small: small,
			resultFont: resultFont,
			inputFont: inputFont,
			headerLinksFont: headerLinksFont,
			titleFont: titleFont,
			font: font,
			quickKeyOn: quickKeyOn,
			localGoogleOn: localGoogleOn,
			localGoogleUrl: localGoogleUrl,
			reset: reset
		};
	}());
	// =====================================================================  /CHECK ME  =================================================================================

	// -----------------------------------------------------------------------
	// 	Initialize Chromey Calculator
	// -----------------------------------------------------------------------
	//calcInit();
	return {
		init: calcInit,
		calcCmd: calcCmd,
		popOutCalc: popOutCalc	
	}
}());
