﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace JSDstr.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            ViewBag.UseJumbotron = true;
            return View();
        }

        public ActionResult About()
        {
            ViewBag.RenderStatistics = true;
            //ViewBag.UseJumbotron = true;
            return View("About");
        }
    }
}
