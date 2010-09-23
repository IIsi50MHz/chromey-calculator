/*
 * Copyright (c) 2010 Brent Weston Robinett
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */

// Shortcut key for Chromey Calculator popout
document.addEventListener("keyup", function (e) {	
	//var chromeyCalcId = "mgmpajefleiinfpfmpippabcgcjicpna"; // dev
	var chromeyCalcId = "acgimceffoceigocablmjdpebeodphgc"; // release	
	if (e.altKey && e.keyCode === 67) {
		chrome.extension.sendRequest(chromeyCalcId, {openPopOut: "1"}, function (response) {
			// Do nothing...			
		});	
	}
}, false);