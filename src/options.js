/*
 * Copyright (c) 2010 Brent Weston Robinett <bwrobinett@gmail.com>
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */ 
(function () {
	var background = chrome.extension.getBackgroundPage();	
	var cCalc = background.cCalc;
	var optionSel = "input[type=text]";
	var $options = $(optionSel);
	function loadOptionValues() {
		console.debug("otpoins", $options.length);
		$(optionSel).each(function() {
			var val = JSON.parse(localStorage["opt_"+this.id] || "[]")[0];
			if (this.id !== "height") {
				this.value = val || "";
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
		var $option = $(this).closest("tr").find("input").val("").focus();
		updateOption.call($option[0]);
	});	
}());