calc.test = function(){
	var tests = [
		{ i: "1 + 1", r: "2" },
		{ i: "1 googol * 1 googol", r: "1.0 * 10^200" },
		{ i: "1\" in '", r: "0.08333 feet" },
		{ i: "Vars", r: "electric reactive power" }
	], num = tests.length, failed = 0, cur;
	
	function run(result) {
		if (result && result !== cur.r) {
			Shell.raw('Test ' + (num - tests.length) + ' failed! Result was "' + result + '", should have been "' + cur.r + '".', "error", true);
			failed++;
		}
		
		cur = tests.shift();
		if (cur) {
			Shell.info('Running test ' + (num - tests.length) + ' of ' + num + ', "' + cur.i + '"...');
			calc(cur.i, run);
		} else {
			Shell.info('Ran ' + num + ' tests, ' + failed + ' of which failed.');
		}
	}
	
	Shell.info('Starting tests, there are ' + num + ' to run...');
	run();
};