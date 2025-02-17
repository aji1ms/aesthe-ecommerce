const express = require("express");
 const router = express.Router();
 const adminController = require("../controllers/admin/adminController");


 router.get("/adminlogin",adminController.loadLogin);
 router.post("/admin-login",adminController.login);

 router.get('/',adminController.loadDashboard);


 
 module.exports = router;