/*
 * Copyright (c) 2010 Brent Weston Robinett <bwrobinett@gmail.com>
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */
(function () {
	var background = chrome.extension.getBackgroundPage();
	background.cCalc.init(window);	
	$(window).focus(function () {
		background.cCalc.init(window);	
	});
}());