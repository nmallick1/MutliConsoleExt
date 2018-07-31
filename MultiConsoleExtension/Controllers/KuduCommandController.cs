using MultiConsoleExtension.App_Code;
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
            //string authSettingFromWhere = "";
            string command = input.Value<string>("command");
            string workingDirectory = input.Value<string>("dir");
            string ARRAffinity = input.Value<string>("ARRAffinity");

            string AuthHeader = string.Empty;
            
            if (string.IsNullOrEmpty(siteSetting.AuthHeader))
            {

                FileSystemHelper.EnsureFolderStructure();
                if (File.Exists(FileSystemHelper.UserSettingsFileFullPath))
                {
                    string strSettings = File.ReadAllText(FileSystemHelper.UserSettingsFileFullPath);
                    siteSetting = JsonConvert.DeserializeObject<SiteSettings>(strSettings);                    
                    AuthHeader = siteSetting.AuthHeader;
                    //authSettingFromWhere = "Auth Header from FileSystem: " + AuthHeader;
                }
                else
                {
                    IEnumerable<string> headerValues;
                    if(Request.Headers.TryGetValues("Authorization",out headerValues))
                    {
                        AuthHeader = headerValues.FirstOrDefault();
                        //authSettingFromWhere = "Auth Header from request header Authorization: " + AuthHeader;
                    }                    
                }
            }
            else
            {                
                AuthHeader = siteSetting.AuthHeader;
                //authSettingFromWhere = "Auth Header from Static variable siteSetting: " + AuthHeader;
            }
            if(string.IsNullOrEmpty(AuthHeader))
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest,"Unable to get the Publish Credentials to issue this command");
            }
            



            string url = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, "/command");


            //Uncomment this section only when testing locally. Make sure to comment this during build else this will break when site is not browsed via Azurewebsites URL (especially in case of ILB ASE)
            #region Redirect to local proxy and not Kudu
            //if (url.IndexOf(".azurewebsites.net") < 1)
            //{
            //    url = "https://nmallickSiteExt.scm.azurewebsites.net/command";
            //}
            
            #endregion

            string jsonBody = input.ToString();
            string result = "";


            using (var client = new WebClient())
            {
                ServicePointManager.ServerCertificateValidationCallback += (sender, certificate, chain, sslPolicyErrors) => true;
                //string reqContent = "";
                client.Headers[HttpRequestHeader.ContentType] = "application/json";
                client.Headers[HttpRequestHeader.Authorization] = AuthHeader;
                client.Headers[HttpRequestHeader.Cookie] = "ARRAffinity=" + ARRAffinity; //If invalid cookie value is passed then the request will be load balanced and sent to a random worker

                //reqContent += "url:" + url + ", ContentType : application/json, Cookie: ARRAffinity=" + ARRAffinity + ", Authorization:" + AuthHeader + ", PostBody:" + jsonBody + ", "  + authSettingFromWhere;
                //return Request.CreateResponse(HttpStatusCode.BadRequest, reqContent);

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
