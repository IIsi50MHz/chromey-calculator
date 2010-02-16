(function(window, undefined){

/*** variables ***/
var $input = $("#input > input"), $output = $("#output");


/*** setup ***/
$input.focus(); // focus the input


/*** events ***/
$output.find(".output > a")
	.live("mouseenter", function(){
		$(this).stop().css("opacity", 1); // show the link (if any) to the result source
	})
	.live("mouseleave", function(){
		$(this).animate({ opacity: 0 }, 500); // hide the link
	});

$(window).bind("unload blur", function(){});

$input.keydown(function(e){
	var val = this.value.trim();
	
	if (e.which === 13 && val) { // enter
		if (val.toLowerCase() === "clear") { // clear the results
			Shell.clear();
		} else if (/@\w+\s*=\s*.+/.test(val)) { // we're setting a variable
			
		} else { // try calculating it
			calc(val);
		}
		
		Shell.hist.add(val); // add to the history
		this.value = ""; // clear the input
	} else if (e.which === 38) { // up arrow
		this.value = Shell.hist.up(val); // go up in the history
		
		setTimeout(function(){
			$input[0].selectionStart = $input[0].selectionEnd = $input.val().length; // set cursor position to end of input
		}, 0);
	} else if (e.which === 40) { // down arrow
		this.value = Shell.hist.down(val); // go down in the history
	}
});


/*** functions ***/
function calc(input, callback){
	Shell.io(input, input);
}

})(window);