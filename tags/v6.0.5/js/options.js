/*
 * Copyright (c) 2010, 2011 Brent Weston Robinett <bwrobinett@gmail.com>
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */ 
(function () {
	var background = chrome.extension.getBackgroundPage();	
	var cCalc = background.cCalc;
	var optionSel = "input";
	var $options = $(optionSel);
	function loadOptionValues() {		
		//console.debug("otpoins", $options.length, $this.attr("type"));
		$(optionSel).each(function() {
			var $this = $(this);
			//console.debug("otpoins", $options.length, this.id, $this.attr("type"));
			var val = JSON.parse(localStorage["opt_"+this.id] || "[]")[0];
			if (this.id == "height") {
				this.value = val || "";
			} else if ($this.attr("type") === "checkbox") {				
				$this.attr("checked", !!val);
			} else {
				this.value = val || "";
			}
		})
	}
	
	loadOptionValues();
	
	function updateOption() {		
		cCalc.calcCmd[this.id](this.value);
		return this;
	}
	$(document).delegate(optionSel, "keyup change blur", updateOption);
	$(document).delegate(".reset", "click", function () {		
		var $option = $(this).closest("tr").find("input");
		$option.val(cCalc.calcCmd.defaultOptions[$option[0].id]).focus();
		updateOption.call($option[0]);
	});	
}());

// DELETE THIS
// jsonToXml
// {"blah": "ding", "blah2": [1, false, "hey", {}, []]}
// <obj>
	// <prop name="blah">
		// <str>ding</str>
	// </prop>
	// <prop name="blah2">
		// <arr>
			// <num>1</num>
			// <bool>false</bool>
			// <str>hey</str>
			// <obj></obj>
			// <arr></arr>
		// </arr>
	// </prop>
// </obj>

var BwrConv = (function () {
	var toXml = {
		'object': objToXml,
		'array': arrToXml,		
		'string': strToXml,
		'number': numToXml,
		'boolean': boolToXml,
		'null': nullToXml
	};	
	function getType(val) {
		var valType = typeof val;
		if (valType == "object") {
			if (val.length != null) {
				valType = "array";
			} else if (val === null) {
				valType = "null";
			}
		}
		return valType;
	}
	
	//-------------------------------------------------
	
	function objToXml(obj) {	
		var xml = ['<obj>'];
		var val;		
		for (key in obj) {
			val = obj[key];					
			xml.push('<prop name="'+key+'">');				
			xml = xml.concat(toXml[getType(val)](val))			
			xml.push('</prop>');
		}
		xml.push("</obj>");
		console.debug("xml", xml);
		return xml;
		
	}
	function arrToXml(arr) {	
		var xml = ['<arr>'];
		var val;		
		var arrLen = arr.length;
		var i;
		for (i = 0; i < arrLen; i++) {
			val = arr[i];			
			xml = xml.concat(toXml[getType(val)](val));
		}
		xml.push('</arr>');
		return xml;
	}
	function strToXml(str) {	
		return ['<str>'+str+'</str>'];		
	}
	function numToXml(num) {	
		return ['<num>'+num+'</num>'];		
	}
	function boolToXml(bool) {	
		return ['<bool>'+bool+'</bool>'];		
	}
	function nullToXml() {	
		return ['<null/>'];		
	}	
	
	//-------------------------------------------------
	
	function parseJSON(json) {
		return JSON.parse(json);
	}
	function jsonToXml(json) {
		var val = parseJSON(json);
		return toXml[getType(val)](val).join('');
	}
	function valToXml(val) {
		console.debug("xxx", getType(val), toXml[getType(val)],  toXml[getType(val)](val))
		return toXml[getType(val)](val).join('');
	}
	
	//-------------------------------------------------
	
	return {
		jsonToXml: jsonToXml,
		valToXml: valToXml
	};
}());