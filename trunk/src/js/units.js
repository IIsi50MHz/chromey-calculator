var global = this;
//(function () {
	function each(callback, thisArg) {
		var len = this.length;
		for (i = 0; i < len; i++) {
			callback.call(thisArg, this[i], i, this);
		}
	}
	// All units are converted to these when doing calculations
	var DIM = ["L", "T", "M"];
	var DEFAULT_DISPLAY_UNITS = {
		"L1": "m",
		"T1": "s",
		"M1": "kg",
		"L1T-1": "m/s",
		"L2": "m^2",
		"L3": "m^3"
	};
	//
	var incompatibleDimError = new Error("Uh oh, incompatible dimensions.");
	// Conversion factors for all units 
	var cupFactor = 0.000236588237;
	var poundFactor = 0.45359237;
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
		//"xxx":{dim:{L:1}, factor:1, alias:["xxx", "xxx"]},
		"acre":{dim:{L:2}, factor:Math.pow(1609.344,2)/640, alias:["acre", "acres"]},
		
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
		"Farenheight":{dim:{TEMP:1}, factor:function () {}, alias:["Farenheight", "farenheight", "F"]},
		"Celsius":{dim:{TEMP:1}, factor:function () {}, alias:["Celsius", "celsius", "Centigrade", "centigrade", "C"]},
		"Kelvin":{dim:{TEMP:1}, factor:function () {}, alias:["Kelvin", "kelvin", "K"]},
		
		// FUNCTIONS
		"sine": {dim:{}, alias:["sine", "sin"], f:function (x) {
			return Math.sin(toNum(x));
		}},
		
		// CONSTANTS
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
	var ONE = {dim:{}, factor:1}, NEGATIVE_ONE = {dim:{}, factor:-1}, ZERO = {dim:{}, factor:0};
	//------------------------------------------
	// Returns the unit object for a given key (e.g. "yards"); converts numbers to dimensionless unit objects.
	function toUnitObj(x) {
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
			result = toUnitObj(0);
		} else if (u2 == null) {
			result = toUnitObj(u1);
		} else {
			u1 = toUnitObj(u1);
			u2 = toUnitObj(u2);
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
			result = toUnitObj(0);
		} else if (u2 == null) {
			result = toUnitObj(u1);
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
			result = toUnitObj(1);
		} else if (u2 == null) {
			result = toUnitObj(u1);
		} else {
			u1 = toUnitObj(u1);
			u2 = toUnitObj(u2);
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
			result = toUnitObj(1);
		} else if (u2 == null) {
			result = toUnitObj(u1);			
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
			result = toUnitObj(1);
		} else if (p == null) {
			result = toUnitObj(u);
		} else {				
			// p should be dimensionless	
			p = toNum(p);
			if (p != null) {
				result = {dim:{}};
				u = toUnitObj(u);			
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
	//------------------------------------------
	// Apply operator to an array
	function applyOpToArr(op, arr) {
		if (op.inReverse) {
			arr.reverse();
		}
		var result, dimAreCompatible = true;
		result = unitTimes(1, arr[0]);
		for (var i = 1, len = arr.length; i < len && !result.incompatibleDim; i++) {
			result = op.inReverse ? op(arr[i], result) : op(result, arr[i]);			
		}		
		return result;
	}
	//------------------------------------------
	// Reformat str so it can be split into a special nested array, then do the split.
	function parseString(str) {
		//console.debug("// str\n", str);
		// normalize space
		str = str.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
		//console.debug("// normalize space\n", str);
		// handle "e" notation
		str = str.replace(/([0-9])[eE]([-]*[0-9])/g, "$1*10^$2");
		//console.debug('// handle "e" notation\n', str);
		// put a "|" betweeen numbers and units so we can make things like this work as expected: 10 ft / 5 ft = 2;
		str = str.replace(/([0-9])([a-zA-Z'"])/g, "$1|$2");
		str = str.replace(/([0-9a-zA-Z])\s+([a-zA-Z][^][-]?[0-9]|[a-zA-Z'"])/g, "$1|$2").replace(/([0-9a-zA-Z])\s+([a-zA-Z][^][-]?[0-9]|[a-zA-Z'"])/g, "$1|$2");
		//console.debug("// put a | betweeen numbers and units so we can make things like this work as expected: 10 ft / 5 ft = 2\n", str);
		// replace / before units with "`" so we can make things like this work as expected: 5 ft/sec / 5 in/sec = 12;
		str = str.replace(/([0-9a-zA-Z])\s*\/\s*([a-zA-Z])/g, "$1`$2").replace(/([0-9a-zA-Z])\s*\/\s*([a-zA-Z])/g, "$1`$2");
		//console.debug("replace / before units with ` so we can make things like this work as expected: 5 ft/sec / 5 in/sec = 12\n", str);
		// replace spaces with * unless adjacent to an operator or followed by a letter
		str = str.replace(/([^\+\-\*\/\^\'\"])\s([^\+\-\*\/\^])/g, "$1*$2");		
		//console.debug("// replace spaces with * unless adjacent to and operator\n", str);
		// remove all spaces around operators
		str = str.replace(/\s*([^\+\-\*\/\^])\s*/g, "$1");
		//console.debug("// remove all spaces around operators\n", str);
		// add plus sign ' or " and numbers		
		str = str.replace(/(["'])([0-9])/g, "$1+$2");
		// add times sign between letters an anything not a letter or operator
		str = str.replace(/([^a-zA-Z\+\-\*\/\^\|\`])([a-zA-Z])/g, "$1*$2");
		//console.debug("// add times sign between letters an anything not a letter or operator\n", str);
		str = str.replace(/([a-zA-Z])([^a-zA-Z\+\-\*\/\^\|\`])/g, "$1*$2");
		//console.debug("// add times sign between letters an anything not a letter or operator\n", str);				
		// replace minus operator with ~, but leave negative signs alone
		str = str.replace(/([^+\-\*\/\^\|\`])-/g, "$1~");
		//console.debug("// replace minus operator with ~, but leave negative signs alone\n", str);
		// surround operators with space
		//str = str.replace(/([\+\-\*\/\^\|\`])/g, " $1 ");
		////console.debug("// surround operators with space\n", str);
		// trim
		str = str.replace(/^\s+|\s+$/g, "");
		console.debug("// trim\n", str);
		// create an array from the string
		
		//console.debug(arrPlus);
		return splitToNestedArr([str], generateOrderedOpStrArray())[0];
	}		
	
	// We create an array with a bunch of levels so we can easily keep track of the order of operations.
	// Plus is at the lowest level; Power is at the highest.
	// ~ is used for minus so we can treat it differently than the negative sign
	// We have couple extra operators so we can bind all units following a number together.
	// ...This lets us interpret something like "10 m/s / 10 ft/s" as "(10 m/s) / (10 ft/s) " instead of "(10 / 10) m*ft/s^2"
	// TODO: handle mixed numbers (e.g. 1 3/4 cups)
	// TODO: handle this adjacent mixed units (e.g. 5 ft 11 in)
	// TODO: handle unit conversion of result so everything doesn't have to be in m,s,kg.
	// TODO: handle functions (tan, log, arcsin, etc.)
	// TODO: handle constants (pi, e, etc.)
	// TODO: handle parentheses
	//------------------------------------------
	function generateOrderedOpStrArray() {return ["+", "~", "*", "/", "|", "`", "^"];}
	//------------------------------------------
	function splitToNestedArr(arr, orderedOpStrArr) {
		orderedOpStrArr || (orderedOpStrArr = generateOrderedOpStrArray());		
		var opStr = orderedOpStrArr.shift();		
		if (opStr) {
			var i = arr.length;			
			while (i--) {					
				arr[i] = arr[i].split(opStr);				
				splitToNestedArr(arr[i], copyArr(orderedOpStrArr));				
			}					
		} 		
		return arr;
	}
	//------------------------------------------
	unitPow.inReverse = true;
	function generateOrderedOpArr() {
		return [unitPlus, unitMinus, unitTimes, unitDiv, unitTimes, unitDiv, unitPow];
	}
	//------------------------------------------	
	function copyArr(arr) {
		var i = arr.length, copy = [];
		while (i--) {copy[i] = arr[i];}
		return copy;
	}	
	//------------------------------------------
	function calcOpsFromFullArr(arr, orderedOpArr) {		
		var nextFunc = orderedOpArr.length > 1 ? calcOpsFromFullArr : toUnitObj,
			op = orderedOpArr.shift();		
		
		for (var i = 0, len = arr.length; i < len; i++) {
			arr[i] = nextFunc(arr[i], copyArr(orderedOpArr));
		}
		
		return applyOpToArr(op , arr);		
	}
	//------------------------------------------
	function calcUnitResult(str) {
		return calcOpsFromFullArr(parseString(str), generateOrderedOpArr());
	}	
	//------------------------------------------
	function unitConvert(str, unitStr) {
		var strResult = calcFromNestedParenStr(str);
		if (unitStr) {
			var unitObj = calcUnitResult(strResult);
			var toUnit = calcUnitResult(unitStr);
			if (dimsMatch(unitObj, toUnit)) {
				return "" + unitObj.factor/toUnit.factor + " " + unitStr; 
			} else {
				throw incompatibleDimError;
			}
		} else {
			return strResult;
		}
	};
	//------------------------------------------
	function unitObjToStr(unitObj) {
		var factor = unitObj.factor, 
			dim = unitObj.dim, dimExp,
			units = "",
			displayUnitsKey = "", displayUnits; 
		
		// Construct key so we can get the default display unit string (if it exists)
		each.call(DIM, function (key) {
			dimExp = dim[key];
			if (dimExp) {
				displayUnitsKey += key+dimExp;
			}
		});
		
		displayUnits = DEFAULT_DISPLAY_UNITS[displayUnitsKey];
		if (displayUnits) {
			factor = factor/calcUnitResult(displayUnits).factor;
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
	function calcStrResult(str) {
		return unitObjToStr(calcUnitResult(str));
	}
	//------------------------------------------
	function calcFromNestedParenArr(nestedParenArr) {
		var i = nestedParenArr.length, item, resultStr;
		if (i === 1) { 
			// If the array contains a single string, we want replace it with the result (string)
			return calcStrResult(nestedParenArr[0]);
		} else {
			// Otherwise we need to make sure everything in this array is a string, join those strings together, and calculate that (string) result. 
			while(i--) {
				item = nestedParenArr[i];
				if (typeof item !== "string") {
					nestedParenArr[i] = calcFromNestedParenArr(item);
				}
			}
			return calcStrResult(nestedParenArr.join(""));
		}
	}
	//------------------------------------------
	function calcFromNestedParenStr(nestedParenStr) {
		return calcFromNestedParenArr(parenToArr(nestedParenStr));
	}
	//------------------------------------------
	function calcWithUnitConversion(str) {
		// TODO: handle "in a", "per" **NOTE: per is took tricky...
		// Split on "in" or "to" or "into"
		var resultStr, resultUnitObj, splitArr, numberPart, unitPart, splitStrArr, precision = 13, smallest = 1e-4;
		
		splitStrArr = str.replace(/^(\s*[a-zA-Z].*)\s+in\s+a[n]?\s+([a-zA-Z].*)$/, "$2 in $1"); // Handle "in a" and "per". TODO: What if we have multiple "per"'s?
		splitStrArr = splitStrArr.replace(/(\s+)(into|in|to)(\s+[a-zA-Z])/, "$1@@@$3").split(/\s+@@@\s+/);
		resultStr = unitConvert(splitStrArr[0], splitStrArr[1]);
		// Split number part and other part
		splitArr = resultStr.split(/(\s+.*)$/);
		// Make stuff like 2.01 - 2 look good
		numberPart = +splitArr[0];
		numberPart = +(numberPart.toPrecision(precision));
		console.debug("numberPart", numberPart);
		if (Math.abs(numberPart) < smallest || Math.abs(numberPart) >= Math.pow(10, precision)) {
			numberPart = numberPart.toExponential();
		}
		unitPart = splitArr[1] || "";	
		
		return "" + numberPart + unitPart;
	}
	//------------------------------------------
	/*
		5*(10 m + 50 feet^2 / (4 in))^10 + 3
		["5*, ["10 m + 50 feet^2 / ", ["4 in"]], "^10 + 3"]
	*/
	// Take a string and convert a nested array that duplicates the form of nested parentheses in the string.
	// Should be able to then evaluate from inside out using calcUnitResult???
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
		
		return result;
	};
	global.unitsJsCalc = calcWithUnitConversion;
//}());

