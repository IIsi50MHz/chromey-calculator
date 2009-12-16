/*
 * Copyright (c) 2009 Brent Weston Robinett
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */
//
// $.dummy(selector, context) 
// 		Creates a dummy (empty) jQuery object with a selector and a selector and context **without traversing the DOM**.
// 		This is useful when calling live() or die().
//		Example:
//			// This goes trough the DOM and collects all the elements with class 'myButton', even though live() only uses the selector, not the collection.
//			$('.myButton').live('click', function () {alert('Hello!');});	
// 			
// 			// This is equivalent to the above code, but we get to skip the unnecessary DOM traversal.
//			$.dummy('.myButton').live('click', function () {alert('Hello!');});
//
(function ($) {		
	$.dummy = function (selector, context) {
		var dummy = $([]);
		dummy.selector = selector;
		context && (dummy.context = context);
		return dummy;
	};
})(jQuery);