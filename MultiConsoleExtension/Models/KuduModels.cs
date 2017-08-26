using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MultiConsoleExtension.Models
{

    public class KuduResponse
    {
        public string Output { get; set; }
        public string Error { get; set; }
        public int ExitCode { get; set; }
        public string ARRAffinity { get; set; }

        public KuduResponse()
        {
            this.Output = string.Empty;
            this.Error = string.Empty;
            this.ExitCode = -1;
            this.ARRAffinity = string.Empty;
        }
    }

    public class SiteSettings
    {
        public string UserName { get; set; }
        public string Password { get; set; }
        public string AuthHeader { get; set; }

        public SiteSettings()
        {
            this.UserName = string.Empty;
            this.Password = string.Empty;
            this.AuthHeader = string.Empty;
        }
    }
}