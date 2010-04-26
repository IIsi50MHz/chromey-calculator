//alert("hello!!!!")
document.addEventListener("keyup", function (e) {	
	var chromeyCalcId = "mgmpajefleiinfpfmpippabcgcjicpna";		
	if (e.altKey && e.keyCode === 67) {
		chrome.extension.sendRequest(chromeyCalcId, {openPopOut: "1"}, function (response) {
			// Do nothing...			
		});	
	}
}, false);