using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;

namespace MultiConsoleExtension.App_Code
{
    public static class FileSystemHelper
    {
        public static void EnsureFolderStructure()
        {
            if (!Directory.Exists(RootPath))
            {
                Directory.CreateDirectory(RootPath);
            }

            foreach (string action in Enum.GetNames(typeof(ProxyAction)))
            {
                if(!Directory.Exists(DirectoryPathFor((ProxyAction)Enum.Parse(typeof(ProxyAction), action))))
                {
                    Directory.CreateDirectory(DirectoryPathFor((ProxyAction)Enum.Parse(typeof(ProxyAction), action)));
                }                
            }
        }

        public static string RootPath
        {
            get {
                var _rootPath = Environment.GetEnvironmentVariable("HOME"); // For use on Azure Websites
                if (_rootPath == null)
                {
                    _rootPath = System.IO.Path.GetTempPath(); // For testing purposes
                };
                return Path.Combine(_rootPath, @"site\siteextensions\InstanceDetective");
            }
        }

        public  enum ProxyAction {
            FullDump,
            MiniDump,
            ProfilerTrace,
            ProfilerReport
        }

        public static string DirectoryPathFor(ProxyAction action) {
            return RootPath + @"\" + action;
        }

        public static string UserSettingsFileName { get { return "siteConnectionSettings.json"; } }
        public static string UserSettingsFileFullPath { get { return RootPath + @"\" + UserSettingsFileName; } }

    }
}