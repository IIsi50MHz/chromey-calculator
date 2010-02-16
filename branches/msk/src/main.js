(function(window, undefined){

/*** variables ***/
var $input = $("#input > input"), $output = $("#output");


/*** setup ***/
$input.focus(); // focus the input


/*** events ***/
$output.find(".output > a")
	.live("mouseenter", function(){ $(this).stop().css("opacity", 1); }) // show the link (if any) to the result source
	.live("mouseleave", function(){ $(this).animate({ opacity: 0 }, 500); }); // hide the link

$(window).bind("unload blur", function(){});

// refocus the input no matter what is clicked
$(document).click(function(){ $input.focus(); })
$("#output").scroll(function(){ $input.focus(); });

$input.keydown(function(e){
	var val = this.value.trim();
	
	if (e.which === 13 && val) { // enter
		if (val.toLowerCase() === "clear") { // clear the results
			Shell.clear();
		} else if (/@\w+\s*=\s*.+/.test(val)) { // we're setting a variable
			
		} else { // try calculating it
			calc(val, function(){
				// limit number of results
				var $results = $output.children();
				$results.length > 400 && $results.slice(0, $results.length - 400).remove();
				
				$results.eq(-1).find("a").css("opacity", 1).animate({ opacity: 0 }, 1500); // momentarily show the source
			});
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
}).blur(function(){ // save caret position so we can insert/replace text at it
	$input.data("selection", { start: this.selectionStart, end: this.selectionEnd });
});

$output.find(".input, .output").live("click", function(e){
	var $this = $(this), result = $.makeArray($this.contents()).pop().nodeValue.replace(/\s=$/, "");
	
	if (e.ctrlKey || e.metaKey) {
		Copy(result);
		$this.css("opacity", 0).animate({ opacity: 1 }, 700);
	} else {
		var cval = $input.val(), sel = $input.data("selection"),
			head = cval.substring(0, sel.start), tail = cval.substring(sel.end);
		
		sel.start = sel.end = sel.start + result.length;
		$input.val(head + result + tail);
		
		$input.focus();
		
		$input[0].selectionStart = $input[0].selectionEnd = sel.start;
	}
});


/*** functions ***/
function calc(input, cb){
	Shell.io(input, input, ["G", input]);
	cb();
}

function Copy(v) {
	var txt = $("<textarea/>").val(v).css({ position: "absolute", left: "-100%" }).appendTo("body");
	txt[0].select();
	document.execCommand("Copy");
	txt.remove();
}

})(window);