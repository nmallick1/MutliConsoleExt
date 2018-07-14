using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using MultiConsoleExtension.App_Code;
using System.IO;
using System.Diagnostics;

namespace MultiConsoleExtension.Controllers
{
    public class TraceAnalysisController : ApiController
    {
        public HttpResponseMessage Post()
        {
            //When you submit a request for analysis, also return the ARRAffinityID of the instance where the analysis is being executed. It will help check for the status of this PID
            //Start a new Process on current instance with the command line D:\Program Files (x86)\SiteExtensions\DaaS\<<LatestVersion>>\bin\DiagnosticTools\clrprofiler\CLRProfilingAnalyzer.exe "c:\sometime.diagsession" "d:\output" and return the current ARRID and PID
            //To find the latest version, look for files of extension *.installed. Pick up the latest file. The folder name is the same as the name of file minus the file extension. This will be your latest installed analyzer


            if (Path.GetExtension(System.Web.HttpContext.Current.Request.Files[0].FileName).ToLower() == "diagsession")
            {
                #region Get path to the latest installed version of CLRProfilingAnalyzer.exe
                DirectoryInfo dirInfo = new DirectoryInfo(@"D:\Program Files (x86)\SiteExtensions\DaaS\");
                string analyzerEXEPath = dirInfo.GetFiles("*.installed", SearchOption.TopDirectoryOnly).OrderByDescending(f => f.LastWriteTime).FirstOrDefault().FullName;
                analyzerEXEPath = analyzerEXEPath.ToLower().Replace(".installed", "") + @"\bin\DiagnosticTools\clrprofiler\CLRProfilingAnalyzer.exe";
                #endregion

                FileSystemHelper.EnsureFolderStructure();
                string traceSaveFolder = Path.Combine(FileSystemHelper.DirectoryPathFor(FileSystemHelper.ProxyAction.ProfilerReport), System.DateTime.Now.ToString("yyyy-MM-dd_hh-mm-ss-fffff"));
                string fullTracePath = Path.Combine(traceSaveFolder, System.Web.HttpContext.Current.Request.Files[0].FileName);
                Directory.CreateDirectory(traceSaveFolder);
                System.Web.HttpContext.Current.Request.Files[0].SaveAs(fullTracePath);


                if (Request.RequestUri.Host.ToLower() != "localhost")
                {
                    Process traceAnalyzerProcess = new Process();
                    traceAnalyzerProcess.StartInfo = new ProcessStartInfo(analyzerEXEPath, "\"" + fullTracePath + "\" \"" + traceSaveFolder + "\"");
                    traceAnalyzerProcess.Start();
                    string curAffinityId = Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID");
                    int PID = traceAnalyzerProcess.Id;
                    string responseString = "https://" + Request.RequestUri.Host + "/InstanceDetective/api/TraceAnalysis/" + PID + "/" + curAffinityId;
                    return Request.CreateResponse(HttpStatusCode.OK, responseString);
                }
                else
                {
                    //This part will run only when I am testing the app locally
                    //Intentionally performing this test to check for localhost in the URL later so that I can test file save and rest of the logic locally
                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, new Exception("Test this only on Azure"));
                }

            }
            else
            {
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "File should be a .diagsession file");
            }            
        }


        [Route("api/TraceAnalysis/{PID}/{ArrAffinity}")]
        public HttpResponseMessage Get(int PID, string ArrAffinity)
        {
            return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, new Exception("Yet to implement this. Look for PID : " + PID + " on Instance : " + ArrAffinity));
        }
    }
}
