var curWorkingDir = ko.observable("");
var initCmd = "echo.";
if ($.serverOS === "linux") {
    initCmd = "echo ''";
}
window.KuduExec = { workingDir: curWorkingDir };

var authHeader = "";
var instances = [];


function callLocalWebAPI(command, workingDirectory, InstanceId)
{
    var uri = "/multiconsoleext/api/KuduCommand",
            request = {
                method: "POST",
                contentType: "application/json",
                crossDomain: false,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', authHeader);
                    xhr.setRequestHeader('Content-Type', 'text/json');
                },
                data: JSON.stringify({ command: command, dir: workingDirectory, ARRAffinity:InstanceId })
            };
    return $.ajax(uri, request);
}


    function LoadConsole(connectedInstances) {
        var instanceDetails = connectedInstances;
        
        function MessagesFromResponse(resp) {
            // parse the output to separate the command output from
            // our tacked on expression to get the current working directory
            // after the command.
            var output;
            var resultOutput;
            var cdIndex;
            if (resp.Output) {
                resultOutput = resp.Output.trim();
                if ($.serverOS === "windows") {
                    cdIndex = resultOutput.lastIndexOf("\r\n");
                } else {
                    cdIndex = resultOutput.lastIndexOf("\n");
                }
            
                if (cdIndex < 0) {
                    // The original command is has no output it is just our output.
                    curWorkingDir(resultOutput.trim());
                } else {
                    // happen
                    curWorkingDir(resultOutput.substr(cdIndex).trim());
                    output = resultOutput.substr(0, cdIndex);
                }
            }
            if (output) {
                return FormatCommandOutput(output, "jquery-console-message-value");
            }
            if (resp.Error) {
                return FormatCommandOutput(resp.Error + "\n", "jquery-console-message-error");
            }
        }

        function FormatCommandOutput(text, className) {
            // need to do some massaging of newlines to make it look right
            var fmtText = text.replace(/\r\n/g, '\n');
            return [{ msg: fmtText, className: className }];
        }
	
        // returns a request promise
        function RemoteExecuteCommandRequest(command, workingDirectory, InstanceId) {
            
            return callLocalWebAPI(command, workingDirectory, InstanceId);

        }

        function SubmitCommand(command, InstanceId) {		
            var deferred = $.Deferred();
            if (!command) {
                deferred.resolveWith(null, [{ msg: "", className: "jquery-console-message-value" }]);
            } else {
                // always append these commands so the working directory after the command is returned.
                var remoteCommand = command + " & echo. & cd";
                if ($.serverOS === "linux") {
                    remoteCommand = "bash -c '" + command + " && echo '' && pwd'";
                }
                var request = RemoteExecuteCommandRequest(remoteCommand, curWorkingDir(), InstanceId);
                request.done(function (resp) {
                    deferred.resolveWith(null, [MessagesFromResponse(resp)]);
                });
            }
            return deferred.promise();
        }

        window.KuduExec.changeDir = function (value) {
            value = value || window.KuduExec.appRoot;
            curWorkingDir(value);
            // Trim the trailing slash.
            value = value.replace(/\/|\\$/, "").replace(/:$/, ":\\") + ">";
            $(".jquery-console-cursor").parent().prev(".jquery-console-prompt-label").text(value);
        }

        // call make console after this first command so the current working directory is set.
	
        //--------------------Calling multiple times for Multi Div--------------

        for(var i=0;i<instanceDetails.length;i++)
        {
            (function(currInstance){
                SubmitCommand(initCmd, currInstance.InstanceId).done(function () {
                    var kuduExecConsole = $('<div class="console">'),
                        curReportFun,
                        controller = kuduExecConsole.console({
                            promptLabel: function () {
                                return KuduExec.workingDir() + ">";
                            },
                            commandValidate: function () {
                                return true;
                            },
                            commandHandle: function (line, reportFn) {
                                var trimmed = line.trim();
                                if (trimmed === "exit" || trimmed === "cls") {
                                    controller.reset();
                                    return;
                                }
                                curReportFun = reportFn;
                                SubmitCommand(line, currInstance.InstanceId).done(reportFn);
                                // kuduExecConsole.scrollTop = kuduExecConsole.scrollHeight;
                            },
                            cancelHandle: function () {
                                if (curReportFun) {
                                    curReportFun([{ msg: "Command canceled by user.", className: "jquery-console-message-error" }]);
                                }
                            },
                            completeHandle: function (line) {
                                var cdRegex = /^cd\s+(.+)$/,
                                    pathRegex = /.+\s+(.+)/,
                                    matches;
                                if (matches = line.match(cdRegex)) {
                                    return window.KuduExec.completePath(matches[1], /* dirOnly */ true);
                                } else if (matches = line.match(pathRegex)) {
                                    return window.KuduExec.completePath(matches[1]);
                                }
                                return;
                            },
                            cols: 3,
                            autofocus: true,
                            animateScroll: true,
                            promptHistory: true,
                            welcomeMessage: "Kudu Remote Execution Console\nType 'exit' to reset this console."
                        });

                    $("#" + currInstance.kuduExecConsoleId).append(kuduExecConsole);
				
                });	
            })(instanceDetails[i]);
        }
        //--------------------For Multi Div--------------
	
	
	
    }



    $(function () {
          
    })