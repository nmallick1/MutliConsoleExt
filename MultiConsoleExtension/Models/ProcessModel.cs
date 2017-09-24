using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MultiConsoleExtension.Models
{
    public class ProcessModel
    {
        public string MachineName { get; set; } //Get this from Env Variable: COMPUTERNAME
        public string InstanceId { get; set; } //Get this from Env Variable : WEBSITE_INSTANCE_ID:
        public int PID { get; set; } //property name : id=2796
        public string ProcessName { get; set; }//property name : name=w3wp
        public bool isKudu { get; set; } //property name : is_scm_site=True
        public string Site { get; set; } //Get this from Env Variable: website_hostname
        public string FullDumpURI { get { return this.MiniDumpURI + "?dumpType=2048"; } } // MiniDumpURI + "?dumpType=2048" https://blogs.msdn.microsoft.com/jpsanders/2017/02/02/how-to-get-a-full-memory-dump-in-azure-app-services/
        public string MiniDumpURI { get; set; } //property name : minidump=https://nmallicksiteext.scm.azurewebsites.net/api/processes/2796/dump
        public int ProfileTimeoutSec { get; set; } //property name : iis_profile_timeout_in_seconds=180

        public ProcessModel()
        {
            this.MachineName = string.Empty;
            this.InstanceId = string.Empty;
            this.PID = 0;
            this.ProcessName = string.Empty;
            this.isKudu = true;
            this.Site = string.Empty;
            this.MiniDumpURI = string.Empty;
            this.ProfileTimeoutSec = 0;
        }
    }

    public class KuduProcess
    {
        public string href { get; set; }
        public int id { get; set; }
        public string name { get; set; }
        public string user_name { get; set; }
    }
}