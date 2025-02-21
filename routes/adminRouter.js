const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const { userAUth, adminAuth } = require("../middlewares/auth");


router.get("/adminlogin", adminController.loadLogin);
router.post("/admin-login", adminController.login);

router.get('/', adminAuth, adminController.loadDashboard);

router.get('/logout',adminController.logout)

router.get("/errorpage", adminController.pageError)

router.get("/users",adminAuth,customerController.customerInfo)

router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerUnblocked)



module.exports = router;