// open popout when asked
chrome.extension.onRequestExternal.addListener(function(request, sender, sendResponse) {			
	var qkOn = JSON.parse(localStorage.opt_quickKeyOn)[0];
	console.debug("qkon", qkOn);
	if (request.helperIsInstalled === "yep") {
		console.debug("YEP-----------------")
		background.helperIsInstalled = true;
	} else if (request.helperIsInstalled === "nope") {
		console.debug("NOPE-----------------")
		background.helperIsInstalled = false;
	} else if (request.openPopOut && qkOn) {		
		console.debug("hwlo", cCalc.popOutCalc)
		cCalc.popOutCalc();
	}
	sendResponse({});
});