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
                if(profilingParams.PID > 0)
                {                                        

                    if (profilingParams.ActionRequested == ProfileModel.Action.Start)
                    {
                        string url = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, "/api/processes/" + profilingParams.PID + "/" + profilingParams.ActionRequested);
                        if (url.IndexOf(".scm.azurewebsites.net") < 1)
                        {
                            url = "https://nmallickSiteExt.scm.azurewebsites.net/api/processes/" + profilingParams.PID + "/profile/" + profilingParams.ActionRequested;
                        }
                        //HTTP POST REQUEST
                        using (var client = new WebClient())
                        {
                            if(profilingParams.ProfileIIS)
                            {
                                url += "?iisProfiling=true";
                            }
                            string result = "";
                            client.Headers[HttpRequestHeader.ContentType] = "application/json";
                            client.Headers[HttpRequestHeader.Authorization] = profilingParams.AuthHeader;
                            client.Headers[HttpRequestHeader.Cookie] = "ARRAffinity=" + profilingParams.ARRAffinity; //If invalid cookie value is passed then the request will be load balanced and sent to a random worker which may or may not have the same PID

                            try {
                                result = client.UploadString(url, "POST", "");
                            }
                            catch(Exception e)
                            {
                                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, "There was an error returned from the server : " + e.Message);
                            }                            
                            return Request.CreateResponse(HttpStatusCode.OK, result);                                                                                    
                        }
                    }
                    else
                    {
                        if(profilingParams.ActionRequested == ProfileModel.Action.Stop)
                        {
                            //HTTP GET REQUEST to stop the trace and download the trace file
                            string url = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, "/api/processes/" + profilingParams.PID + "/" + profilingParams.ActionRequested);
                            if (url.IndexOf(".scm.azurewebsites.net") < 1)
                            {
                                url = "https://nmallickSiteExt.scm.azurewebsites.net/api/processes/" + profilingParams.PID + "/profile/" + profilingParams.ActionRequested;
                            }

                            using (var client = new WebClient())
                            {

                                client.Headers[HttpRequestHeader.ContentType] = "application/json";
                                client.Headers[HttpRequestHeader.Authorization] = profilingParams.AuthHeader;
                                client.Headers[HttpRequestHeader.Cookie] = "ARRAffinity=" + profilingParams.ARRAffinity; //If invalid cookie value is passed then the request will be load balanced and sent to a random worker which may or may not have the same PID
                                
                                
                                HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
                                response.Content = new ByteArrayContent(client.DownloadData(url));
                                response.Content.Headers.ContentDisposition = new System.Net.Http.Headers.ContentDispositionHeaderValue("attachment");
                                response.Content.Headers.ContentDisposition.FileName = "profile_" + System.DateTime.Now.Ticks + "_w3wp_" + profilingParams.PID.ToString() + ".diagsession";
                                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
                                return response;                                
                            }
                        }
                        else
                        {
                            if (profilingParams.ActionRequested == ProfileModel.Action.Info)
                            {
                                //Populate a list of ProcessModel objects for this site and return the data
                                string url = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, "/api/processes/");
                                if (url.IndexOf(".scm.azurewebsites.net") < 1)
                                {
                                    url = "https://nmallickSiteExt.scm.azurewebsites.net/api/processes/";
                                }

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
                                    catch(Exception e)
                                    {
                                        return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, "An error occurred while getting the process list from Kudu : " + e.Message);
                                    }
                                    processList = JsonConvert.DeserializeObject<KuduProcess[]>(result);
                                    List<ProcessModel> response = new List<ProcessModel>();
                                    foreach(KuduProcess process in processList)
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
                            }
                            else
                            {
                                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "Invalid action requested. Allowed actions are Start, Stop");
                            }
                        }
                    }
                }
                return Request.CreateResponse(HttpStatusCode.OK, "");
            }
        }
    }
}
