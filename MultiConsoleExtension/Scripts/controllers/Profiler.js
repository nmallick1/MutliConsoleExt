
function profilerInit($scope, $http) {

    //This section is for wiring up context menu
    $scope.profilingInstances = [];
    $scope.profilingMSG = "Test Message";
    $scope.siteRoot = (window.location.hostname == "localhost") ? "nmallicksiteext.scm.azurewebsites.net" : window.location.hostname;

    $scope.ExecuteKuduCommand = function (command, InstanceId) {
        var workingDirectory = "D:\\home";
        var uri = "/InstanceDetective/api/KuduCommand";
        return $http.post(uri, JSON.stringify({ command: command, dir: workingDirectory, ARRAffinity: InstanceId }), {
            withCredentials: true,
            headers: {
                "Authorization": authHeader
            }
        });
    };

    $scope.showHideMessageProfiling = function (show, level, message) {
        if (show) {
            switch (level) {
                case "Error":
                    $("#checkMarkProfiling").hide();
                    $("#progressCircularProfiling").hide();
                    $("#errorMarkProfiling").show();
                    break;

                case "Success":
                    $("#errorMarkProfiling").hide();
                    $("#progressCircularProfiling").hide();
                    $("#checkMarkProfiling").show();
                    break;

                case "Progress":
                    $("#checkMarkProfiling").hide();
                    $("#errorMarkProfiling").hide();
                    $("#progressCircularProfiling").show();
                    break;

                default:
                    break;
            }
            $scope.profilingMSG = message;
        }
        else {
            $("#errorMarkProfiling").hide();
            $("#checkMarkProfiling").hide();
            $("#progressCircularProfiling").hide();
            $scope.profilingMSG = "";
        }
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }

    $scope.showHideProfilingMenu = function (show) {
        if (show) {
            $("#stopProfiling").hide();
            $("#profileWithIIS").show();
            $("#profileWithoutIIS").show();
        }
        else {
            $("#profileWithIIS").hide();
            $("#profileWithoutIIS").hide();
            $("#stopProfiling").show();
        }

    };

    $scope.showHideProfilingMenu(true);




    $scope.downloadFile = function (data, headers, downloadFileName) {
        //--------------------------------------------------
        //File download logic from
        //https://ramirezmery.wordpress.com/2016/04/17/angularjs-download-file-with-http-and-web-api/
        //Download the dump file here

        var octetStreamMime = 'application/octet-stream';
        var success = false;

        // Get the headers
        headers = headers();

        // Get the filename from the x-filename header or default to "download.bin"
        var filename = "";
        if (downloadFileName != "") {
            filename = downloadFileName;
        }
        else {
            filename = headers["content-disposition"] || 'InstanceDetective.zip';
            if (filename != "InstanceDetective.zip")
                filename = filename.split("filename=")[1] || 'InstanceDetective.zip';
        }
        if (filename == "")
        { filename = "InstanceDetective.zip"; }

        // Determine the content type from the header or default to "application/octet-stream"
        var contentType = headers['content-type'] || octetStreamMime;

        try {
            // Try using msSaveBlob if supported
            var blob = new Blob([data], {
                type: contentType
            });
            if (navigator.msSaveBlob)
                navigator.msSaveBlob(blob, filename);
            else {
                // Try using other saveBlob implementations, if available
                var saveBlob = navigator.webkitSaveBlob || navigator.mozSaveBlob || navigator.saveBlob;
                if (saveBlob === undefined)
                    throw "Not supported";
                saveBlob(blob, filename);
            }
            success = true;
        } catch (ex) {
            console.log("saveBlob method failed with the following exception:");
            console.log(ex);
        }

        if (!success) {
            // Get the blob url creator
            var urlCreator = window.URL || window.webkitURL || window.mozURL || window.msURL;
            if (urlCreator) {
                // Try to use a download link
                var link = document.createElement('a');
                if ('download' in link) {
                    // Try to simulate a click
                    try {
                        // Prepare a blob URL
                        var blob = new Blob([data], {
                            type: contentType
                        });


                        var url = urlCreator.createObjectURL(blob);
                        link.setAttribute('href', url);

                        // Set the download attribute (Supported in Chrome 14+ / Firefox 20+)
                        link.setAttribute("download", filename);

                        // Simulate clicking the download link
                        //var event = document.createEvent('MouseEvents');
                        //event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);                        
                        document.body.appendChild(link);
                        link.click();
                        setTimeout(function () {
                            document.body.removeChild(link);
                            urlCreator.revokeObjectURL(url);
                        }, 10000);
                        success = true;

                    } catch (ex) {
                        console.log("Download link method with simulated click failed with the following exception:");
                        console.log(ex);
                    }
                }
            }
        }
        //--------------------------------------------------
    }



    $scope.updateActionStatus = function (rowID, level, action, status) {

        var row = $("#" + rowID);
        var statusDiv = $("#" + rowID + "_DIV");

        var message = "Action : " + action + ". Status : " + status;
        switch (level) {
            case "Info":
                row.removeClass(row.attr('class'));
                row.addClass("alert alert-info");
                break;
            case "Warning":
                row.removeClass(row.attr('class'));
                row.addClass("alert alert-warning");
                break;
            case "Error":
                row.removeClass(row.attr('class'));
                row.addClass("alert alert-danger");
                //Clear the action status div since the operation 'completed' with an error
                setTimeout(function () {
                    $scope.updateActionStatus(rowID, "Completed", "", "");
                }, 3000);
                break;
            case "Success":
                row.removeClass(row.attr('class'));
                row.addClass("alert alert-success");
                //Clear the action status div since the operation 'completed' with a success.
                setTimeout(function () {
                    $scope.updateActionStatus(rowID, "Completed", "", "");
                }, 3000);
                break;
            case "Completed":
                row.removeClass(row.attr('class'));
                message = "Right click to take an action on this process";
                break;
            default: "";
                row.removeClass(row.attr('class'));
                message = "Right click to take an action on this process";
                break;
        }
        statusDiv.text(message);
    }

    String.prototype.replaceAll = function (str1, str2, ignore) {
        return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, "\\$&"), (ignore ? "gi" : "g")), (typeof (str2) == "string") ? str2.replace(/\$/g, "$$$$") : str2);
    }

    $scope.cleanUpFileOnServer = function (rightClickFor, action, fullFilePath) {
        //Now that the file has either been downloaded or failed, it is time to delete the file

        var deleteURL = fullFilePath.replace("D:\\home\\", "").replaceAll(String.fromCharCode(92), String.fromCharCode(47));
        deleteURL = "https://" + $scope.siteRoot + "/api/vfs/" + deleteURL;

        $http.defaults.headers.common.Authorization = authHeader;
        $http.delete(deleteURL, {
            headers: {
                "Authorization": authHeader,
                "Content-Type": "text/plain",
                "If-Match": "*"
            }
        }).success(function (data, status, headers) {
            $scope.updateActionStatus(rightClickFor, "Success", action, "Action complete.");
        }).error(function (data, status) {
            $scope.updateActionStatus(rightClickFor, "Error", action, "There was an error cleaning up the file on server");
            console.log("There was an error cleaning up the file on server");
            console.log(status);
            console.log(data);
        });
    }

    $scope.fetchZipFromKudu = function (downloadURL, authHeader) {
        return $http.get(downloadURL, {
            responseType: 'arraybuffer',
            headers: {
                "Authorization": authHeader
            }
        });
    };

    $scope.generateDump = function ($event, type) {
        var rightClickFor = $("#" + $event.currentTarget.parentElement.id).attr("parentRowId");
        if (rightClickFor != "") {


            //Setup the context menu so that no other operation is allowed untill the dump completion occurs.
            for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                if ($scope.contextMenuState[i].RowID == rightClickFor) {
                    $scope.contextMenuState[i].LastAction = type.replaceAll(" ", "");
                    for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                        switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                            case "stopProfiling":
                                $scope.contextMenuState[i].ElementStates[j].State = "Hide";
                                break;
                                //case "killProcess":
                                //$scope.contextMenuState[i].ElementStates[j].State = "Show";
                                //break;
                            default:
                                $scope.contextMenuState[i].ElementStates[j].State = "Disable";
                                break;
                        }
                    }
                    break;
                }
            }


            var instance = rightClickFor.split("_")[0];
            var pid = rightClickFor.split("_")[1];
            var dumpCmd = "";
            var procDumpEXE = "D:\\devtools\\sysinternals\\procdump.exe";
            var procDumpOpts = "";
            var dumpFileLocation = "D:\\home\\site\\siteextensions\\InstanceDetective\\";
            var dumpFileName = "";

            if (type == "Mini Dump") {
                procDumpOpts = "-accepteula";
                dumpFileLocation = dumpFileLocation + "MiniDump";
                dumpFileName = "w3wp_" + pid + "_" + (new Date()).getTime() + "_MiniDump.dmp";
                //String.fromCharCode(92) = "\"
                dumpCmd = procDumpEXE + " " + procDumpOpts + " " + pid + " " + dumpFileLocation + String.fromCharCode(92) + dumpFileName;
            }
            else {
                if (type == "Full Dump") {
                    procDumpOpts = "-accepteula -ma";
                    dumpFileLocation = dumpFileLocation + "FullDump";
                    dumpFileName = "w3wp_" + pid + "_" + (new Date()).getTime() + "_FullDump.dmp";
                    //String.fromCharCode(92) = "\"
                    dumpCmd = procDumpEXE + " " + procDumpOpts + " " + pid + " " + dumpFileLocation + String.fromCharCode(92) + dumpFileName;
                }
                else {
                    console.log("Unknown action requested. Available actions are 'Mini Dump' and 'Full Dump'.");
                    dumpCmd = "";
                    return false;
                }
            }

            if (dumpCmd != "") {

                $scope.updateActionStatus(rightClickFor, "Info", type, "Dump generation initiated.");
                $scope.ExecuteKuduCommand(dumpCmd, instance).success(function (data, status, headers) {
                    //The dump has been generated. 

                    //Setup the context menu so that the user can take other actions on the process
                    for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                        if ($scope.contextMenuState[i].RowID == rightClickFor) {
                            for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                                switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                                    case "stopProfiling":
                                        $scope.contextMenuState[i].ElementStates[j].State = "Hide";
                                        break;
                                    default:
                                        $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                        break;
                                }
                            }
                            break;
                        }
                    }



                    //Now it is time to download the Zip folder and Delete the dump file once download completes
                    //String.fromCharCode(47) = "/"
                    var downloadLocation = dumpFileLocation + String.fromCharCode(47);
                    var downloadURL = "https://" + $scope.siteRoot + "/api/zip/" + downloadLocation.replace("D:\\home\\", "").replaceAll("\\", "/");
                    //var downloadURL = "https://" + $scope.siteRoot + "/api/vfs/" + downloadLocation.replace("D:\\home\\", "").replaceAll("\\", "/") + dumpFileName;
                    $scope.updateActionStatus(rightClickFor, "Info", type, "Dump generated. Zip & Download in progress");

                    $scope.fetchZipFromKudu(downloadURL, authHeader).success(function (data, status, headers) {
                        $scope.updateActionStatus(rightClickFor, "Info", type, "Downloading Dump");
                        try {
                            $scope.downloadFile(data, headers, dumpFileName.replace(".dmp", ".zip"));
                            $scope.updateActionStatus(rightClickFor, "Success", type, "Dump Download Complete");
                        }
                        catch (ex) {
                            $scope.updateActionStatus(rightClickFor, "Error", type, "There was an error downloading the dump file.");
                        }

                        $scope.cleanUpFileOnServer(rightClickFor, type, dumpFileLocation + String.fromCharCode(92) + dumpFileName);

                    }).error(function (data, status) {
                        $scope.updateActionStatus(rightClickFor, "Error", type, "Error encountered downloading the dump");
                        console.log("There was an error compressing the dump for download");
                        console.log(status);
                        console.log(data);
                        $scope.cleanUpFileOnServer(rightClickFor, type, dumpFileLocation + String.fromCharCode(92) + dumpFileName);
                    });
                }).error(function (data, status) {

                    //Reset the context menu so that the user can take other actions on this process
                    //Setup the context menu so that the user can take other actions on the process
                    for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                        if ($scope.contextMenuState[i].RowID == rightClickFor) {
                            for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                                switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                                    case "stopProfiling":
                                        $scope.contextMenuState[i].ElementStates[j].State = "Hide";
                                        break;
                                    default:
                                        $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                        break;
                                }
                            }
                            break;
                        }
                    }

                    //Report Error that the Dump could not be generated
                    $scope.updateActionStatus(rightClickFor, "Error", type, "Unable to generate memory dump. Server returned an error");
                    console.log("Unable to generate memory dump. Server returned an error");
                    consol.log(status);
                    console.log(data);
                });
            }
            else {
                $scope.updateActionStatus(rightClickFor, "Error", type, "Unknown action requested. Available actions are 'Mini Dump' and 'Full Dump'");
                console.log("Unknown action requested. Available actions are 'Mini Dump' and 'Full Dump'");
            }

        }
        else {
            $scope.updateActionStatus(rightClickFor, "Error", type, "Unable to determine which instance and PID you meant to take action against");
            console.log("Unable to determine which instance and PID you meant to take action against");
            console.log(status);
            console.log(data);
        }
    }


    $scope.contextMenuSetup = function (rowId) {
        var found = false;
        for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
            if ($scope.contextMenuState[i].RowID == rowId) {
                for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                    currElement = $('#' + $scope.contextMenuState[i].ElementStates[j].Id);
                    currElement.removeClass(currElement.attr('class'));
                    switch ($scope.contextMenuState[i].ElementStates[j].State) {
                        case "Show":
                            currElement.show();
                            break;
                        case "Hide":
                            currElement.hide();
                            break;
                        case "Disable":
                            currElement.addClass("disabled");
                            break;
                        default:
                            currElement.hide();
                            break;
                    }
                }
                found = true;
                break;
            }
        }
        if (!found) {
            //A state was not set, initialize the menu to default
            $scope.contextMenuState.push({
                "RowID": rowId,
                "LastAction": "None",
                "ProfilingCancellationToken": -1, //If someone stops profiling manally then use this cancellation token to stop the auto stop profiling
                "ElementStates": [
                    {
                        "Id": "miniDump",
                        "State": "Show"
                    },
                    {
                        "Id": "fullDump",
                        "State": "Show"
                    },
                    {
                        "Id": "profileWithIIS",
                        "State": "Show"
                    },
                    {
                        "Id": "profileWithoutIIS",
                        "State": "Show"
                    },
                    {
                        "Id": "stopProfiling",
                        "State": "Hide"
                    },
                    {
                        "Id": "killProcess",
                        "State": "Show"
                    }
                ]
            });
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            //console.log("About to call recursion contextMenuState.length for RowID: " + rowId + " id " + $scope.contextMenuState.length);
            $scope.contextMenuSetup(rowId);
        }
    }

    $scope.contextMenuState = [];

    //$scope.contextMenuState.push({
    //    "RowID": "ARRID_PID",
    //    "ElementStates": [
    //        {
    //            "Id": "miniDump",
    //            "State": "Display"
    //        },
    //        {
    //            "Id": "fullDump",
    //            "State": "Display"
    //        },
    //        {
    //            "Id": "profileWithIIS",
    //            "State": "Hide"
    //        },
    //        {
    //            "Id": "profileWithoutIIS",
    //            "State": "Hide"
    //        },
    //        {
    //            "Id": "stopProfiling",
    //            "State": "Display"
    //        },
    //        {
    //            "Id": "killProcess",
    //            "State": "Hide"
    //        }
    //        ]
    //});





    $scope.updateTimerAndAutoStopProfiling = function (rowID, action, timeRemaining) {
        if (rowID != "" && rowID != "undefined" && rowID != null) {
            var instance = rowID.split("_")[0];
            var pid = rowID.split("_")[1];
            var msg = "Running. If not stopped manually, Profiling will auto stop in " + (timeRemaining / 1000) + " seconds";

            var lastAction = "";
            var found = false;
            var index = -1;
            for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                if ($scope.contextMenuState[i].RowID == rowID) {
                    index = i;
                    found = true;
                    lastAction = $scope.contextMenuState[i].LastAction;
                }
                if (found)
                    break;
            }
            if (found && ((lastAction == "ProfileWithIIS") || (lastAction == "ProfileWithoutIIS"))) {
                //The user has not yet clicked on Stop Profiling manually, so keep the timer counting down and stop once timeout
                $scope.updateActionStatus(rowID, "Info", action, msg);
                if (timeRemaining > 999) {
                    $scope.contextMenuState[index].ProfilingCancellationToken = setTimeout(function () {
                        $scope.updateTimerAndAutoStopProfiling(rowID, action, timeRemaining - 1000);
                    }, 1000)
                }
                else {
                    //Stop the profiling here
                    $scope.autoStopProfiling(rowID, action);
                }
            }
        }
    }


    $scope.autoStopProfiling = function (rowID, action) {
        if (rowID != "" && rowID != "undefined" && rowID != null) {
            var instance = rowID.split("_")[0];
            var pid = rowID.split("_")[1];

            var lastAction = "";
            var found = false;
            var index = -1;
            for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                if ($scope.contextMenuState[i].RowID == rowID) {
                    index = i;
                    found = true;
                    lastAction = $scope.contextMenuState[i].LastAction;
                }
                if (found)
                    break;
            }

            
            //Reset context Menu for this row
            $scope.contextMenuState[index].LastAction = "StopProfiling";
            for (var j = 0; j < $scope.contextMenuState[index].ElementStates.length; j++) {                
                switch ($scope.contextMenuState[index].ElementStates[j].Id) {
                    case "stopProfiling":
                        $scope.contextMenuState[index].ElementStates[j].State = "Hide";
                        break;
                    default:
                        $scope.contextMenuState[index].ElementStates[j].State = "Show";
                        break;
                }
            }


            //Stop the Timer. autoStopProfiling could have been called as a result of someone clicking on StopProfiling hence clearing the timer function is required.
            clearTimeout($scope.contextMenuState[index].ProfilingCancellationToken);
            $scope.contextMenuState[index].ProfilingCancellationToken = -1;

            $scope.updateActionStatus(rowID, "Info", "Stop Profiling", "Stopping profiler and generating trace.");


            //Make the POST request here and update the action accordingly. Implementation required here....

            var url = "/InstanceDetective/api/Profile";
            var data = {
                ARRAffinity: instance,
                AuthHeader: authHeader,
                PID: pid,
                ProfileIIS: lastAction != "ProfileWithoutIIS",
                ActionRequested: "Stop"
            };

            $http.post(url,
                JSON.stringify(data), {
                    withCredentials: true
                }).success(function (data, status, headers) {
                    //Download the trace file here
                    //console.log(data);
                    //returned data =  "site/siteextensions/InstanceDetective/ProfilerTrace/". Now construct the download URL with this
                    var profilerTraceFileFullLocation = data;
                    var profilerTraceFileLocation = profilerTraceFileFullLocation.substr(0, profilerTraceFileFullLocation.lastIndexOf("/") + 1); //This will remove the file name portion from the returned file path
                    var downloadZipFileName = "";
                    if (lastAction == "ProfileWithIIS") {
                        downloadZipFileName = "ProfilerTrace_IIS_" + pid + "_" + (new Date()).getTime() + ".zip";
                    }
                    else {
                        downloadZipFileName = "ProfilerTrace_NoIIS_" + pid + "_" + (new Date()).getTime() + ".zip";
                    }
                    var downloadURL = "https://" + $scope.siteRoot + "/api/zip/" + profilerTraceFileLocation;
                    $scope.updateActionStatus(rowID, "Info", "Stop Profiling", "Trace generated. Zip & Download in progress");
                    
                    $scope.fetchZipFromKudu(downloadURL, authHeader).success(function (data, status, headers) {
                        $scope.updateActionStatus(rowID, "Info", "Stop Profiling", "Downloading Trace");
                        try {
                            $scope.downloadFile(data, headers, downloadZipFileName);
                            $scope.updateActionStatus(rowID, "Success", "Stop Profiling", "Trace Download Complete");
                        }
                        catch (ex) {
                            $scope.updateActionStatus(rowID, "Error", "Stop Profiling", "There was an error downloading the profiler trace.");
                        }

                        $scope.cleanUpFileOnServer(rowID, "Stop Profiling", profilerTraceFileFullLocation);

                    }).error(function (data, status) {
                        $scope.updateActionStatus(rowID, "Error", "Stop Profiling", "Error encountered downloading the profiler trace");
                        console.log("There was an error compressing the profiler trace for download");
                        console.log(status);
                        console.log(data);
                        $scope.cleanUpFileOnServer(rowID, "Stop Profiling", profilerTraceFileFullLocation);
                    });
                    //--------------------------------------------------------


                }).error(function (data, status) {
                    //Show message to the user 
                    $scope.updateActionStatus(rowID, "Error", "Stop Profiling", "Error encountered while stopping Profiling.");
                    console.log("There was a problem stopping profiling for PID " + pid + " on instance " + instance);
                });

        }
    }


   
    $scope.startProfiling = function ($event, profileIIS) {
        var rightClickFor = $("#" + $event.currentTarget.parentElement.id).attr("parentRowId");
        if (rightClickFor != "") {
            var instanceId = rightClickFor.split("_")[0];
            var pid = rightClickFor.split("_")[1];

            var action = "";
            if (profileIIS) {
                action = "Profile With IIS";
            }
            else {
                action = "Profile Without IIS";
            }

            var lastAction = "";
            var index = -1;
            for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                if ($scope.contextMenuState[i].RowID == rightClickFor) {
                    index = i;
                    lastAction = $scope.contextMenuState[i].LastAction;
                    $scope.contextMenuState[i].LastAction = action.replaceAll(" ","");
                    for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                        switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                            case "stopProfiling":
                                $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                break;
                            case "killProcess":
                                $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                break;
                            default:
                                $scope.contextMenuState[i].ElementStates[j].State = "Disable";
                                break;
                        }
                    }
                    break;
                }
            }

            //Start the actual Profiling here... If error while starting the trace, then make sure you reset the context menu and also reset the LastAction to lastAction local variable
            $scope.updateActionStatus(rightClickFor, "Info", action, "Attempting to start the profiler.");

            var url = "/InstanceDetective/api/Profile";
            var data = {
                ARRAffinity: instanceId,
                AuthHeader: authHeader,
                PID: pid,
                ProfileIIS: profileIIS,
                ActionRequested: "Start"
            };

            $http.post(url,
                JSON.stringify(data), {
                    withCredentials: true
                }).success(function (data, status, headers) {
                //180 seconds is the default Profiling timeout set by Kudu, giving an extra 30 seconds so that the stop request can be proxied over to the right instance
                $scope.updateTimerAndAutoStopProfiling(rightClickFor, action, (180 - 30) * 1000);
            }).error(function (data, status) {
                //If error while starting the trace, then make sure we reset the context menu and also reset the LastAction to lastAction local variable
                for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                    if ($scope.contextMenuState[i].RowID == rightClickFor) {
                        $scope.contextMenuState[i].LastAction = lastAction;
                        for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                            switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                                case "stopProfiling":
                                    $scope.contextMenuState[i].ElementStates[j].State = "Hide";
                                    break;
                                default:
                                    $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                    break;
                            }
                        }
                        break;
                    }
                }
                //Show an error message to the user
                $scope.updateActionStatus(rightClickFor, "Error", action, "Error encountered. Could not start Profiling.");

            });

        }
        
    } //Function $scope.startProfiling ends

    /*
    $scope.profileWithIIS = function ($event) {
        var rightClickFor = $("#" + $event.currentTarget.parentElement.id).attr("parentRowId");
        if (rightClickFor != "") {
            var instance = rightClickFor.split("_")[0];
            var pid = rightClickFor.split("_")[1];
            console.log('Start profiling PID ' + pid + " with IIS providers on " + instance);
            //$scope.showHideProfilingMenu(false);

            var lastAction = "";
            var index = -1;
            for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                if ($scope.contextMenuState[i].RowID == rightClickFor) {
                    index = i;
                    lastAction = $scope.contextMenuState[i].LastAction;
                    $scope.contextMenuState[i].LastAction = "ProfileWithIIS";
                    for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                        switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                            case "stopProfiling":
                                $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                break;
                            case "killProcess":
                                $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                break;
                            default:
                                $scope.contextMenuState[i].ElementStates[j].State = "Disable";
                                break;
                        }
                    }
                    break;
                }
            }

            //Start the Profiling here... If error while starting the trace, then make sure you reset the context menu and also reset the LastAction to lastAction local variable
            $scope.updateActionStatus(rightClickFor, "Info", "Profile With IIS", "Attempting to start the profiler.");
            $scope.startProfilng(rightClickFor, true).success(function (data, status, headers) {
                //180 seconds is the default Profiling timeout set by Kudu, giving an extra 30 seconds so that the stop request can be proxied over to the right instance
                $scope.updateTimerAndAutoStopProfiling(rightClickFor, "Profile With IIS", (180 - 30) * 1000);
            }).error(function (data, status) {
                //If error while starting the trace, then make sure we reset the context menu and also reset the LastAction to lastAction local variable
                for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                    if ($scope.contextMenuState[i].RowID == rightClickFor) {
                        $scope.contextMenuState[i].LastAction = lastAction;                        
                        for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                            switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                                case "stopProfiling":
                                    $scope.contextMenuState[i].ElementStates[j].State = "Hide";
                                    break;
                                default:
                                    $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                    break;
                            }
                        }
                        break;
                    }
                }
                //Show an error message to the user
                $scope.updateActionStatus(rightClickFor, "Error", "Profile With IIS", "Error encountered. Could not start Profiling.");

            });

            
        }
    }

    $scope.profileWithoutIIS = function ($event) {
        var rightClickFor = $("#" + $event.currentTarget.parentElement.id).attr("parentRowId");
        if (rightClickFor != "") {
            var instance = rightClickFor.split("_")[0];
            var pid = rightClickFor.split("_")[1];
            console.log('Start profiling PID ' + pid + " without IIS providers on " + instance);
            //$scope.showHideProfilingMenu(false);
            var lastAction = "";
            for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                if ($scope.contextMenuState[i].RowID == rightClickFor) {
                    lastAction = $scope.contextMenuState[i].LastAction;
                    $scope.contextMenuState[i].LastAction = "ProfileWithoutIIS";
                    for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                        switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                            case "stopProfiling":
                                $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                break;
                            case "killProcess":
                                $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                break;
                            default:
                                $scope.contextMenuState[i].ElementStates[j].State = "Disable";
                                break;
                        }
                    }
                    break;
                }
            }
            //Start the Profiling here... If error while starting the trace, then make sure you reset the context menu and also reset the LastAction to lastAction local variable


            $scope.updateActionStatus(rightClickFor, "Info", "Profile Without IIS", "Attempting to start the profiler.");
            $scope.startProfilng(rightClickFor, true).success(function (data, status, headers) {
                //180 seconds is the default Profiling timeout set by Kudu, giving an extra 30 seconds so that the stop request can be proxied over to the right instance
                $scope.updateTimerAndAutoStopProfiling(rightClickFor, "Profile Without IIS", (180 - 30) * 1000);
            }).error(function (data, status) {
                //If error while starting the trace, then make sure we reset the context menu and also reset the LastAction to lastAction local variable
                for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                    if ($scope.contextMenuState[i].RowID == rightClickFor) {
                        $scope.contextMenuState[i].LastAction = lastAction;
                        for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                            switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                                case "stopProfiling":
                                    $scope.contextMenuState[i].ElementStates[j].State = "Hide";
                                    break;
                                default:
                                    $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                    break;
                            }
                        }
                        break;
                    }
                }
                //Show an error message to the user
                $scope.updateActionStatus(rightClickFor, "Error", "Profile Without IIS", "Error encountered. Could not start Profiling.");

            });


            //Make sure that the event is executed only once
            //contextMenuClickedFor = null;
        }
    }

    */


    $scope.stopProfiling = function ($event) {
        var rightClickFor = $("#" + $event.currentTarget.parentElement.id).attr("parentRowId");
        if (rightClickFor != "") {
            var instance = rightClickFor.split("_")[0];
            var pid = rightClickFor.split("_")[1];
            //console.log('Stop profiling process with PID ' + pid + " on " + instance);
            //$scope.showHideProfilingMenu(true);
            var lastAction = "";

            for (var i = 0 ; i < $scope.contextMenuState.length; i++) {
                if ($scope.contextMenuState[i].RowID == rightClickFor) {
                    lastAction = $scope.contextMenuState[i].LastAction;
                    
                    for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                        switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                            case "stopProfiling":
                                $scope.contextMenuState[i].ElementStates[j].State = "Hide";
                                break;
                            default:
                                $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                break;
                        }
                    }
                    break;
                }
            }

            if ((lastAction == "ProfileWithIIS") || (lastAction == "ProfileWithoutIIS")) {
                $scope.autoStopProfiling(rightClickFor, lastAction);
            }
            else {
                //For some reason the stop profiling function was called even though the last action was not to start profiling
                //OR there was an error in the start profiling functions which caused the LastAction not to be set to Profiling
                return false;
            }
        }
    }


    $scope.refreshProcessDetailsForSpecificInstanceAfterKill = function (rowID, retriesRemaining) {
        if (retriesRemaining > 0) {
            retriesRemaining--;
            var instanceId = rowID.split("_")[0];
            var pid = rowID.split("_")[1];
            var found = false;
            for (var j = 0 ; j < $scope.profilingInstances.length; j++) {
                if ($scope.profilingInstances[j].InstanceId == instanceId) {
                    found = true;
                    $scope.profilingInstances[j].processProfilingInfo = [];
                    $scope.processDetailsInfoPendingFromInstances = 1;
                    $scope.refreshProcessDetailsForSpecificInstance($scope.profilingInstances[j], false).done(function () {
                        //Now that we have refreshed the details for this process, check if this process is still present
                        //If it is, then time to retry
                        for (var p = 0; p < $scope.profilingInstances.length; p++) {
                            if ($scope.profilingInstances[p].InstanceId == instanceId) {
                                for (var q = 0; q < $scope.profilingInstances[p].processProfilingInfo.length; q++) {
                                    if ($scope.profilingInstances[p].processProfilingInfo[q].PID == pid) {
                                        //The same pid is still present in the response. It did not die yet. Refresh the process list again after 3 seconds.
                                        // Retry count has already been decremented
                                        setTimeout(function () { $scope.refreshProcessDetailsForSpecificInstanceAfterKill(rowID, retriesRemaining); }, 3000);
                                    }
                                    else {
                                        //No need to do anything here as the process has been terminated
                                        console.log("Process with PID : " + pid + " was terminated on instance " + instanceId);
                                    }
                                }
                                break;
                            }
                        }

                        
                    }); //$scope.refreshProcessDetailsForSpecificInstance.done() completes here

                    //$scope.getProcessListForProfiling().success().error();

                    break;
                }
            }            
        }
        
    }//Function $scope.refreshProcessDetailsForSpecificInstanceAfterKill ends


    $scope.killProcessOnInstance = function (rowID, isRetry) {
        $scope.updateActionStatus(rowID, "Info", "Kill", "Attempting to terminate process.");
        
        if (rowID != "" && rowID!= "undefined" && rowID != null) {
            var instance = rowID.split("_")[0];
            var pid = rowID.split("_")[1];

            var url = "/InstanceDetective/api/Profile";
            var data = {
                ARRAffinity: instance,
                AuthHeader: authHeader,
                PID: pid,
                ProfileIIS: false,
                ActionRequested: "Kill"
            };
            $http.post(url,
                JSON.stringify(data), {
                    withCredentials: true,
                    transformRequest: angular.identity
                }).success(function (data, status, headers) {
                    //Process kill request was submitted, refresh the process list untill the process is terminated or retry count of 3  is reached
                    
                    setTimeout(function () { $scope.refreshProcessDetailsForSpecificInstanceAfterKill(rowID, 3); }, 3000);

                }).error(function (data, status) {
                    //Inform the user and retry here
                    if (!isRetry) {
                        $scope.updateActionStatus(rowID, "Warning", "Kill", "Error terminating the process. Retrying..");
                        setTimeout(function () {$scope.killProcessOnInstance(rowID, true);}, 3000);
                    }
                    else {
                        $scope.updateActionStatus(rowID, "Error", "Kill", "Error terminating the process. No more retries");
                    }
                });
            
            
            //console.log('Kill process with PID ' + pid + " on " + instance);
            //Make sure that the event is executed only once
            //contextMenuClickedFor = null;
        }
    }//Function $scope.killProcessOnInstance ends

    $scope.killProcess = function ($event) {
        var rightClickFor = $("#" + $event.currentTarget.parentElement.id).attr("parentRowId");
        if (rightClickFor != "") {
            var instance = rightClickFor.split("_")[0];
            var pid = rightClickFor.split("_")[1];


            //Check for the cancellationToken for this Process just in case it was set. 
            //We need to clear it so that a zombie profiling stop operation is not triggerred
            //Also, reset the context menu so that a user can take any action. This is required in case the kill command fails

            for (var i = 0; i < $scope.contextMenuState; i++) {
                if ($scope.contextMenuState[i].RowID == rightClickFor) {
                    if ($scope.contextMenuState[i].ProfilingCancellationToken > 0) {
                        clearTimeout($scope.contextMenuState[i].ProfilingCancellationToken);                        
                    }
                    $scope.contextMenuState[i].ProfilingCancellationToken = -1;
                    for (var j = 0; j < $scope.contextMenuState[i].ElementStates.length; j++) {
                        switch ($scope.contextMenuState[i].ElementStates[j].Id) {
                            case "stopProfiling":
                                $scope.contextMenuState[i].ElementStates[j].State = "Hide";
                                break;
                            default:
                                $scope.contextMenuState[i].ElementStates[j].State = "Show";
                                break;
                        }
                    }
                }
            }

            $scope.killProcessOnInstance(rightClickFor, false);

            //console.log('Kill process with PID ' + pid + " on " + instance);
            //Make sure that the event is executed only once
            //contextMenuClickedFor = null;
        }
    }
    //This section is for wiring up context menu



    $scope.refreshProcessDetailsForSpecificInstance = function (currProcessProfilingInfoInstance, isRetry) {
        var deferred = $.Deferred();
        $scope.processDetailsInfoPendingFromInstances--;
        $scope.getProcessListForProfiling(currProcessProfilingInfoInstance).success(function (resp) {
            
            for (var j = 0; j < $scope.profilingInstances.length; j++) {
                if ($scope.profilingInstances[j].InstanceId == currProcessProfilingInfoInstance.InstanceId)
                    $scope.profilingInstances[j].processProfilingInfo = resp;
            }

            if (!$scope.$$phase) {
                $scope.$apply();
            }

            //if (index == $scope.connectedInstances.length - 1) {
            if ($scope.processDetailsInfoPendingFromInstances < 1) {
                $scope.showHideMessageProfiling(false, "", "");
            }
            //$scope.showHideMessage(true, "Success", "Publish Profile sucessfully uploaded."); 
            deferred.resolve();

        }).error(function () {            
            //Clear the state of hte file upload control so as to allow the user a chance to upload again.                
            //$scope.showHideMessage(true, "Error", "There was an error saving the Publish Profile.");
            $scope.showHideMessageProfiling(true, "Error", "There was an error trying to fetch process info for Instance : " + currProcessProfilingInfoInstance.DisplayName);

            if (index == $scope.connectedInstances.length - 1) {
                //if ($scope.processDetailsInfoPendingFromInstances < 1) {
                //Error was recieved for the last pending instance, so we can clear off the message board
                setTimeout(function () { $scope.showHideMessageProfiling(false, "", ""); }, 3000);
            }
            else {
                //Yet to recieve response from more instances, show the progress bar again and log the error on console so it is not lost
                console.log("Error while getting Process Info for Instance : " + currProcessProfilingInfoInstance.DisplayName);
                $scope.showHideMessageProfiling(true, "Progress", "Fetching Process Details");
            }

            //Retry here one more time after increasing the value of $scope.processDetailsInfoPendingFromInstances by 1
            if (!isRetry) {
                processDetailsInfoPendingFromInstances++;
                $scope.refreshProcessDetailsForSpecificInstance(currProcessProfilingInfoInstance, true);
            }
            else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    } //Function $scope.refreshProcessDetailsForSpecificInstance ends


    $scope.refreshProcessDetailsForAllInstances = function () {
        $scope.showHideMessageProfiling(true, "Progress", "Fetching Process Details");
        $scope.processDetailsInfoPendingFromInstances = $scope.connectedInstances.length;

        for (var i = 0; i < $scope.connectedInstances.length; i++) {
            var found = false;
            for (var j = 0 ; j < $scope.profilingInstances.length; j++) {
                if ($scope.profilingInstances[j].InstanceId == $scope.connectedInstances[i].InstanceId) {
                    found = true;
                    $scope.profilingInstances[j].processProfilingInfo = [];
                    $scope.refreshProcessDetailsForSpecificInstance($scope.profilingInstances[j], false);
                    break;
                }
            }

            if (!found) {
                var instanceProfilingInfo = {
                    MachineName: $scope.connectedInstances[i].MachineName,
                    InstanceId: $scope.connectedInstances[i].InstanceId,
                    DisplayName: $scope.connectedInstances[i].DisplayName,
                    profilerContainerId: "profilerContainer" + i,
                    profilerProcessListId: "profilerProcessList" + i,
                    processProfilingInfo: []
                };
                $scope.profilingInstances.push(instanceProfilingInfo);
                $scope.refreshProcessDetailsForSpecificInstance(instanceProfilingInfo, false);
            }
        }
    } //Function $scope.refreshProcessDetailsForAllInstances ends



    $scope.getProcessListForProfiling = function (currInstance) {
        var url = "/InstanceDetective/api/Profile";
        var data = {
            ARRAffinity: currInstance.InstanceId,
            AuthHeader: authHeader,
            PID: 1,
            ProfileIIS: false,
            ActionRequested: "Info"
        };
        return $http.post(url,
            JSON.stringify(data), {
                withCredentials: true,
                transformRequest: angular.identity
            });
    }


    $scope.refreshProcessDetailsForAllInstances();

}