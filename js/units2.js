/*
	
	NOTE: Looks I like stopped in the middle of rewriting of units.js (units2.js). There's probably some good stuff in here that can be used in a rewrite, but be carful. I think the "Quick dim objects" I'm using in here are a bad idea -- should not be sharing dim objects unless we make sure they can't be modifed. Probably simpler/better to not use them at all.

*/

var GLOBAL = this;

//(function (GLOBAL) {

var BASE_UNITS = {
	L: "m",
	T: "s",
	M: "kg"
};

//------------------------------------------------------------------------------
// Basic DimNum functions
//------------------------------------------------------------------------------

function toDimNum(x, unitStr) {
	// Just spit x back out if it's already a DimNum
	if (x.dim) {
		return x;
	} 
	
	// Create a new DimNum
	var unit;
	if (typeof x === "number") {
		if (!unitStr) {
			this.n = x;
			this.dim = UNIT.DIMLESS;			
		} else {
			unit = UNIT[unitStr];
			if (unit) {
				this.dim = unit.dim || UNIT.DIMLESS;
				this.n = x * unit.n;
			} else {
				throw Error('"' + unitStr + '" is not a supported unit.');
			}
		}	
	} if (x.dim) {
		return x;
	}
}

//------------------------------------------------------------------------------

function dimNumToString(d) {
	var unitStr = " ";
	
	if (!d.n) d = DimNum(d);	
	for (var key in d.dim) {
		unitStr += BASE_UNITS[key] + "^" + d.dim[key] + " ";
	}
	
	return "" + d.n + unitStr;
}

//------------------------------------------------------------------------------

function dimsMatch(d1, d2) {
	var key, dimsAreCompatible = true;
	
	d1 = DimNum(d1);
	d2 = DimNum(d2);
	for (key in BASE_UNITS) {
		if (d1.dim[key] !== d2.dim[key]) {
			var dimsAreCompatible = false;
			break;
		}
	}
	
	return dimsAreCompatible;
}

//------------------------------------------------------------------------------
// DimNum units
//------------------------------------------------------------------------------

var UNIT = (function () {
	// Quick dim objects
	var 
	// Basic dims
		DIMLESS = 	{},
		L = 		{L:1},
		T =			{T:1},
		M = 		{M:1},
	// Other dims
		AREA =		{L:2},
		VOLUME =	{L:3},
		SPEED = 	{L:1, T:-1}
		
	// Factors
	var poundFactor 	= 0.45359237,
		cupFactor 		= 0.000236588237
		
	// Define all units
	var unitDefs = { 	 
		// ANGLE
		"radian":		{dim:DIMLESS, n:1, alias:["radian", "radians", "rad", "rads"]},
		"degree":		{dim:DIMLESS, n:Math.PI/180, alias:["degree", "degrees", "deg", "degs"]},
		
		// LENGTH
		"meter":		{dim:L, n:1, alias:["meter", "meters", "metre", "metres", "m"]},	
		"centimeter":	{dim:L, n:0.01, alias:["centimeter", "centimeters", "centimetre", "centimetres", "cm"]},
		"milimeter":	{dim:L, n:0.001, alias:["milimeter", "milimeters", "milimetre", "milimetres", "mm"]},
		"micron":		{dim:L, n:1e-6, alias:["micron", "microns"]},
		"kilometer":	{dim:L, n:1000, alias:["kilometer", "kilometers", "kilometre", "kilometres", "km"]},
		"inch":			{dim:L, n:0.0254, alias:["inch", "inches", "in", '"', "''"]},
		"foot":			{dim:L, n:0.3048, alias:["foot", "feet", "ft", "'"]},
		"yard":			{dim:L, n:0.9144, alias:["yard", "yards", "yd", "yds"]},
		"mile":			{dim:L, n:1609.344, alias:["mile", "miles", "mi"]},
		"lightyear":	{dim:L, n:9.4605284e15, alias:["lightyear", "lightyears"]},
		"parsec":		{dim:L, n:3.08568025e16, alias:["parsec", "parsecs"]},
		
		// AREA
		//"xxx":{dim:{L:1}, n:1, alias:["xxx", "xxx"]},
		"acre":			{dim:AREA, n:Math.pow(1609.344,2)/640 , alias:["acre", "acres"]},
		
		// VOLUME
		"liter":		{dim:VOLUME, n:0.001, alias:["liter", "liters", "litre", "litres", "ltr"]},
		"mililiter":	{dim:VOLUME, n:1e-6, alias:["mililiter", "mililiters", "ml"]},
		"gallon":		{dim:VOLUME, n:cupFactor*16, alias:["gallon", "gallons", "gal", "gals"]},
		"quart":		{dim:VOLUME, n:cupFactor*4, alias:["quart", "quarts", "qt", "qts"]},
		"pint":			{dim:VOLUME, n:cupFactor*2, alias:["pint", "pints", "pt", "pts"]},
		"cup":			{dim:VOLUME, n:cupFactor, alias:["cup", "cups"]},
		"tablespoon":	{dim:VOLUME, n:cupFactor/16, alias:["tablespoon", "tablespoons", "tbsp", "tblsp"]},
		"teaspoon":		{dim:VOLUME, n:cupFactor/48, alias:["teaspoon", "teaspoons", "tsp"]},
		
		// TIME
		"microsecond":	{dim:T, n:1e-6, alias:["microsecond", "microseconds", "microsec", "microsecs"]},
		"milisecond":	{dim:T, n:1e-3, alias:["milisecond", "miliseconds", "milisec", "milisecs","ms"]},
		"second":		{dim:T, n:1, alias:["second", "seconds", "sec", "secs", "s"]},
		"minute":		{dim:T, n:60, alias:["minute", "minutes", "min", "mins"]},
		"hour":			{dim:T, n:3600, alias:["hour", "hours", "hr", "hrs", "h"]},
		"day":			{dim:T, n:3600*24, alias:["day", "days"]},
		"year":			{dim:T, n:3600*24*365.242199, alias:["year", "years", "yr", "yrs"]},
		"decade":		{dim:T, n:10*3600*24*365.242199, alias:["decade", "decades"]},
		"score":		{dim:T, n:20*3600*24*365.242199, alias:["score"]},
		"century":		{dim:T, n:100*3600*24*365.242199, alias:["century", "centuries"]},
		"millenium":	{dim:T, n:1000*3600*24*365.242199, alias:["millenium", "millenia"]},
		
		// MASS
		"kilogram":		{dim:M, n:1, alias:["kilogram", "kilograms", "kg"]},
		"gram":			{dim:M, n:1e-3, alias:["gram", "grams", "g"]},
		"miligram":		{dim:M, n:1e-6, alias:["miligram", "miligrams", "mg"]},
		"pound":		{dim:M, n:poundFactor, alias:["pound", "pounds", "lb", "lbs"]}, // not really mass
		"stone":		{dim:M, n:14*poundFactor, alias:["stone", "stones"]}, // not really mass?
		"ton":			{dim:M, n:2000*poundFactor, alias:["ton", "tons"]}, // not really mass
		
		// SPEED
		"mph":			{dim:SPEED, n:1609.344/3600, alias:["mph"]},
		"kph":			{dim:SPEED, n:1000/3600, alias:["kph"]},
		
		// TEMPERATURE (TODO: Figure out how to deal with these...)
		"Celsius": {
			dim:			{TEMP:1},
			func:			function (x) {return x + 273.15;}, 
			inverseFunc:	function (y) {return y - 273.15},
			alias:			["Farenheight", "farenheight", "F"]
		},	
		"Farenheight": {
			dim:			{TEMP:1}, 
			func:			function (x) {return (x - 32)*9/5 + 273.15;},
			inverseFunc:	function (y) {return (y - 273.15)*9/5 + 32;},			
			alias:			["Celsius", "celsius", "Centigrade", "centigrade", "C"]
		},
		"Kelvin":		{dim:{TEMP:1}, n:1, alias:["Kelvin", "kelvin", "K"]},
	}
	
	
	// generate unit map
	var key, unitMap = {};
	for (key in unitDefs) {
		var alias = unitDefs[key].alias, i = alias.length;
		while (i--) {
			unitMap[alias[i]] = unitMap[key];
		}
	}
	
	return unitMap;
}());

//------------------------------------------------------------------------------
// DimNum constants
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// DimNum operators
//------------------------------------------------------------------------------

(function () {
	
	//------------------------------------------------------------------------------
	
	function Plus(d1, d2) {
		if (!d1.dim) d1 = toDimNum(d1);
		if (!d2.dim) d2 = toDimNum(d2);
		
		var n, dim;
		
		if (d1.dimsMatch(d2)) {
			return {n:d1.n + d2.n, dim:d1.dim};		
		} else {
			throw Error(dimNumToString(d2) + " + " + dimNumToString(d2) + ": Dimensions are incompatible.");
		}
	}
	
	function arrPlus(arr) {
		return fold(Plus, arr);
	}
		
	//------------------------------------------------------------------------------	
	
	function Minus(d1, d2) {
		plus(d1, times(-1, d2));
	}
	
	function arrMinus(arr) {
		return fold(minus, arr);
	}
	
	//------------------------------------------------------------------------------	
	
	function Times(d1, d2) {
		if (!d1.dim) d1 = toDimNum(d1);
		if (!d2.dim) d2 = toDimNum(d2);
		
		var key, n, dim;
		
		for (key in BASE_UNITS) {
			// Add matching dimension powers				
			dim[key] = (d1.dim[key] || 0) + (d2.dim[key] || 0);				

			// Remove any 0 dimension
			if (!dim[key]) {
				delete dim[key];
			}	
		}
		
		// Multiply factors
		n = d1.n * d2.n;		
		return {dim:dim, n:n};
	}
	
	function arrTimes(arr) {
		return fold(times, arr);
	}
	
	//------------------------------------------------------------------------------
	
	function Divide(d1, d2) {
		return Times(d1, Power(d2, -1));
	}
	
	function arrDivide(arr) {
		return fold(Divide, arr);
	}
	
	//------------------------------------------------------------------------------
	
	function Power(d, p) {
		if (!d1.dim) d = toDimNum(d);
		if (!d2.dim) p = toDimNum(p);
		
		var key, n, dim;	
						
		// Make sure p is dimensionless	
		for (key in p) {
			throw Error(dimNumToString(d) + "^" + dimNumToString(p) + ": Power can't have dimensions.");
		}	
		
		// Caluclate result dimensions
		for (key in d.dim) {
			dim[key] = d.dim[key]*p
		}
			
		return {dim:dim, n:Math.pow(d.n, p.n)};
	}
	
	function arrPower(arr) {
		return foldRight(Power, arr);
	}
	
	//------------------------------------------------------------------------------
	
	function Func(funcName, arg) { // TODO: Remove this functions if we don't end up using it.
		return FUNC[funcName](arg);
	}
	
	function arrFunc(arr) {
		return FUNC[arr.shift()].apply(null, arr);
	}
	
	//------------------------------------------------------------------------------

});

//------------------------------------------------------------------------------
// NOTES
//------------------------------------------------------------------------------
//
// Preparing an input string... 
// 	5 sin 4 => 5*sin 4 (We want this)
// 	5 sin 4 => 5|sin*4 (Not this)
//
//-----------------------------------------------------------------------------
//
// Transforming an input string into an aray... (NOTE: for input with no parentheses)
// 1+3^2*5+sin 5-3/2
// 	[Plus, 1, 3^2*5, sin 5-3/2]
// 	[Plus, 1, 3^2*5, [Minus, sin 5, 3/2]]
// 	[Plus, 1, [Times, 3^2, 5], [Minus, sin 5, 3/2]]
// 	[Plus, 1, [Times, 3^2, 5], [Minus, sin 5, Divide[3, 2]]]
// 	[Plus, 1, [Times, 3^2, 5], [Minus, [Sin, 5], Divide[3, 2]]]
// 	[Plus, 1, [Times, [Power, 3, 2], 5], [Minus, [Func, sin, 5], [Divide, 3, 2]]]
//
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Functions for preparing input for calculation
//------------------------------------------------------------------------------

var ORDERD_OPS = ["+", "-", "*", "/", " ", "^"];
var OP_MAP = {
	"+": "Plus",
 	"-": "Minus",
	"*": "Times",
	"/": "Divide",
	" ": "Func",
	"^": "Power", 
}

//------------------------------------------------------------------------------

// Example <str>: 		"0+1*2*3+4+5^6"
// Example <op>: 		"+" 
// Example return: 		[Plus, ["0", "1*2*3", "4", "5^6"]]
function splitOnOp(str, op) {
	var splitStrArr = str.split(op);
	
	if (splitStrArr.length === 1) {
		// If there was no split, just return the string unchanged
		return str;
	} else {
		// If there was a split return an array with a function at [0] and the split string array at [1]
		return [OP_MAP[op], str.split(op)];
	}
}

//------------------------------------------------------------------------------

// Example <strArr>: 	["1+3^2*5+sin 5-3/2"] (Should be a single prepared string wrapped in an array) 
// Example <opsArr>: 	Don't pass anything. Used for recursive calls. (Defaults to ORDERD_OPS array.) 
// Example return: 		[Plus, "1", [Times, [Power, "3", "2"], "5"], [Minus, [Func, "sin", "5"], [Divide, "3", "2"]]]
function splitToNestedOpArr(strArr, opsArr) {
	opsArr || (opsArr = ORDERD_OPS.slice(0));
	var op = opsArr.shift();
	
	for (var i = 0, len = strArr.length; i < len; i++) {
		strArr[i] = splitOnOp(strArr[i], op);
		if (opsArr.length) {
			// We need to be sure we pass an array
			if (typeof strArr[i]  === "string") {
				strArr[i] = splitToNestedOpArr([strArr[i]], opsArr.slice(0))[0];
			} else {
				strArr[i][1] = splitToNestedOpArr(strArr[i][1], opsArr.slice(0));
			}
		}
	}
	
	return strArr;
}

//------------------------------------------------------------------------------

// Convert a string with nested parentheses to a similarly nested array. TODO: Think about rewriting this using RegExp.exec(). Might be simpler.
// Example <str>: 		"5*(10 m + 50 feet^2 / (4 in))^10 + 3"
// Example return: 		["5*, ["10 m + 50 feet^2 / ", ["4 in"]], "^10 + 3"]
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

//------------------------------------------------------------------------------
// Functions for doing calculations
//------------------------------------------------------------------------------

// Example <arr>: [Times, ["1", "2", "3"]]
// Example return: {dim:{}, n:6}
function calcSingleOp(arr) {
	var op = arr[0], args = arr[1];
	return op(args)
};

//------------------------------------------------------------------------------

// Example <arr>: [Plus, "6", [Times, ["1", "2", "3"]]]
// Example return: {dim:{}, n:36} 
function calcMultiOp(arr) {
	op = arr[0], args = arr[1];
	for (var i = 0, len = args.length; i < len; i++) {
		if (args[i] instanceof Array) {
			args[i] = calcMultiOp(args[i]);
		}
		args[i] = calcSingleOp(args[i]);
	}
	return arr;
}

//------------------------------------------------------------------------------
// Utility functions
//------------------------------------------------------------------------------

// fold(f, [1,2,3,4]) => f(f(f(1,2),3),4)
function fold(f, arr) {
	arr = arr.reverse();
	
	while (arr.length > 1) {
		arr.push(f(arr.pop(), arr.pop()));
	}
	
	return arr[0];
}

//------------------------------------------------------------------------------

// foldRight(f, [1,2,3,4]) => f(1,f(2,f(3,4)))
function foldRight(f, arr) {  
	var lhArg, rhArg; 
	
	arr = arr.slice(0);
	
	while (arr.length > 1) {
		rhArg = arr.pop();
		lhArg = arr.pop();
		arr.push(f(rhArg, lhArg));
	}
	
	return arr[0];
}

//}(this));