using MultiConsoleExtension.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Script.Serialization;


namespace MultiConsoleExtension.Controllers
{    
    public class KuduCommandController : ApiController
    {
        public static SiteSettings siteSetting = new SiteSettings();
        
        [HttpPost]
        public HttpResponseMessage Post(JObject input)
        {
            if (input == null)
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest);
            }

            string command = input.Value<string>("command");
            string workingDirectory = input.Value<string>("dir");
            string ARRAffinity = input.Value<string>("ARRAffinity");

            string AuthHeader = string.Empty;
            
            if (string.IsNullOrEmpty(siteSetting.AuthHeader))
            {
                if (string.IsNullOrEmpty(Request.Headers.GetValues("Authorization").FirstOrDefault()))
                {
                    AuthHeader = Request.Headers.GetValues("Authorization").FirstOrDefault();
                    siteSetting.AuthHeader = AuthHeader;
                }
                else
                {
                    var rootPath = Environment.GetEnvironmentVariable("HOME"); // For use on Azure Websites
                    if (rootPath == null)
                    {
                        rootPath = System.IO.Path.GetTempPath(); // For testing purposes
                    };
                    var userSettingsDir = Path.Combine(rootPath, @"site\siteextensions\MultiConsoleExt");
                    var userSettingsFile = userSettingsDir + @"\siteConnectionSettings.json";

                    
                    if (File.Exists(userSettingsFile))
                    {
                        string strSettings = File.ReadAllText(userSettingsFile);
                        siteSetting = JsonConvert.DeserializeObject<SiteSettings>(strSettings);
                        AuthHeader = siteSetting.AuthHeader;
                    }
                }
            }
            else
            {
                AuthHeader = siteSetting.AuthHeader;
            }
            if(string.IsNullOrEmpty(AuthHeader))
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest,"Unable to get the Publish Credentials to issue this command");
            }
            



            string url = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, "/command");
            if (url.IndexOf(".scm.azurewebsites.net") < 1)
            {
                url = "https://nmallickSiteExt.scm.azurewebsites.net/command";
            }
            
            string jsonBody = input.ToString();
            string result = "";


            using (var client = new WebClient())
            {
                client.Headers[HttpRequestHeader.ContentType] = "application/json";
                client.Headers[HttpRequestHeader.Authorization] = AuthHeader;
                client.Headers[HttpRequestHeader.Cookie] = "ARRAffinity=" + ARRAffinity; //If invalid cookie value is passed then the request will be load balanced and sent to a random worker
                result = client.UploadString(url, "POST", jsonBody);

                KuduResponse resp = JsonConvert.DeserializeObject<KuduResponse>(result);
                string cookieVal = client.ResponseHeaders["Set-Cookie"];
                if (!string.IsNullOrEmpty(cookieVal))
                {
                    resp.ARRAffinity = cookieVal.Split(';')[0].Split('=')[1];
                }
                return Request.CreateResponse(HttpStatusCode.OK, resp);
            }
        }
    }
}
