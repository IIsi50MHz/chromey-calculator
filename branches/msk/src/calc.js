var Vars = {
	list: {},
	add: function(name, value, cb){
		calc(value, function(result, source){
			Vars.list[name] = {
				value: result,
				original: value,
				source: source
			};
			
			cb && cb(result, source);
		});
	},
	replace: function(txt){
		return txt.replace(/@(?!\w)/g, "(" + calc.ans + ")").replace(/@(\w+)/g, function(m, n){ return "(" + ((Vars.list[n] || {}).value) + ")"; });
	}
};

function calc(input, cb) {
	var replaced = false, original = input, dym = false;
	
	input = Vars.replace(input); // replace variables
	if (original !== input) { replaced = true; }
	
	input = input.replace(/(\d)\s+(\d)/g, "$1*$2"); // replace spaces between numbers with a *
	
	original = input;
	
	// add a * between parentheses, and add an = at the end of expressions that end with a number, or a number follow by a ), then query google
	var source = "http://www.google.com/search?q=" + encodeURIComponent(input.replace(/\(\s*\(/g, ")*(").replace(/(.*\d\s*\)*\s*)$/g, "$1="));
	$.get(source, function(doc){
		var $doc = $(doc), $r = $doc.find("#res > .std img[src*=calc_img]").parent().siblings("td:eq(1)").find("h2");
		
		if ($r.length) {
			$r.find("sup").prepend("^");
			var result = $r.text().replace(/.+=\s(.+)/, "$1").replace(/(\d)\s+(\d)/g, "$1,$2").replace(/\u00D7/g, "*");
			
			calc.ans = result;
			cb(result, ["G", source], replaced ? input.replace(/\s*=$/, "") : "");
		} else {
			if (dym === false && (dym = $doc.find("#res a.spell:eq(0)").text().trim())) {
				replaced = true;
				input = dym.replace(/(\d)\s+(\d)/g, "$1$2");
				$.get(source = "http://www.google.com/search?q=" + encodeURIComponent(input), arguments.callee);
			} else {
				input = original;
				if (!/^\(*\d*\)*$/.test(input)) {
					source = "http://www.wolframalpha.com/input/?i=" + encodeURIComponent(original);
					$.get(source, function(doc){
						var $doc = $(doc), results = $doc.filter("script:last").html().match(/context.jsonArray.popups.+?\s=\s\{(?:.|\s)+?\};/g) || [], result = "";
						
						dym = $doc.find("#warnings").text().match(/Interpreting\s"(.+?)"\sas\s"(.+?)"/);
						if (dym) {
							input = input.replace(dym[1], dym[2]);
							replaced = true;
						}
						
						results.forEach(function(v, i){
							results[i] = JSON.parse(v.trim().replace(/^.+?(\{(?:.|\s)+\});$/, "$1")).stringified;
						});
						
						var r0 = results[0];
						if (r0 && (r0 = r0.replace(/[^=]+=?/, "")) && !/^solve/i.test(input)) {
							result = r0
								.replace("+", " + ")
								.replace("-", " - ")
								.replace(/^\s-\s/, "-")
								.replace(/\(\s-\s/, "(-");
						} else if (results[1]) {
							result = results[1];
						}
						
						input = input.replace(/\s*=$/, "");
						
						calc.ans = result || input;
						cb(result || input, result ? ["W", source] : null, replaced ? input : "");
					});
				} else {
					cb(input, null);
				}
			}
		}
	});
}
calc.ans = "";