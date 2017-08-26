angular.module('MultiConsole', ['ngMaterial']).controller('consoleCtrl', function ($scope, $http) {


    $scope.getSiteConnectionSettings = function () {
        $http.get("/multiconsoleext/api/Settings").then(function (resp) {
            $scope.publishProfileUserName = resp.data.UserName;
            $scope.publishProfilePassword = resp.data.Password;
            authHeader = resp.data.AuthHeader;
        }, function (x) {
            alert("There was an error while retrieving the site settings, please provide your publish profile credentials again.");
        });
    }

    $scope.init = function () {
        $("#tabsContainer").hide();
        $("#connectToSettings").hide();
        $("#instanceCount").hide();

        $scope.hostingInstances = [];
        $scope.connectedInstances = [];
        $scope.selectedHostingInstance = [];

        $scope.maxRetryAttemptsToGetInstanceDetails = 5;
        $scope.currRetryAttemptsToGetInstanceDetails = 1;


        $scope.publishProfileUserName = "";
        $scope.publishProfilePassword = "";

        $scope.getSiteConnectionSettings();
    }

    $scope.init();

   

    $scope.updateInstances = function (instanceInfo) {
        var alreadyExists = false;
        for (var i = 0; i < $scope.hostingInstances.length; i++) {
            if ($scope.hostingInstances[i].InstanceId == instanceInfo.InstanceId) {
                alreadyExists = true;
            }
            if (alreadyExists) break;
        }
        if (!alreadyExists) {
            if ($scope.hostingInstances.length < parseInt($('#siteInstances').val())) {
                $scope.hostingInstances.push(instanceInfo);
            }
            if ($scope.hostingInstances.length == parseInt($('#siteInstances').val())) {
                //$("#instanceCount").hide();
            }
        }

    }



    $scope.callRemoteToGetInstanceDetails = function (instanceCount) {
        $scope.currRetryAttemptsToGetInstanceDetails++;
        for (var i = 0; i < instanceCount + 5; i++) {
            if ($scope.hostingInstances.length == instanceCount) {
                clearInterval($scope.callRemoteToGetInstanceDetailsHandle);
                //$("#instanceCount").hide();
                break;
            }
            callLocalWebAPI("hostname", "", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa").done(function (resp) {
                $scope.updateInstances({ MachineName: resp.Output.replace("\r\n", ""), InstanceId: resp.ARRAffinity, DisplayName: resp.Output.replace("\r\n", "") + " (" + resp.ARRAffinity.substring(0, 4) + ")" });
                $scope.$apply();
            });
        }
        if (($scope.currRetryAttemptsToGetInstanceDetails == $scope.maxRetryAttemptsToGetInstanceDetails) || ($scope.hostingInstances.length == instanceCount)) {
            clearInterval($scope.callRemoteToGetInstanceDetailsHandle);
            //$("#instanceCount").hide();
            if (($scope.currRetryAttemptsToGetInstanceDetails == $scope.maxRetryAttemptsToGetInstanceDetails) && ($scope.hostingInstances.length < instanceCount)) {
                alert($scope.hostingInstances.length + " out of " + instanceCount + " instances found. Max retry attempts of " + $scope.maxRetryAttemptsToGetInstanceDetails + " reached.");
            }
        }
    }

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

            var instanceCount = parseInt($('#siteInstances').val());
            if (instanceCount < 1) {
                alert("Site must run on atleast one instance. Please set '# Instances this site runs on' appropriately.");
            }
            else {
                $scope.hostingInstances = [];                
                $("#connectToSettings").show();
                $("#instanceCount").show();
                $scope.callRemoteToGetInstanceDetails(instanceCount);
                $scope.callRemoteToGetInstanceDetailsHandle = setInterval($scope.callRemoteToGetInstanceDetails, 5000, instanceCount);
            }
        }, function () { alert("There was an error while saving the settings"); });




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

});