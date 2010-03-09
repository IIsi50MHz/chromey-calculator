/*
 * Copyright (c) 2010 Brent Weston Robinett
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */
(function () {	
	var rx_number, rx_varInspect, rx_varAssign; // TODO: Create these regex's
	
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
		createResultHtml,
		googleQueryUriHead, // TODO
		alphaQueryUriHead; // TODO
	
	function loadCalcInfo() {
		// TODO
	}
	function storeCalcInfo() {	
		// TODO
	}	
	function getVarRhExpr() {
		// TODO
	}
	function getVarLhExpr() {
		// TODO
	}
	function getVarVal() {
		// TODO
	}
	
	function calc(input, options) {	
		var isNumber = !!input.match(input, rx_number), 
			isVarInspect = !!input.match(input, rx_varInspect), 
			isVarAssign = !!input.match(input, rx_varAssign);
		
		// reset result object
		calcQuery.result = {}; // Used to help contruct all the pieces of the result html
		
		// Save original input to result object
		calcQuery.result.origInput = input;
		
		// Input is just a number				
		if (isNumber) {
			calcQuery.result.output = calcQuery.result.number = input;		
		// Input is a variable inspection
		} else if (isVarInspect) {
			calcQuery.result.output = calcQuery.result.varVal = getVarVal(input);		
		// Input is a variable assignment
		} else if (isVarAssign) {
			// Save LH and RH parts of input
			calcQuery.result.varLhExpr = getVarLhExpr(input);			 
			calcQuery.result.varRhExpr = getVarRhExpr(input);						
			
			// Update input to RH expression for calcQuery
			input = calcQuery.result.varRhExpr;
		}				
		
		// Variable substitution
		input = substVar(input);		
		// Update result object if there were any substitutions
		if (input !== calcQuery.result.origInput && input !== calcQuery.result.varRhExpr) {			
			calcQuery.result.varSubstInput = input;
		}	
		
		calcQuery(input, callback: function () {
			// TODO
		});
		
		//calcQuery.result = {
			//origInput: null,			
			//number: null,
			//varVal: null,			
			//varLhExpr: null,
			//varRhExpr: null,		
			//varSubstInput: null,
			//correctedInput: null,
			//uri: null,
			//queryType: null,
			//output: null,
		//}
	}
	function calcQuery(input, callback) {			
		// New query (start with google)
		if (!calcQuery.status) {			
			calcQuery.status = "trying google";
		}	
		var queryType = queryTypeByStatus[calcQuery.status || ""];
		
		// Input is just a number. Don't bother with query.
		if (calcQuery.result.number != null) { 			
			callback && callback(calcQuery.result);
		// Input is a variable inspection. Don't bother with query.			
		} else if (calcQuery.result.varVal != null) { 
			callback && callback(calcQuery.result);
		// Query for result
		} else {						
			$.ajax({
				url: generateInputQueryUri(input, queryType),
				callback: function (doc) {				
					var calcQuery.result = calcQuery.result || {}, 
						output = extractCalcOutput(doc, queryType);
					
					// No result yet...
					if (!output) {
						calcQuery.status = nextStatusByStatus[calcQuery.status];
						// Keep trying...
						if (calcQuery.status && calcQuery.status !== "failed") {
							calcQuery(input, options);
						// No result found. Give up.						
						} else { 
							calcQuery.result.output = input;							
							calcQuery.result.queryType = queryType;
							callback && callback(calcQuery.result);
						}
					// Result found.
					} else {						
						calcQuery.result.queryType = queryType;
						calcQuery.result.uri = generateInputQueryUri(input, queryType);
						callback && callback(calcQuery.result);
					}
				}
			});
		}
	}
	
	
	function generateInputQueryUri(input, queryType)  {		
		var funcsByQueryType = {
			"google": generateInputGoogleQueryUri;
			"alpha": generateInputAlphaQueryUri;
		}
		
		funcsByQueryType[queryType](input);
	}	
	function generateInputGoogleQueryUri(input) {
		// TODO
	}
	function generateInputAlphaQueryUri(input) {
		// TODO
	} 
	
	
	function extractCalcOutput(doc, queryType)  {		
		var funcsByQueryType = {
			"google": extractGoogleCalcOutput;
			"alpha": extractAlphaCalcOutput;
		}
		
		funcsByQueryType[queryType](doc);
	}	
	function extractGoogleCalcOutput(doc) {
		// TODO
	}
	function extractAlphaCalcOutput(doc) {
		// TODO
	}	
	
	createResultHtml = {
	
		input: function (type, expr) {
			if (!expr) {
				return '';
			}
			return "<div class='input'><span class='"+type+"'>" + expr + " =</span></div>";
		},
		
		output: function (type, expr) {
			if (!expr) {
				return '';
			}
			return "<div class='ouput'><span class='"+type+"'>" + expr + " =</span></div>";
		},
		
		link: function (queryType, uri) {		
			if (!queryType) {
				return '';
			}
			
			var	linkText = {
				"google": "G",
				"alpha": "W"
			};		
			var resultLink = "<a target='_blank' class='resultLink'>"+linkText[queryType]+"</a>";		
			resultLink = $("<div>"+resultLink+"</div>").find('a').attr("href", googleQueryUriHead+encodeURIComponent(uriInputExpr)).end()[0].innerHTML;
			
			return $(resultLink);
		},	
			
		fullResult: function (result) {				
			//calcQuery.result = {
				//origInput: null,			
				//number: null,
				//varVal: null,			
				//varLhExpr: null,
				//varRhExpr: null,		
				//varSubstInput: null,
				//correctedInput: null,
				//uri: null,
				//queryType: null,
				//output: null,
			//}	
			
			var result = calcQuery.result;							
			var linkHtml = createResultHtml.link(result.queryType, result.uri);			
			var resultInnerHtml = linkHtml;
			
			// Input correction
			if (result.correctedInput) {			
				// Variable substitutions made
				if (result.varSubstInput) {
					resultInnerHtml += createResultHtml.input('inputText', result.origInput);					
					resultInnerHtml += createResultHtml.input('replacedInputText', result.varSubstInput);
				// No variable substitutions
				} else {
					resultInnerHtml += createResultHtml.input('replacedInputText', result.origInput);	
				}
				
				// Corrected and substituted input
				resultInnerHtml += createResultHtml.input('inputText', result.correctedInput);				
				
			// No input correction	
			} else {				
				// Variable substitutions made
				if (result.varSubstInput) {
					resultInnerHtml += createResultHtml.input('inputText', result.origInput);	
					resultInnerHtml += createResultHtml.input('inputText', result.varSubstInput);
				// No variable substitutions
				} else {
					resultInnerHtml += createResultHtml.input('inputText', result.origInput);	
				}
			}			
			
			// Output
			resultInnerHtml += createResultHtml.output('outputText', result.output);			
			
			// Full result html
			return "<li class='result'>"+ resultInnerHtml + "</li>";
		}			
	};
	
})();