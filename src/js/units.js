var global = this;
//(function () {
	function each(callback, thisArg) {
		var len = this.length;
		for (i = 0; i < len; i++) {
			callback.call(thisArg, this[i], i, this);
		}
	}
	// All units are converted to these when doing calculations
	var DIM = ["L", "M", "T"];
	var DEFAULT_DISPLAY_UNITS = {
		"L1": "m",
		"T1": "s",
		"M1": "kg",
		"L1T-1": "m/s",
		"L1T-2": "m/s^2",
		"L2": "m^2",
		"L3": "m^3"
	};
	//
	var incompatibleDimError = new Error("Uh oh, incompatible dimensions.");
	// Conversion factors for all units 
	var cupFactor	 = 0.000236588237,
		poundFactor	 = 0.45359237;
		
	var UNIT = {
		// ANGLE
		"radian":{dim:{}, factor:1, alias:["radian", "radians", "rad", "rads"]},
		"degree":{dim:{}, factor:Math.PI/180, alias:["degree", "degrees", "deg", "degs"]},
		
		// LENGTH
		"meter":{dim:{L:1}, factor:1, alias:["meter", "meters", "metre", "metres", "m"]},	
		"centimeter":{dim:{L:1}, factor:0.01, alias:["centimeter", "centimeters", "centimetre", "centimetres", "cm"]},
		"milimeter":{dim:{L:1}, factor:0.001, alias:["milimeter", "milimeters", "milimetre", "milimetres", "mm"]},
		"micron":{dim:{L:1}, factor:1e-6, alias:["micron", "microns"]},
		"kilometer":{dim:{L:1}, factor:1000, alias:["kilometer", "kilometers", "kilometre", "kilometres", "km"]},
		"inch":{dim:{L:1}, factor:0.0254, alias:["inch", "inches", "in", '"', "''"]},
		"foot":{dim:{L:1}, factor:0.3048, alias:["foot", "feet", "ft", "'"]},
		"yard":{dim:{L:1}, factor:0.9144, alias:["yard", "yards", "yd", "yds"]},
		"mile":{dim:{L:1}, factor:1609.344, alias:["mile", "miles", "mi"]},
		"lightyear":{dim:{L:1}, factor:9.4605284e15, alias:["lightyear", "lightyears"]},
		"parsec":{dim:{L:1}, factor:3.08568025e16, alias:["parsec", "parsecs"]},
		
		// AREA
		"acre":{dim:{L:2}, factor:Math.pow(1609.344,2)/640 , alias:["acre", "acres"]},
		
		// VOLUME
		"liter":{dim:{L:3}, factor:0.001, alias:["liter", "liters", "litre", "litres", "ltr"]},
		"mililiter":{dim:{L:3}, factor:1e-6, alias:["mililiter", "mililiters", "ml"]},
		"gallon":{dim:{L:3}, factor:cupFactor*16, alias:["gallon", "gallons", "gal", "gals"]},
		"quart":{dim:{L:3}, factor:cupFactor*4, alias:["quart", "quarts", "qt", "qts"]},
		"pint":{dim:{L:3}, factor:cupFactor*2, alias:["pint", "pints", "pt", "pts"]},
		"cup":{dim:{L:3}, factor:cupFactor, alias:["cup", "cups"]},
		"tablespoon":{dim:{L:3}, factor:cupFactor/16, alias:["tablespoon", "tablespoons", "tbsp", "tblsp"]},
		"teaspoon":{dim:{L:3}, factor:cupFactor/48, alias:["teaspoon", "teaspoons", "tsp"]},
		
		// TIME
		"microsecond":{dim:{T:1}, factor:1e-6, alias:["microsecond", "microseconds", "microsec", "microsecs"]},
		"milisecond":{dim:{T:1}, factor:1e-3, alias:["milisecond", "miliseconds", "milisec", "milisecs","ms"]},
		"second":{dim:{T:1}, factor:1, alias:["second", "seconds", "sec", "secs", "s"]},
		"minute":{dim:{T:1}, factor:60, alias:["minute", "minutes", "min", "mins"]},
		"hour":{dim:{T:1}, factor:3600, alias:["hour", "hours", "hr", "hrs", "h"]},
		"day":{dim:{T:1}, factor:3600*24, alias:["day", "days"]},
		"month":{dim:{T:1}, factor:3600*24*365.242199/12, alias:["month", "months"]},
		"year":{dim:{T:1}, factor:3600*24*365.242199, alias:["year", "years", "yr", "yrs"]},
		"decade":{dim:{T:1}, factor:10*3600*24*365.242199, alias:["decade", "decades"]},
		"score":{dim:{T:1}, factor:20*3600*24*365.242199, alias:["score"]},
		"century":{dim:{T:1}, factor:100*3600*24*365.242199, alias:["century", "centuries"]},
		"millenium":{dim:{T:1}, factor:1000*3600*24*365.242199, alias:["millenium", "millenia"]},
		
		// MASS
		"kilogram":{dim:{M:1}, factor:1, alias:["kilogram", "kilograms", "kg"]},
		"gram":{dim:{M:1}, factor:1e-3, alias:["gram", "grams", "g"]},
		"miligram":{dim:{M:1}, factor:1e-6, alias:["miligram", "miligrams", "mg"]},
		"pound":{dim:{M:1}, factor:poundFactor, alias:["pound", "pounds", "lb", "lbs"]}, // not really mass
		"stone":{dim:{M:1}, factor:14*poundFactor, alias:["stone", "stones"]}, // not really mass?
		"ton":{dim:{M:1}, factor:2000*poundFactor, alias:["ton", "tons"]}, // not really mass
		
		// SPEED
		"mph":{dim:{L:1, T:-1}, factor:1609.344/3600, alias:["mph"]},
		"kph":{dim:{L:1, T:-1}, factor:1000/3600, alias:["kph"]},
		
		// TEMPERATURE
		"Celsius":{
			dim:{TEMP:1}, 
			factor:function (x) {return x + 273.15;}, 
			invFactor:function (y) {return y - 273.15},
			alias:["Farenheight", "farenheight", "F"]
		},
		"Farenheight":{
			dim:{TEMP:1}, 
			factor:function (x) {return (x - 32)*9/5 + 273.15;},
			invFactor:function (y) {return (y - 273.15)*9/5 + 32;},			
			alias:["Celsius", "celsius", "Centigrade", "centigrade", "C"]
		},
		"Kelvin":{dim:{TEMP:1}, factor:1, alias:["Kelvin", "kelvin", "K"]},
		
		// CONSTANTS (careful!)
		//"G": {dim{L:3,T:-2,M:-1}, factor:6.67384e-11, alias:["G"]}, // From http://physics.nist.gov, 1/29/2012
		//"h": {dim{L:2,T:-1,M:1}, factor:6.62606957e-34, alias:["h"]}, // From http://physics.nist.gov, 1/29/2012
		//"c": {dim:{L:1,T:-1}, factor:299792458, alias:["c"]}, // From http://physics.nist.gov, 1/29/2012
		"pi": {dim:{}, factor:Math.PI, alias:["pi", "Pi", "PI"]},
		"e": {dim:{}, factor:Math.E, alias:["e", "E"]} //
		/////////////////////////////////////////////////
	};
	//------------------------------------------
	// expand UNIT object to include all alias units
	(function () {
		for (var key in UNIT) {
			var alias = UNIT[key].alias, i = alias.length;
			while (i--) {
				UNIT[alias[i]] = UNIT[key];
			}
		}
	}());	
	//------------------------------------------
	// Returns the unit object for a given key (e.g. "yards"); converts numbers to dimensionless unit objects.
	function toUnit(x) {
		var result, xNum = +x;
		if (x.factor != null) {
			result = x;
		} else if (isNaN(xNum)) {
			result = UNIT[x];
		} else {
			result = {dim:{}, factor:xNum};
		}
		return result;
	}
	//------------------------------------------
	function dimsMatch(u1, u2) {
		var dimAreCompatible = true;
		each.call(DIM, function (key) {
			dimAreCompatible = dimAreCompatible && u1.dim[key] == u2.dim[key];
		});
		return dimAreCompatible;
	}
	//------------------------------------------
	// Add unit objects (or numbers)
	function unitPlus(u1, u2) {
		var result = {dim:{}};
		if (u1 == null) {
			result = toUnit(0);
		} else if (u2 == null) {
			result = toUnit(u1);
		} else {
			u1 = toUnit(u1);
			u2 = toUnit(u2);
			// check if units have compatiple dimensions
			if (dimsMatch(u1, u2)) {
				// copy dim to result
				for (var key in u1.dim) {
					result.dim[key] = u1.dim[key];
				}
				// add factors
				result.factor = u1.factor + u2.factor;
			} else {
				result.incompatibleDim = true;
				throw incompatibleDimError;
			}
		}
		//console.debug("result", result);
		return result;
	}
	//------------------------------------------
	// Subtract units objects (or numbers)
	function unitMinus(u1, u2) { 
		var result;
		if (u1 == null) {
			result = toUnit(0);
		} else if (u2 == null) {
			result = toUnit(u1);
		} else {
			result = unitPlus(u1, unitTimes(u2, -1));
		}
		return result;
	}
	//------------------------------------------
	// Multiply unit objects (or numbers)
	function unitTimes(u1, u2) {		
		var result = {dim:{}};
		if (u1 == null) {
			result = toUnit(1);
		} else if (u2 == null) {
			result = toUnit(u1);
		} else {
			u1 = toUnit(u1);
			u2 = toUnit(u2);
			each.call(DIM, function (key) {
				// add matching dimension powers				
				result.dim[key] = (u1.dim[key] || 0) + (u2.dim[key] || 0);				

				// remove any 0 dimension
				if (!result.dim[key]) {
					delete result.dim[key];
				}	
			});
			// multiply factors
			result.factor = u1.factor*u2.factor;
		}		
		return result;
	}
	//------------------------------------------
	// Divide units objects (or numbers)
	function unitDiv(u1, u2) {		
		var result;
		if (u1 == null) {
			result = toUnit(1);
		} else if (u2 == null) {
			result = toUnit(u1);			
		} else {
			result = unitTimes(u1, unitPow(u2, -1));
		}
		return result;
	}
	//------------------------------------------
	// Raise unit object (or number) to a power. Power must be dimensionless.
	function unitPow(u, p) {
		var result;		
		
		if (u == null) {
			result = toUnit(1);
		} else if (p == null) {
			result = toUnit(u);
		} else {				
			// p should be dimensionless	
			p = toNum(p);
			if (p != null) {
				result = {dim:{}};
				u = toUnit(u);			
				for (var key in u.dim) {
					result.dim[key] = u.dim[key]*p
				}
				result.factor = Math.pow(u.factor, p);
			}
		}		
		return result;
	}
	//------------------------------------------
	// Convert a dimensionless unit object to a number
	function toNum(x) {
		// x can't be converted to number unless it's dimensionless
		var result, xNum = +x; 
		if (!isNaN(xNum)) {
			result = xNum;
		} else if (x.dim) {
			for (var key in x.dim) {break;}
			if (!key) {result = x.factor;}
		}
		return result;
	}	
	
	var prepareInputStr = (function () {
		//------------------------------------------
		function normalizeWordTokens(str) {
			var tokenObj, rx;
			var	arr = [], 
				i 	= tokenObjArr.length;
			
			while (i--) {
				tokenObj = tokenObjArr[i];
				if (tokenObj.aliasRx) {
					rx = RegExp("\\b("+tokenObj.aliasRx.source+")\\b.", "gi")
					str = str.replace(rx, tokenObj.token + " ");
				}
			}
			return str;
		}
		
		//------------------------------------------
		// Reformat str so it can be split into a special nested array
		function prepareInputStr(str) {
			var origStr = str;
			// normalize space
			str = str.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
			// make it so we can disambiguate "e" later
			str = str.replace(/([0-9])[eE][+]?([0-9])/g, "$1!e!$2"); // get rid of "+"
			str = str.replace(/([0-9])[eE][-]([0-9])/g, "$1!e!!$2"); // get rid of "-" (temporarily)
			// replace "×" with * if preceded and followed by space or digit (NOTE: not converting "x" for now.
			str = str.replace(/(\s)×(\s)/g, "$1*$2");
			// replace "x" with * for "1 x 2", "1x 2", "1 x2", but not "1x2" (simple way to make sure we can pass hex numbers on to google)
			str = str.replace(/(\s)x(\s)/g, "$1*$2");
			str = str.replace(/(\d)x(\s)/g, "$1*$2");
			str = str.replace(/(\s)x(\d)/g, "$1*$2");
			// replace " and ' with in and ft
			str = str.replace(/(''|")/g, " in ").replace(/'/g, " ft ");
			// replace space between integers and fractions with "#" (high priority add), replace "/" fraction part with "&" (high priority divide).
			str = str.replace(/(\d+)\s+(\d+)\/(\d+)/g, "$1#$2&$3");	
			// replace space after unit and before number "?" (medium priority add) (EX: 5 ft 10 in => 5|ft?10|in)
			str = str.replace(/([a-zA-Z])\s+(\d)/g, "$1?$2");
			// replace "^" with "\" for unit and constant powers (pi^2 => pi\2) (high priority power)
			str = str.replace(/([a-zA-Z])\s*\^\s*/g, "$1\\");
			// put a "|" betweeen numbers and units so we can make things like this work as expected: 10 ft / 5 ft = 2;
			str = str.replace(/([0-9])([a-zA-Z'"])/g, "$1|$2");
			str = str.replace(/([0-9a-zA-Z])\s+([a-zA-Z][^][-]?[0-9]|[a-zA-Z'"])/g, "$1|$2").replace(/([0-9a-zA-Z])\s+([a-zA-Z][^][-]?[0-9]|[a-zA-Z'"])/g, "$1|$2");
			// replace / before units with "`" so we can make things like this work as expected: 5 ft/sec / 5 in/sec = 12;
			str = str.replace(/([0-9a-zA-Z])\s*\/\s*([a-zA-Z])/g, "$1`$2").replace(/([0-9a-zA-Z])\s*\/\s*([a-zA-Z])/g, "$1`$2");
			// replace spaces with * unless adjacent to an operator or followed by a letter
			//console.debug("str1 *    >>> ", str);
			str = str.replace(/([^\+\-\*\/\^])\s([^\+\-\*\/\^])/g, "$1*$2");		
			//console.debug("str2 *    >>> ", str);
			// remove all spaces around operators
			str = str.replace(/\s*([^\+\-\*\/\^])\s*/g, "$1");	
			// add plus sign ' or " and numbers		
			str = str.replace(/(["'])([0-9])/g, "$1+$2");
			// add times sign between letters and anything not a letter or operator (unless the letter is "e")
			str = str.replace(/([^a-zA-Z\+\-\*\/\^\|\`\?\&\#\\!])([a-zA-Z])/g, "$1*$2");
			str = str.replace(/([a-zA-Z])([^a-zA-Z\+\-\*\/\^\|\`\?\&\#\\!])/g, "$1*$2");
			// replace minus operator with ~, but leave negative signs alone
			str = str.replace(/([^\+\-\*\/\^\|\`\?\&\#\\])-/g, "$1~");
			// trim space
			str = str.replace(/^\s+|\s+$/g, "");
			// replace stuff like "sine*", with "sin "
			str = normalizeWordTokens(str);
			// disambiguate "e" notation
			str = str.replace(/([0-9])!e!!([0-9])/g, "$1e-$2");
			str = str.replace(/([0-9])!e!([0-9])/g, "$1e$2");
			console.debug("*****prepareInputStr1", origStr);//KEEP
			console.debug("*****prepareInputStr2", str);//KEEP
			return str;
		}
		//------------------------------------------
		return prepareInputStr;
	}());
	
	
	// We create an array with a bunch of levels so we can easily keep track of the order of operations.
	// Plus is at the lowest level; Power is at the highest.
	// ~ is used for minus so we can treat it differently than the negative sign
	// We have couple extra operators so we can bind all units following a number together.
	// ...This lets us interpret something like "10 m/s / 10 ft/s" as "(10 m/s) / (10 ft/s) " instead of "(10 / 10) m*ft/s^2"
	
	//-----------------------------------------
	// TODO[DONE]: handle mixed numbers (e.g. 1 3/4 cups) 										
	// TODO[DONE]: handle this adjacent mixed units (e.g. 5 ft 11 in)
	// TODO[DONE]: handle unit conversion of result so everything doesn't have to be in m,s,kg.
	// TODO[DONE]: handle functions (tan, log, arcsin, etc.) 										
	// TODO[DONE]: handle constants (pi, e, etc.) 
	// TODO[DONE]: handle parentheses 
	//------------------------------------------
	var stringExprToNormalizedArrExpr = (function () {
		//---------------------------------
		function normalizedStrExprToArr(str) {
			var openParenPos, closeParenPos, parenCount, startToOpen, openToClose, closeToEnd, result;
			
			// Find position of first open paren
			openParenPos = str.indexOf("[");	
			if (openParenPos !== -1) {		
				for (var i = openParenPos + 1, parenCount = 1, len = str.length; 0 < parenCount && i < len; i++) {		
					// Increment count when we find an open paren; decrement when we find a closed one. 
					if (str[i] === "[") {
						parenCount++;
					} else if (str[i] === "]") {
						parenCount--;
					}
					
					// When the count reaches zero, we've found the matching paren
					if (parenCount === 0) {
						closeParenPos = i;
					}
				}	
				
				// Slice from string start to openParenPos 
				startToOpen = str.slice(0, openParenPos);
				// Slice from openParenPos to closeParenPos
				openToClose = str.slice(openParenPos+1, closeParenPos);
				// Slice from closeParenPos to end of string	
				closeToEnd = str.slice(closeParenPos+1);
				
				// build result
				result = [];
				if (startToOpen) { 
					// we don't need to process stuff before paren
					result.push.apply(result, startToOpen.split(","));
				}
				if (openToClose) {
					// apply function again to stuff between parens
					result.push(normalizedStrExprToArr(openToClose));
				}
				if (closeToEnd) {
					// apply function again to stuff after closing paren
					result = result.concat(normalizedStrExprToArr(closeToEnd));
				} 
			} else {
				result = str.split(",");
			}
			return result;	
		};
		//---------------------------------
		function normalizeToken(str, tokenObj) {
			var strMatch, replacementStr;
			var tokenType		= tokenObj.type,
				tokenName 		= tokenObj.name;
				tokenReplaceRx	= tokenObj.rx || RegExp(tokenObj.token),
				rx 				= surroundedTokenRx[tokenType](tokenReplaceRx),
				execArr			= rx.exec(str); // index, input, [0] -> last match chars, [1]...[n] -> parenthesised substring matches
			
			while (execArr) {
				strMatch = execArr[0];
				replacementStr = replaceToken[tokenType](execArr[1], tokenName, execArr[3]);
				str = str.slice(0,execArr.index) + replacementStr + str.slice(execArr.index + strMatch.length);
				rx.lastIndex = 0;
				// next match...
				execArr = rx.exec(str);
			}
			return str;
		}
		//---------------------------------
		function stringExprToNormalizedArrExpr(str) {
			var resultArr = prepareInputStr(str);
			
			for (var i = 0, len = tokenObjArr.length; i < len; i++) {
				resultArr = normalizeToken(resultArr, tokenObjArr[i]);
			}
			
			resultArr = resultArr.replace(/,\[/g, "[").replace(/\],/g, "]").replace(/\],\[/g, "][");
			console.debug("resultArrStr", resultArr); //KEEP
			resultArr = normalizedStrExprToArr(resultArr)[0];
			console.debug("resultArrArr>>", resultArr); //KEEP
			
			if (typeof resultArr === "string") {
				resultArr = ["Identity", resultArr];
			}
			
			return resultArr;
		}
		//---------------------------------
		
		return stringExprToNormalizedArrExpr;
	}());		
	
	var calcStrToUnit = (function () {
		//---------------------------------
		function calcSingleOpToUnit(arr) {
			return unitFuncMap[arr[0]].apply(null, arr.slice(1));
		}		
		//---------------------------------
		function calcArrFormToUnit(arr) {
			var item, i, len = arr.length;
			if (len > 1 && arr.join("").match(/,/)) {				
				for (i = 1; i < len; i++) {
					item = arr[i];
					if (item.constructor === Array) {
						arr[i] = calcArrFormToUnit(item);
					}
				}
			}
			return calcSingleOpToUnit(arr);
		}
		//---------------------------------
		function calcStrToUnit(str) {
			return calcArrFormToUnit(stringExprToNormalizedArrExpr(str))
		}			
		//---------------------------------
		
		return calcStrToUnit;
	}());
	
	var calcFromNestedParenStr = (function () {
		//------------------------------------------
		// Take a string and convert a nested array that duplicates the form of nested parentheses in the string.
		// Should be able to then evaluate from inside out using calcStrToUnit???
		/*
			5*(10 m + 50 feet^2 / (4 in))^10 + 3
			["5*, ["10 m + 50 feet^2 / ", ["4 in"]], "^10 + 3"]
		*/
		function parenToArr(str) {
			var openParenPos, closeParenPos, parenCount, startToOpen, openToClose, closeToEnd, result;
			
			// Find position of first open paren
			openParenPos = str.indexOf("(");	
			if (openParenPos !== -1) {		
				for (var i = openParenPos + 1, parenCount = 1, len = str.length; 0 < parenCount && i < len; i++) {		
					// Increment count when we find an open paren; decrement when we find a closed one. 
					if (str[i] === "(") {
						parenCount++;
					} else if (str[i] === ")") {
						parenCount--;
					}
					
					// When the count reaches zero, we've found the matching paren
					if (parenCount === 0) {
						closeParenPos = i;
					}
				}	
				
				// Slice from string start to openParenPos 
				startToOpen = str.slice(0, openParenPos);
				// Slice from openParenPos to closeParenPos
				openToClose = str.slice(openParenPos+1, closeParenPos);
				// Slice from closeParenPos to end of string	
				closeToEnd = str.slice(closeParenPos+1);
				
				// build result
				result = [];
				if (startToOpen) { 
					// we don't need to process stuff before paren
					result.push(startToOpen);
				}
				if (openToClose) {
					// apply function again to stuff between parens
					result.push(parenToArr(openToClose));
				}
				if (closeToEnd) {
					// apply function again to stuff after closing paren
					result = result.concat(parenToArr(closeToEnd));
				} 
			} else {
				result = [str];
			}

			// Remove any outer parens
			if (result.length === 1 && Object.prototype.toString.call(result[0]) === "[object Array]") {
				result = result[0];
			}

			return result;
		};
		//------------------------------------------
		function unitToStr(unitObj) {
			var factor = unitObj.factor, 
				dim = unitObj.dim, dimExp,
				units = "",
				displayUnitsKey = "", 
				displayUnits; 
			
			// Construct key so we can get the default display unit string (if it exists)
			each.call(DIM, function (key) {
				dimExp = dim[key];
				if (dimExp) {
					displayUnitsKey += key+dimExp;
				}
			});
			
			displayUnits = DEFAULT_DISPLAY_UNITS[displayUnitsKey];
			if (displayUnits) {
				factor = factor/calcStrToUnit(displayUnits).factor;
				// We found default display units. Convert to those units and use the display units string
				result = factor.toString() + " " + displayUnits;
			} else {
				// No default display units. Create an ugly display units string.
				each.call(DIM, function (key) {
					dimExp = dim[key];
					if (dimExp) {
						units += " " + DEFAULT_DISPLAY_UNITS[key+"1"];
						if (dimExp != 1) {
							units += "^" + dimExp;
						}
					}
				});
				result = "" + factor + units;
			}
			
			return result;
		}
		//------------------------------------------
		// Do calc on string with no parens
		function calcStrToStr(str) {
			return unitToStr(calcStrToUnit(str));
		}
		//------------------------------------------
		function calcFromNestedParenArr(nestedParenArr) {
			var i = nestedParenArr.length, item, resultStr;
			if (i === 1) { 
				// If the array contains a single string, we want replace it with the result (string)
				return calcStrToStr(nestedParenArr[0]);
			} else {
				// Otherwise we need to make sure everything in this array is a string, join those strings together, and calculate that (string) result. 
				while(i--) {
					item = nestedParenArr[i];
					if (typeof item !== "string") {
						nestedParenArr[i] = calcFromNestedParenArr(item);
					}
				}
				return calcStrToStr(nestedParenArr.join(""));
			}
		}
		//------------------------------------------
		function calcFromNestedParenStr(nestedParenStr) {
			return calcFromNestedParenArr(parenToArr(nestedParenStr));
		}
		//------------------------------------------
		
		return calcFromNestedParenStr;
	}());
	
	var calcWithUnitConversion = (function () {
		//------------------------------------------
		function unitConvert(str, unitStr) {
			var strResult = calcFromNestedParenStr(str);
			console.debug("unitConvert main expr > ", strResult, unitStr);
			if (unitStr) {
				var unitObj = calcStrToUnit(strResult);
				var newUnit = calcStrToUnit(unitStr);
				// console.debug(">>>>>>>>>>>>>>>>", unitObj, newUnit);
				if (dimsMatch(unitObj, newUnit)) {
					strResult =  "" + unitObj.factor/newUnit.factor + " " + unitStr; 
				} else {
					throw incompatibleDimError;
				}
			} 
			console.debug("[ UNIT CONFOVER RESULT &&&& ", strResult);
			return strResult;
		};	
		//------------------------------------------
		function calcWithUnitConversion(str) {
			if (/[,]/.test(str)) {
				throw new Error("Can't handle commas yet...");
			}
			console.time("calcWithUnitConversion");
			// TODO: handle "in a", "per" **NOTE: per is took tricky...
			// Split on "in" or "to" or "into"
			var resultStr, resultUnitObj, splitArr, numberPart, abs, unitPart, splitStrArr,  
				precision 	= 13, 
				smallest 	= 1e-4;
			
			splitStrArr = str.replace(/^(\s*[a-zA-Z].*)\s+in\s+a[n]?\s+([a-zA-Z].*)$/, "$2 to $1"); // Handle "in a" and "per". TODO: What if we have multiple "per"'s?
			// "in" means same as "to" or "into" under conditions like these:
			// 3'2" in in
			// 3' in in
			// (xxx) in in ft
			// "10 m in ft"
			// "10 m^3 in ft^3"
			// "(xxx) in ft"
			
			splitStrArr = splitStrArr.replace(/(\)\s+in\s+|[a-zA-Z'"]\s+|[a-zA-Z]\^[-+]?[0-9]+\s+|\)\s+)(in)(\s+[a-zA-Z])/, "$1@@@$3");
			console.debug("splitStrArr !!!!!A!!!!!!!!! >>> ", splitStrArr);
			splitStrArr = splitStrArr.replace(/(\s+)(into|to)(\s+[a-zA-Z])/, "$1@@@$3");
			console.debug("splitStrArr !!!!B!!!!!!!!!! >>> ", splitStrArr);
			splitStrArr = splitStrArr.split(/\s+@@@\s+/);
			console.debug("splitStrArr !!!!!C!!!!!!!!! >>> ", splitStrArr);
			resultStr = unitConvert(splitStrArr[0], splitStrArr[1]);
			console.debug("resultStr  !!!!!D!!!!!!!!!>  ", resultStr);
			// Make stuff like 2.01 - 2 look good. **TODO: This code should be handled by what ever is creating the view. Need to move it out of here.
			// Split number part and other part 
			splitArr = resultStr.split(/(\s+.*)$/);	
			numberPart = +splitArr[0];
			numberPart = +(numberPart.toPrecision(precision));
			abs = Math.abs(numberPart);
			console.debug("nubmerbpart", abs, numberPart);
			if (abs !== 0 && (abs < smallest || abs >= Math.pow(10, precision))) {
				numberPart = numberPart.toExponential();
			}
			unitPart = splitArr[1] || "";	
			console.timeEnd("calcWithUnitConversion");
			return "" + numberPart + unitPart;
			//return resultStr;
		}
		
		//------------------------------------------
		return calcWithUnitConversion;	
	}());	

	global.unitsJsCalc = calcWithUnitConversion;
	
	// http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
	function escapeRegExp(str) {
		return str.replace(/[-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}	
	
	var numberRx 			= /(\d.\d+)/,
		notWordRx 			= /(^|[^\w]|$)/
		parsedRx 			= /([\w\[\]\,\.\-]+)/,
		numberOrParsedRx	= RegExp(numberRx.source + "|" + parsedRx.source);

	var surroundedTokenRx = {
		"infix": function (rx) {
			return RegExp(parsedRx.source + "\\s*(" + rx.source + ")\\s*" + parsedRx.source, "g");
		},
		"suffix": function (rx) {
			return RegExp("("+numberOrParsedRx.source+")+" + rx.source + "("+notWordRx.source+")+", "g");
		},
		"prefix": function (rx) {
			return RegExp(notWordRx.source + "\\s*(" +rx.source + ")\\s*" + parsedRx.source, "g");
		}
	}
	var replaceToken = {
		"infix": function (lh, tokenName, rh) {
			return "["+tokenName+","+lh+","+rh+"]";
		},
		"suffix": function (lh, tokenName, rh) {
			return "["+tokenName+","+lh+"]"+rh;
		},
		"prefix": function (lh, tokenName, rh) {
			return lh+"["+tokenName+","+rh+"]";
		},
		"nofix": function (lh, tokenName, rh) {
			return lh+"["+tokenName+"]"+rh;
		}
	}
	var tokenObjArr = [
		// Mixed numbers get hightst priority
		{token:"&", name:"Divide", rx:/&/, type:"infix"},
		{token:"#", name:"Plus", rx:/#/, type:"infix"},
		// Space after function name 
		{token:" ", name:"Identity", rx:/\s/, type:"prefix"},
		// Units/constant power
		{token:"\\", name:"Power", rx:/\\/, type:"infix"},
		// Functions
		{token:"sin", name:"Sin", aliasRx:/sin(e|)/, type:"prefix"},
		{token:"cos", name:"Cos", aliasRx:/cos(ine|)/, type:"prefix"},
		{token:"tan", name:"Tan", aliasRx:/tan(ent|)/, type:"prefix"},
		{token:"asin", name:"Asin", aliasRx:/a(rc|)sin(e|)/, type:"prefix"},
		{token:"acos", name:"Acos", aliasRx:/a(rc|)cos(ine|)/, type:"prefix"},
		{token:"atan", name:"Atan", aliasRx:/a(rc|)tan(gent|)/, type:"prefix"},
		//{token:"csc", name:"Csc", aliasRx:/csc|cosec(ant|)/, type:"prefix"},
		//{token:"sec", name:"Sec", aliasRx:/sec(ant|)/, type:"prefix"},
		//{token:"cot", name:"Cot", aliasRx:/cot(an(gent|)|)/, type:"prefix"},
		//{token:"acsc", name:"Acsc", aliasRx:/a(rc|)(csc|cosec(ant|))/, type:"prefix"},
		//{token:"asec", name:"Asec", aliasRx:/a(rc|)sec(ant|)/, type:"prefix"},
		//{token:"acot", name:"Acot", aliasRx:/a(rc|)cot(an(gent|))/, type:"prefix"},
		{token:"exp", name:"Exp", aliasRx:/exp/, type:"prefix"},
		{token:"log", name:"Log", aliasRx:/log/, type:"prefix"},
		{token:"ln", name:"Ln", aliasRx:/ln/, type:"prefix"},
		{token:"sqrt", name:"Sqrt", aliasRx:/sqrt|root/, type:"prefix"},
		
		// Power // Need separate token for unit powers?
		{token:"^", name:"Power", rx:/\^/, type:"infix"},
		
		// Times, Divide, Plus for units 
		{token:"`", name:"Divide", rx:/`/, type:"infix"},
		{token:"|", name:"Times", rx:/\|/, type:"infix"},
		{token:"?", name:"Plus", rx:/\?/, type:"infix"},
		
		// Times, Divide
		{token:"/", name:"Divide", rx:/\//, type:"infix"},
		{token:"*", name:"Times", rx:/\*/, type:"infix"},
		// Plus, Minus
		{token:"~", name:"Minus", rx:/~/, type:"infix"},
		{token:"+", name:"Plus", rx:/\+/, type:"infix"}
	];
	
	var unitFuncMap = {
		Identity:	toUnit,
		Plus:		unitPlus,
		Minus:		unitMinus,
		Times:		unitTimes,
		Divide:		unitDiv,
		Power:		unitPow,
		Sqrt:		function (u) {return {dim:{}, factor:Math.sqrt(toUnit(u).factor)};},
		Sin:		function (u) {
						var x = Math.sin(toUnit(u).factor);
						return {dim:{}, factor: Math.abs(x) < 1e-15 ? 0 : x};
					},
		Cos:		function (u) {
						var x = Math.cos(toUnit(u).factor);
						return {dim:{}, factor: Math.abs(x) < 1e-15 ? 0 : x};
					},
		Tan:		function (u) {
						var x = Math.tan(toUnit(u).factor);
						return {dim:{}, factor: Math.abs(x) < 1e-15 ? 0 : x};
					},
		Asin:		function (u) {return {dim:{}, factor:Math.asin(toUnit(u).factor)};},
		Acos:		function (u) {return {dim:{}, factor:Math.acos(toUnit(u).factor)};},
		Atan:		function (u) {return {dim:{}, factor:Math.atan(toUnit(u).factor)};},
		Csc:		function (u) {return {dim:{}, factor:1/Math.sin(toUnit(u).factor)};},
		Sec:		function (u) {return {dim:{}, factor:1/Math.cos(toUnit(u).factor)};},
		Cot:		function (u) {return {dim:{}, factor:1/Math.tan(toUnit(u).factor)};},
		Acsc:		function (u) {return {dim:{}, factor:Math.asin(1/toUnit(u).factor)};},
		Asec:		function (u) {return {dim:{}, factor:Math.acos(1/toUnit(u).factor)};},
		Acot:		function (u) {return {dim:{}, factor:Math.atan(1/toUnit(u).factor)};},
		Exp:		function (u) {return {dim:{}, factor:Math.exp(toUnit(u).factor)};},
		Log:		function (u) {return {dim:{}, factor:Math.log(toUnit(u).factor)/Math.LN10};},
		Ln:			function (u) {return {dim:{}, factor:Math.log(toUnit(u).factor)};},		
	}	
//}());

