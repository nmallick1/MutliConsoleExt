using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using MultiConsoleExtension.Models;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using System.IO;
using System.Net.Http.Headers;
using MultiConsoleExtension.App_Code;

namespace MultiConsoleExtension.Controllers
{
    public class ProfileController : ApiController
    {

        [HttpPost]
        public HttpResponseMessage Post(JObject input)
        {
            if (input == null)
            {
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "Pass the ProfileModel");
            }
            else
            {
                ProfileModel profilingParams = new ProfileModel();
                profilingParams = input.ToObject<ProfileModel>();
                if (profilingParams.PID > 0)
                {

                    if (profilingParams.ActionRequested == ProfileModel.Action.Start)
                    {
                        #region Start Profiling
                        string url = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, "/api/processes/" + profilingParams.PID + "/profile/" + profilingParams.ActionRequested);
                        //if (url.IndexOf(".scm.azurewebsites.net") < 1)
                        //{
                        //    url = "https://nmallickSiteExt.scm.azurewebsites.net/api/processes/" + profilingParams.PID + "/profile/" + profilingParams.ActionRequested;
                        //}
                        //HTTP POST REQUEST
                        using (var client = new WebClient())
                        {
                            if (profilingParams.ProfileIIS)
                            {
                                url += "?iisProfiling=true";
                            }
                            string result = "";
                            client.Headers[HttpRequestHeader.ContentType] = "application/json";
                            client.Headers[HttpRequestHeader.Authorization] = profilingParams.AuthHeader;
                            client.Headers[HttpRequestHeader.Cookie] = "ARRAffinity=" + profilingParams.ARRAffinity; //If invalid cookie value is passed then the request will be load balanced and sent to a random worker which may or may not have the same PID

                            try
                            {
                                result = client.UploadString(url, "POST", "");
                            }
                            catch (Exception e)
                            {
                                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, "There was an error returned from the server : " + e.Message);
                            }
                            return Request.CreateResponse(HttpStatusCode.OK, result);
                        }
                        #endregion
                    }
                    else
                    {
                        if (profilingParams.ActionRequested == ProfileModel.Action.Stop)
                        {
                            #region Stop Profiling
                            //HTTP GET REQUEST to stop the trace and download the trace file
                            string url = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, "/api/processes/" + profilingParams.PID + "/profile/" + profilingParams.ActionRequested);
                            //if (url.IndexOf(".scm.azurewebsites.net") < 1)
                            //{
                            //    url = "https://nmallickSiteExt.scm.azurewebsites.net/api/processes/" + profilingParams.PID + "/profile/" + profilingParams.ActionRequested;
                            //}

                            using (var client = new WebClient())
                            {

                                client.Headers[HttpRequestHeader.ContentType] = "application/json";
                                client.Headers[HttpRequestHeader.Authorization] = profilingParams.AuthHeader;
                                client.Headers[HttpRequestHeader.Cookie] = "ARRAffinity=" + profilingParams.ARRAffinity; //If invalid cookie value is passed then the request will be load balanced and sent to a random worker which may or may not have the same PID

                                try
                                {
                                    //Save the profiler trace on disk inside the folder ProfilerTrace here instead of passing it back in response from memory and respond back with the file name                                    

                                    FileSystemHelper.EnsureFolderStructure();                                    

                                    string profilerTraceFileName = ".diagsession";

                                    if (profilingParams.ProfileIIS)
                                    {
                                        profilerTraceFileName = "_IIS" + profilerTraceFileName;
                                    }
                                    profilerTraceFileName = "Profiler_" + System.DateTime.Now.Ticks.ToString() + "_PID_" + profilingParams.PID.ToString() + profilerTraceFileName;

                                    client.DownloadFile(url, FileSystemHelper.DirectoryPathFor(FileSystemHelper.ProxyAction.ProfilerTrace) + @"\" + profilerTraceFileName);

                                    //(profilerTraceFilePath) will most likely be the following
                                    //D:\home\site\siteextensions\InstanceDetective\ProfilerTrace
                                    //return path should be /site/siteextensions/InstanceDetective/ProfilerTrace/ DO NOT FORGET THE '/' AT THE END OF THE PATH

                                    return Request.CreateResponse(HttpStatusCode.OK, (FileSystemHelper.DirectoryPathFor(FileSystemHelper.ProxyAction.ProfilerTrace) + @"\" + profilerTraceFileName).Replace(@"D:\home\", "").Replace(@"\", "/"));

                                    //HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
                                    //response.Content = new ByteArrayContent(client.DownloadData(url));
                                    //response.Content.Headers.ContentDisposition = new System.Net.Http.Headers.ContentDispositionHeaderValue("attachment");
                                    //response.Content.Headers.ContentDisposition.FileName = "profile_" + System.DateTime.Now.Ticks + "_w3wp_" + profilingParams.PID.ToString() + ".diagsession";
                                    //response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
                                    //return response;
                                }
                                catch (Exception e)
                                {
                                    return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, "Error Returned by Kudu : Exception : " + e.Message);
                                }
                            }
                            #endregion
                        }
                        else
                        {
                            if (profilingParams.ActionRequested == ProfileModel.Action.Info)
                            {
                                #region Get Process Info
                                //Populate a list of ProcessModel objects for this site and return the data
                                string url = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, "/api/processes/");
                                //if (url.IndexOf(".scm.azurewebsites.net") < 1)
                                //{
                                //    url = "https://nmallickSiteExt.scm.azurewebsites.net/api/processes/";
                                //}

                                using (WebClient client = new WebClient())
                                {
                                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                                    client.Headers[HttpRequestHeader.Authorization] = profilingParams.AuthHeader;
                                    client.Headers[HttpRequestHeader.Cookie] = "ARRAffinity=" + profilingParams.ARRAffinity; //If invalid cookie value is passed then the request will be load balanced and sent to a random worker which may or may not have the same PID

                                    string result = string.Empty;
                                    KuduProcess[] processList;
                                    try
                                    {
                                        result = client.DownloadString(url);
                                    }
                                    catch (Exception e)
                                    {
                                        return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, "An error occurred while getting the process list from Kudu : " + e.Message + " Auth Header: " + profilingParams.AuthHeader);
                                    }
                                    processList = JsonConvert.DeserializeObject<KuduProcess[]>(result);
                                    List<ProcessModel> response = new List<ProcessModel>();
                                    foreach (KuduProcess process in processList)
                                    {
                                        ProcessModel currProcess = new ProcessModel();
                                        using (WebClient childClient = new WebClient())
                                        {
                                            childClient.Headers[HttpRequestHeader.ContentType] = "application/json";
                                            childClient.Headers[HttpRequestHeader.Authorization] = profilingParams.AuthHeader;
                                            childClient.Headers[HttpRequestHeader.Cookie] = "ARRAffinity=" + profilingParams.ARRAffinity; //If invalid cookie value is passed then the request will be load balanced and sent to a random worker which may or may not have the same PID

                                            string processInfo = childClient.DownloadString(process.href);
                                            JObject obj = JsonConvert.DeserializeObject<JObject>(processInfo);

                                            //To access value that is retruned as an Array in the response.
                                            //Does not work for nested array's
                                            //JObject.FromObject(obj.Value<object>("environment_variables")).Value<string>("APPDATA") 



                                            currProcess.MachineName = JObject.FromObject(obj.Value<object>("environment_variables")).Value<string>("COMPUTERNAME");
                                            currProcess.InstanceId = JObject.FromObject(obj.Value<object>("environment_variables")).Value<string>("WEBSITE_INSTANCE_ID");
                                            currProcess.PID = obj.Value<int>("id");
                                            currProcess.ProcessName = obj.Value<string>("name");
                                            currProcess.Site = JObject.FromObject(obj.Value<object>("environment_variables")).Value<string>("WEBSITE_HOSTNAME");
                                            currProcess.isKudu = obj.Value<bool>("is_scm_site");
                                            currProcess.MiniDumpURI = obj.Value<string>("minidump");
                                            currProcess.ProfileTimeoutSec = obj.Value<int>("iis_profile_timeout_in_seconds");
                                            response.Add(currProcess);
                                        }
                                    }

                                    return Request.CreateResponse(HttpStatusCode.OK, response);
                                }
                                #endregion
                            }
                            else
                            {

                                if (profilingParams.ActionRequested == ProfileModel.Action.Kill)
                                {
                                    #region Kill Process
                                    //HTTP GET REQUEST to stop the trace and download the trace file
                                    string url = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, "/api/processes/" + profilingParams.PID);
                                    //if (url.IndexOf(".scm.azurewebsites.net") < 1)
                                    //{
                                    //    url = "https://nmallickSiteExt.scm.azurewebsites.net/api/processes/" + profilingParams.PID;
                                    //}

                                    using (var client = new WebClient())
                                    {

                                        client.Headers[HttpRequestHeader.ContentType] = "application/json";
                                        client.Headers[HttpRequestHeader.Authorization] = profilingParams.AuthHeader;
                                        client.Headers[HttpRequestHeader.Cookie] = "ARRAffinity=" + profilingParams.ARRAffinity; //If invalid cookie value is passed then the request will be load balanced and sent to a random worker which may or may not have the same PID
                                        string resp = "";
                                        try
                                        {
                                            resp = client.UploadString(url, "DELETE", "");
                                        }
                                        catch (Exception e)
                                        {
                                            Request.CreateErrorResponse(HttpStatusCode.InternalServerError, "Error Returned by Kudu " + resp + " Exception : " + e.Message);
                                        }

                                        return Request.CreateResponse(HttpStatusCode.OK, "Process " + profilingParams.PID + " terminated.");
                                    }
                                    #endregion
                                }
                                else
                                {
                                    #region Undefined Action
                                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "Invalid action requested. Allowed actions are Start, Stop, Info & Kill");
                                    #endregion
                                }
                            }
                        }
                    }
                }
                else
                {
                    return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, "Unable to execute PreDefined Actions. Please pass a positive number for the PID. Passed PID was " + profilingParams.PID.ToString());
                }
            }
        }
    }
}
