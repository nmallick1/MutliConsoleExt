    angular.module('MultiConsole', ['ngMaterial']).controller('consoleCtrl', function ($scope, $http) {


    $scope.getSiteConnectionSettings = function () {
        $http.get("/multiconsoleext/api/Settings").then(function (resp) {
            $scope.publishProfileUserName = resp.data.UserName;
            $scope.publishProfilePassword = resp.data.Password;
            authHeader = resp.data.AuthHeader;

            if (authHeader != "") {
                //Start detecting instances after a while, let Angular complete its binding process
                //Attempt to find instnaces only if the Auth settings are present, else the user should update username and password
                $scope.consecutiveKnownInstancesFound = 0;
                setTimeout($scope.callRemoteToGetInstanceDetailsAuto, 1500); 
            }
            
        }, function (x) {
            alert("There was an error while retrieving the site settings, please provide your publish profile credentials again.");
        });
    }

    $scope.init = function () {
        $("#tabsContainer").hide(); //Section of the page where console windows will be opened
        $("#connectToSettings").hide(); // Drop down to display a list of all the instances that were identified
        $("#checkMark").hide();  //Check mark to be displayed once all instances have been identified
        $("#progressCircular").hide(); //Progress bar indicating that the detection is in progress
        $("#instanceCount").hide();  //Message displaying # of instances found
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
        }
    }


    $scope.callRemoteToGetInstanceDetailsAuto = function () {
        $("#instanceCount").show();
        if ($scope.consecutiveKnownInstancesFound < $scope.consecutiveKnownInstancesFoundLimit) {
            $("#checkMark").hide();
            $("#btnRefresh").hide();
            $("#progressCircular").show();
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
                alert($scope.hostingInstances.length + " instances found.");
            }
            //Keep repeating every X seconds unless we have reached the max supported number of instances 
            setTimeout($scope.callRemoteToGetInstanceDetailsAuto, 3000);
        }
        else {            
            //Perform cleanup here, the next time this function will not be called
            //This is not guaranteed to execute only once
            $("#progressCircular").hide();
            $("#checkMark").show();
            $("#btnRefresh").show();            
            $("#connectToSettings").css("display", "flex");  //Have to set this to flex else it is moving the button on next line
        }
    }
    //--------------AUTO IDENTIFY INSTANCES

    $scope.getAndUpdateInstanceDetails = function () {
        var req = {
            method: 'POST',
            url: '/multiconsoleext/api/Settings',
            headers: {
                'Content-Type': 'text/json'
            },
            data: JSON.stringify({ userName: $scope.publishProfileUserName, password: $scope.publishProfilePassword })
        }

        $http(req).then(function (resp) {
            $scope.publishProfileUserName = resp.data.UserName;
            $scope.publishProfilePassword = resp.data.Password;
            authHeader = resp.data.AuthHeader;
            if (authHeader != "") {
                $scope.hostingInstances = [];
                $scope.connectedInstances = [];
                $scope.selectedHostingInstance = [];
                $scope.consecutiveKnownInstancesFound = 0;
                $scope.callRemoteToGetInstanceDetailsAuto();
            }
            else {
                alert("There was an error retrieving the saved connection info.");
            }

        }, function () { alert("There was an error while saving the settings"); });
    }

    $scope.refreshInstanceDetails = function () {
        if (authHeader != "") {
            $scope.hostingInstances = [];
            $scope.connectedInstances = [];
            $scope.selectedHostingInstance = [];
            $scope.consecutiveKnownInstancesFound = 0;
            $scope.callRemoteToGetInstanceDetailsAuto();
        }
        else {
            alert("There was an error retrieving the saved connection info.");
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
            console.log($scope.selectedHostingInstance[i]);
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


    $scope.init();


});