var Shell = {
	/* Drop-in input history script <http://legocode.googlecode.com/svn/trunk/javascript/history.js>
	 * Copyright (c) 2010 MindstormsKid. Licensed under the MIT license */
	hist: (function(max){
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
	})(),
	
	raw: function(val, classes, esc){
		$("#output").append($("<div/>").addClass(classes)[esc ? "text" : "html"](val)).scrollTop(1e6);
	},
	io: function(input, output, replace){
		replace && Shell.raw(replace + " =", "input replace", true);
		Shell.raw(input + " =", "input", true);
		Shell.raw(output, "output", true);
	},
	clear: function(){
		$("#output").empty();
	}
};