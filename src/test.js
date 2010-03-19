calc.test = function(){
	var tests = [
		{ i: "1 + 1", r: "2" },
		{ i: "1 googol * 1 googol", r: "1.0 * 10^200" },
		{ i: "2010 in roman", r: "MMX" },
		{ i: "1/0", r: "Infinity" }
	], num = tests.length, failed = 0, cur;
	
	function run(result) {
		if (result) {
			cur.e.append(" Done!");
			
			if (result !== cur.r) {
				Shell.raw('Test ' + (num - tests.length) + ' failed! Result was "' + result + '", should have been "' + cur.r + '".', "error", true);
				failed++;
			}
		}
		
		cur = tests.shift();
		if (cur) {
			cur.e = Shell.raw('Running test ' + (num - tests.length) + ' of ' + num + ', "' + cur.i + '"...', "", true);
			try {
				calc(cur.i, run);
			} catch (e) {
				Shell.raw('Test' + (num - tests.length) + ' generated an exception, "' + e + '"! :(', "error", true);
			}
		} else {
			Shell.info('Ran ' + num + ' tests, ' + failed + ' of which failed.');
		}
	}
	
	Shell.info('Starting tests, there are ' + num + ' to run...');
	run();
};