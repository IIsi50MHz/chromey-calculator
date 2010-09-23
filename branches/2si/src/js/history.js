/*
 * Drop-in input history script <http://legocode.googlecode.com/svn/trunk/javascript/history.js>
 * Copyright (c) 2010 MindstormsKid <mindstormskd@gmail.com>
 * Licensed under the MIT license <http://www.opensource.org/licenses/mit-license.php>
 *
 * Portable function that returns a psuedo-array with functions to add to and navigate through it.
 * Usage, assuming the value getter and setter is this.value:
 *     var h = History(max_history_length = 400);
 *     h.add(this.value); // add a value, usually when the user presses enter
 *     this.value = h.up(this.value) // go up, usually when the user presses the up arrow key
 *     this.value = h.down(this.value) // go down, usually when the user presses the down arrow key
 *     h.set(array_of_values) // replace all current items in the history with the ones in the array, with the first item in the array as the most recent
 */
function History(max) {
	var a = [];
	
	a.p = -1;
	a[-1] = "";
	a.max = max || 400;
	
	a.add = function(v){
		this.unshift(v);
		this.p = -1;
		this.length > this.max && this.pop();
	};
	a.up = function(cv){
		if (this.p === -1) {
			this[-1] = cv;
		}
		return this[this.p + 1] != null ? this[++this.p] : cv;
	};
	a.down = function(cv){
		return this[this.p - 1] != null ? this[--this.p] : cv;
	};
	a.set = function(a){
		this.length = 0;		
		this.push.apply(this, a);
	};
	
	return a;
}