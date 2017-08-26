(function($){
	var isWebkit = !!~navigator.userAgent.indexOf(' AppleWebKit/');

	$.fn.kuduConnector= function(config){
		var currInstance = $(this);
		
		//Check for URL parameter
		if(config && config.URL)
		{
			currInstance.URL = config.URL;
		}
		else{			
			console.log("URL not passed in the config");
			console.error("URL not passed in the config");
			currInstance.URL = "/";
		}
		
		//Check for ARRId parameter
		if(config && config.ARRId)
		{
			currInstance.ARRId = config.ARRId;
		}
		else{			
			console.log("ARRId not passed in the config");
			console.error("ARRId not passed in the config");
			currInstance.ARRId = "XXXXXXXXX";
		}
		
		//Check for onError Callback parameter
		if(config && config.onError)
		{
			if (typeof config.onError == 'function') {
			currInstance.onError = config.onError;
			}
			else
			{
				currInstance.onError = function(error){
					console.log("Error :" + error);
				};
			}
		}
		else{			
			console.log("onError not passed in the config");
			console.error("onError not passed in the config");
			currInstance.onError = function(error){
					console.log("Error :" + error);
				};
		}
		
		// Check for onReceived Callback parameter
		if(config && config.onReceived)
		{
			if (typeof config.onReceived == 'function') {
			currInstance.onReceived = config.onReceived;
			}
			else
			{
				currInstance.onReceived = function(data){
					console.log("Got " + data + " back from executing command");
					};
			}
		}
		else{			
			console.log("onReceived not passed in the config");
			console.error("onReceived not passed in the config");
			currInstance.onReceived = function(data){
					console.log("Got " + data + " back from executing command");
					};
		}
		
		
		
		
		currInstance.start = function() {
				console.log("Connection to " + currInstance.URL + " started...");
				}
		
		currInstance.send = function(cmd){
			console.log("Command :" + cmd + " sent to " + currInstance.URL);
			var simulateconnErr = 0;
			if(simulateconnErr){
				var sampleErr = "";
				var error = sampleErr;
				currInstance.onError(error);
			}
			else{
				
				var sampleResponse ="";
				var simulateFailedCommandExecution = 0;				
				if(simulateFailedCommandExecution){
					sampleResponse = {"Error":"There was an error trying to execute your command\n"};
				}
				else {
					sampleResponse = {"Output":"Command executed sucecssfully\n"};
				}
				var data = sampleResponse ;
				currInstance.onReceived(data);
			}			
		}
		
		
		return currInstance;
		
		
	}
})(jQuery);