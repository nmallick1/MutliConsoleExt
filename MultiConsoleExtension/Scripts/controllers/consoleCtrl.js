angular.module('MultiConsole', ['ngMaterial']).controller('consoleCtrl', function ($scope, $http) {

    $scope.showHideMessage = function (show, level, message) {
        if (show) {
            switch (level) {
                case "Error":
                    $("#checkMark").hide();
                    $("#progressCircular").hide();
                    $("#errorMark").show();
                    break;

                case "Success":                    
                    $("#errorMark").hide();
                    $("#progressCircular").hide();
                    $("#checkMark").show();
                    break;

                case "Progress":                    
                    $("#checkMark").hide();
                    $("#errorMark").hide();
                    $("#progressCircular").show();
                    break;

                default:
                    break;
            }
            $scope.message = message;
        }
        else {
            $("#errorMark").hide();
            $("#checkMark").hide();
            $("#progressCircular").hide();
            $scope.message = "";
        }
        if (!$scope.$$phase){
            $scope.$apply();
        }
    }

    $scope.getSiteConnectionSettings = function () {
        $http.get("/multiconsoleext/api/Settings").then(function (resp) {
            $scope.publishProfileUserName = resp.data.UserName;
            $scope.publishProfilePassword = resp.data.Password;
            authHeader = resp.data.AuthHeader;

            if (authHeader != "") {
                //Start detecting instances after a while, let Angular complete its binding process
                //Attempt to find instnaces only if the Auth settings are present, else the user should update username and password
                $scope.consecutiveKnownInstancesFound = 0;
                $scope.showHideMessage(true, "Progress", "Looking for Instances.. " + $scope.hostingInstances.length + " instance(s) identified");
                setTimeout($scope.callRemoteToGetInstanceDetailsAuto, 1500);
            }

        }, function (x) {
            $scope.showHideMessage(true, "Error", "There was an error while retrieving the site settings. Please upload the Publish Profile for this site.");
        });
    }

    $scope.init = function () {
        //$("#tabsContainer").hide(); //Section of the page where console windows will be opened
        $("#connectToSettings").hide(); // Drop down to display a list of all the instances that were identified

        $scope.showHideMessage(false, "", "");
        
        $("#btnRefresh").hide(); //Button to refresh list of instances


        $scope.hostingInstances = [];
        $scope.connectedInstances = [];
        $scope.selectedHostingInstance = [];

        $scope.consecutiveKnownInstancesFoundLimit = 10; //This is because the extension only supports up to 10 instances hosting the site for perf reasons
        $scope.consecutiveKnownInstancesFound = 0;


        $scope.publishProfileUserName = "";
        $scope.publishProfilePassword = "";

        $scope.getSiteConnectionSettings();
    }




    //--------------AUTO IDENTIFY INSTANCES

    $scope.updateInstancesAuto = function (instanceInfo) {
        var alreadyExists = false;
        for (var i = 0; i < $scope.hostingInstances.length; i++) {
            if ($scope.hostingInstances[i].InstanceId == instanceInfo.InstanceId) {
                alreadyExists = true;
                $scope.consecutiveKnownInstancesFound++;
                break;
            }
        }
        if (!alreadyExists) {
            $scope.consecutiveKnownInstancesFound = 0;
            $scope.hostingInstances.push(instanceInfo);
            $scope.message = "Looking for Instances.. " + $scope.hostingInstances.length + " instance(s) identified";
        }
    }


    $scope.callRemoteToGetInstanceDetailsAuto = function () {        
        $scope.showHideMessage(true, "Progress", "Looking for Instances.. " + $scope.hostingInstances.length + " instance(s) identified");

        if ($scope.consecutiveKnownInstancesFound < $scope.consecutiveKnownInstancesFoundLimit) {            
            $("#btnRefresh").hide();

            $scope.showHideMessage(true, "Progress", "Looking for Instances.. " + $scope.hostingInstances.length + " instance(s) identified");
            
            for (var i = 0; i <= $scope.consecutiveKnownInstancesFoundLimit; i++) {
                callLocalWebAPI("hostname", "", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa").done(function (resp) {
                    $scope.updateInstancesAuto({ MachineName: resp.Output.replace("\r\n", ""), InstanceId: resp.ARRAffinity, DisplayName: resp.Output.replace("\r\n", "") + " (" + resp.ARRAffinity.substring(0, 4) + ")" });
                    $scope.$apply();
                });
            }
            if ($scope.consecutiveKnownInstancesFound >= $scope.consecutiveKnownInstancesFoundLimit) {
                $("#connectToSettings").show();
                //Perform cleanup here, the next time this function will not be called
                //This is not guaranteed to execute only once though or even execute at all
                $scope.showHideMessage(true, "Success", "Max detection attempts reached. " + $scope.hostingInstances.length + " instance(s) identified");                                
            }
            //Keep repeating every X seconds unless we have reached the max supported number of instances 
            setTimeout($scope.callRemoteToGetInstanceDetailsAuto, 3000);
        }
        else {
            //Perform cleanup here, the next time this function will not be called
            //This is not guaranteed to execute only once
            $scope.showHideMessage(true, "Success", $scope.hostingInstances.length + " instance(s) identified");
            
            $("#btnRefresh").show();
            $("#connectToSettings").css("display", "flex");  //Have to set this to flex else it is moving the button on next line
        }
    }
    //--------------AUTO IDENTIFY INSTANCES

    $scope.refreshInstanceDetails = function () {
        if (authHeader != "") {
            $scope.hostingInstances = [];
            $scope.connectedInstances = [];
            $scope.selectedHostingInstance = [];
            $scope.consecutiveKnownInstancesFound = 0;
            $scope.showHideMessage(true, "Progress", "Looking for Instances.. " + $scope.hostingInstances.length + " instance(s) identified");
            $scope.callRemoteToGetInstanceDetailsAuto();
        }
        else {
            $scope.showHideMessage(true, "Error", "There was an error retrieving the saved connection info.");            
        }
    }


    $scope.checkUncheckAll = function () {
        if ($scope.selectedHostingInstance.length > 0)
            $scope.selectedHostingInstance = [];
        else
            $scope.selectedHostingInstance = $scope.hostingInstances;
    }


    $scope.initiateKuduConnection = function () {
        $("#tabsContainer").show();
        $scope.connectedInstances = [];

        for (var i = 0; i < $scope.selectedHostingInstance.length; i++) {
            //console.log($scope.selectedHostingInstance[i]);
            $scope.connectedInstances.push({
                MachineName: $scope.selectedHostingInstance[i].MachineName,
                InstanceId: $scope.selectedHostingInstance[i].InstanceId,
                DisplayName: $scope.selectedHostingInstance[i].DisplayName,
                cmdPromptContainerId: "cmdPromptContainer" + i,
                kuduExecConsoleId: "KuduExecConsoleTest" + i
            });
        }

        LoadConsole($scope.connectedInstances);
    }

    $scope.showUploadDialog = function () {
        $('#upldPublishProfile').click();
    }

    $scope.uploadPublishProfile = function (upldCtrl) {
        
        //console.log(upldCtrl.files[0]);
        if (upldCtrl.files.length > 0) {
            //Make sure that the file that is being uploaded in a PublishSettings file
            if (upldCtrl.files[0].name.split(".")[1] != "PublishSettings") {                
                $scope.showHideMessage(true, "Error", "Please upload the PublishSettings file.");
                return false;
            }
            
            $scope.showHideMessage(true, "Progress", "Uploading Publish Profile..");

            var file = upldCtrl.files[0];
            var data = new FormData();
            data.append('file', file);

            var uploadUrl = "/multiconsoleext/api/Settings";
            $http.post(uploadUrl, data, {
                withCredentials: true,
                headers: { 'Content-Type': undefined },
                transformRequest: angular.identity
            }).success(function (resp) {
                //Set the authHeader here as resp.AuthHeader
                authHeader = resp.AuthHeader;

                //Now that we have the AuthHeader, start looking for instances now...
                $scope.consecutiveKnownInstancesFound = 0;
                setTimeout($scope.callRemoteToGetInstanceDetailsAuto, 1500);
                
                $scope.showHideMessage(true, "Success", "Publish Profile sucessfully uploaded.");
                
            }).error(function () {
                //Clear the state of hte file upload control so as to allow the user a chance to upload again.                
                $scope.showHideMessage(true, "Error", "There was an error saving the Publish Profile.");
            });
        }
        return false;
    }


    $scope.init();


});