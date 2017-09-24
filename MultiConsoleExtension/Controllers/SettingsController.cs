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
using System.Xml;

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
            var userSettingsFile = userSettingsDir + @"\siteConnectionSetttings.json";

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


        public HttpResponseMessage Post()
        {
            SiteSettings siteSettings = new SiteSettings();
            if(System.Web.HttpContext.Current.Request.Files.Count > 0)
            {
                XmlDocument publishProfileDoc = new XmlDocument();
                publishProfileDoc.Load(System.Web.HttpContext.Current.Request.Files[0].InputStream);
                XmlNode publishProfile = publishProfileDoc.GetElementsByTagName("publishProfile").Item(0);
                if (publishProfile.Attributes["userName"]!=null)
                {
                    siteSettings.UserName = publishProfile.Attributes["userName"].Value;
                }

                if (publishProfile.Attributes["userPWD"] != null)
                {
                    siteSettings.Password = publishProfile.Attributes["userPWD"].Value;
                }

                if(!string.IsNullOrEmpty(siteSettings.UserName) && !string.IsNullOrEmpty(siteSettings.Password))
                {
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
                else
                {
                    return Request.CreateResponse(HttpStatusCode.BadRequest, "Unable to read usename / password from uploaded file");
                }
            }
            else
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest, "");
            }
        }
    }
}
