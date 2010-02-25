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

$input.keydown(function(e){ // handle enter and up/down keypresses
	var val = this.value.trim(), m;
	
	if (e.which === 13 && val) { // enter
		if (val.toLowerCase() === "clear") { // clear the results
			Shell.clear();
		} else if (m = val.match(/^@(\w+)\s*=\s*(.+)/)) { // we're setting a variable
		
		} else if (m = val.match(/^@(\w+)\s*=?$/)) { // we're getting a variable
			
		} else { // try calculating it
			val = val.replace(/\s*=$/, ""); // remove trailing =
			calc(val, function(result, source, replace){
				// add the result
				Shell.io(val + " =", result, source, replace && replace + " =");
				
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

$output.find(".input, .output").live("click", function(e){ // handle clicking on inputs and results
	var $this = $(this), result = $this.contents().last().text().trim().replace(/\s*=$/, "");
	
	if (e.ctrlKey || e.metaKey) { // handle ctrl and command-clicking
		Copy(result); // copy the result to the clipboard
		$this.css("opacity", 0.001).animate({ opacity: 1 }, 700);
	} else { // insert result into the input (replacing any selection with it)
		var cval = $input.val(), sel = $input.data("selection"),
			head = cval.substring(0, sel.start), tail = cval.substring(sel.end);
		
		sel.start = sel.end = sel.start + result.length;
		$input.val(head + result + tail);
		
		$input.focus();
		
		$input[0].selectionStart = $input[0].selectionEnd = sel.start; // put cursor at the end of the inserted result
	}
});


/*** functions ***/
function calc(input, cb) {
	var replaced = false, original = input;
	
	input = vars.replace(input); // replace variables
	if (original !== input) { replaced = true; }
	
	input = clean(input); // cleanup the input
	
	var source = "http://www.google.com/search?q=" + encodeURIComponent(input);
	
	$.get(source, function($doc){
		$doc = $($doc);
		
		var $r = $doc.find("#res > .std img[src*=calc_img]").parent().siblings("td:eq(1)").find("h2");
		if ($r.length) {
			$r.find("sup").prepend("^");
			var result = $r.text().replace(/.+=\s(.+)/, "$1").replace(/(\d)\s+(\d)/g, "$1,$2").replace(/\u00D7/g, "*");
			
			cb(result, ["G", source], replaced ? input : "");
		} else {
			var dym = clean($doc.find("#res a.spell:eq(0)").text().trim().replace(/(\d)\s+(\d)/g, "$1,$2").replace(/\s*=$/, ""));
			if (dym) {
				replaced = true; input = dym;
				$.get(source = "http://www.google.com/search?q=" + encodeURIComponent(input), arguments.callee);
			}
		}
	});
	
	function clean(txt) {
		return txt
			.replace(/(\d)\s+(\d)/g, "$1*$2") // replace spaces between numbers with a *
			.replace(/\(\s*\(/g, ")*(") // add * between parentheses
			.replace(/(.*\d\s*\)*\s*)$/g, "$1="); // add an = at the end of expressions that end with a number, or a number follow by a )
	}
}
calc.ans = "";

function Copy(v) { // copies text to the clipboard
	var txt = $("<textarea/>").val(v).css({ position: "absolute", left: "-100%" }).appendTo("body");
	txt[0].select();
	document.execCommand("Copy");
	txt.remove();
}


/*** other ***/
var vars = {
	list: {},
	replace: function(txt){
		return txt.replace(/@(?!\w)/g, "(" + calc.ans + ")").replace(/@(\w+)/g, function(m, n){ return "(" + vars.list[n] + ")"; });
	}
};

})(window);