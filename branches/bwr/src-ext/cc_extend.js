//alert("hello!!!!")
document.addEventListener("keyup", function (e) {	
	var chromeyCalcId = "ddemjgejmgakdkemjilldlljelclimcd";	
	if (e.altKey && e.keyCode === 67) {
		chrome.extension.sendRequest(chromeyCalcId, {openPopOut: "--" + (e.altKey && e.keyCode === 67) + e.keyCode + e.altKey}, function (response) {
			// Do nothing...			
		});	
	}	
}, false);