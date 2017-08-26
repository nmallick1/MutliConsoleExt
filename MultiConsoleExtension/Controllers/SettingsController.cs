using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using MultiConsoleExtension.Models;
using Newtonsoft.Json.Linq;
using System.IO;
using Newtonsoft.Json;

namespace MultiConsoleExtension.Controllers
{
    public class SettingsController : ApiController
    {
        public HttpResponseMessage Get()
        {
            var rootPath = Environment.GetEnvironmentVariable("HOME"); // For use on Azure Websites
            if (rootPath == null)
            {
                rootPath = System.IO.Path.GetTempPath(); // For testing purposes
            };
            var userSettingsDir = Path.Combine(rootPath, @"site\siteextensions\MultiConsoleExt");
            var userSettingsFile = userSettingsDir + @"\siteConnectionSettings.json";

            SiteSettings siteSettings = new SiteSettings();
            if (File.Exists(userSettingsFile))
            {
                string strSettings = File.ReadAllText(userSettingsFile);
                siteSettings = JsonConvert.DeserializeObject<SiteSettings>(strSettings);
            }
            else
            {
                siteSettings.UserName = "";
                siteSettings.Password = "";
                siteSettings.AuthHeader = "";
            }
            return Request.CreateResponse(HttpStatusCode.OK, siteSettings);
        }


        public HttpResponseMessage Post(JObject siteSetting)
        {
            if (siteSetting == null)
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest,"POST body not found");
            }
            SiteSettings siteSettings = new SiteSettings();
            siteSettings.UserName = siteSetting.Value<string>("userName");
            siteSettings.Password = siteSetting.Value<string>("password");
            if (string.IsNullOrEmpty(siteSettings.UserName) || string.IsNullOrEmpty(siteSettings.Password))
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest, "userName and password must have values in response body");
            }
            else {
                var plainTextBytes = System.Text.Encoding.UTF8.GetBytes(siteSettings.UserName + ":" + siteSettings.Password);
                siteSettings.AuthHeader = "Basic " + System.Convert.ToBase64String(plainTextBytes);

                //Save settings to a local file calles %home%\site\siteextensions\MultiConsoleExt\siteConnectionSettings.json

                var rootPath = Environment.GetEnvironmentVariable("HOME"); // For use on Azure Websites
                if (rootPath == null)
                {
                    rootPath = System.IO.Path.GetTempPath(); // For testing purposes
                };
                var userSettingsDir = Path.Combine(rootPath, @"site\siteextensions\MultiConsoleExt");
                var userSettingsFile = userSettingsDir + @"\siteConnectionSettings.json";

                if (!Directory.Exists(userSettingsDir))
                {
                    Directory.CreateDirectory(userSettingsDir);
                }

                File.WriteAllText(userSettingsFile, JsonConvert.SerializeObject(siteSettings));
                
                return Request.CreateResponse(HttpStatusCode.OK, siteSettings);

            }
        }
    }
}
