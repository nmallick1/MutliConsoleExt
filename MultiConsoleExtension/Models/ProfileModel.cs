using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MultiConsoleExtension.Models
{
    public class ProfileModel
    {
        public string ARRAffinity { get; set; }
        public string AuthHeader { get; set; }
        public int PID { get; set; }
        public bool ProfileIIS { get; set; }
        public enum Action {Start , Stop, Info, MiniDump, FullDump, Kill};
        public Action ActionRequested { get; set; }

        public ProfileModel()
        {
            this.ARRAffinity = string.Empty;
            this.AuthHeader = string.Empty;
            this.PID = 0;
            this.ProfileIIS = false;
            this.ActionRequested = Action.Stop;
        }
    }
}