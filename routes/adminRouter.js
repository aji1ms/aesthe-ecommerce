const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController");
const couponController = require("../controllers/admin/couponController");
const salesController = require("../controllers/admin/salesController");
const dashboardController = require("../controllers/admin/dashboardController");
const { userAUth, adminAuth } = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({ storage: storage });

// --Login Management--

router.get("/adminlogin", adminController.loadLogin);
router.post("/admin-login", adminController.login);
router.get('/', adminAuth, dashboardController.loadAdminDashboard);
router.get('/logout', adminController.logout)
router.get("/errorpage", adminController.pageError)

// --Customer Management--

router.get("/users", adminAuth, customerController.customerInfo)
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerUnblocked)

// --Category Management--

router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer);
router.get("/listCategory", adminAuth, categoryController.getlistCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);

// --Category Management--

router.get("/brands", adminAuth, brandController.getBrandPage);
router.post("/addBrand", adminAuth, uploads.single("image"), brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unblockBrand", adminAuth, brandController.unblockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);

// --Product Management--

router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/addProducts", adminAuth, uploads.array("images", 4), productController.addProducts);
router.get('/products', adminAuth, productController.getAllProducts);
router.post('/addProductOffer', adminAuth, productController.addProductOffer);
router.post('/removeProductOffer', adminAuth, productController.removeProductOffer);
router.get('/blockProduct', adminAuth, productController.blockProduct);
router.get('/unblockProduct', adminAuth, productController.unblockProduct);
router.get('/editProduct', adminAuth, productController.getEditProduct);
router.post('/editProduct/:id', adminAuth, uploads.array("images", 4), productController.editProduct);
router.post('/deleteImage', adminAuth, productController.deleteSingleImage);

// --Coupon Management--

router.get('/coupon', adminAuth, couponController.loadCoupon);
router.post('/createCoupon', adminAuth, couponController.createCoupon);
router.get('/editCoupon', adminAuth, couponController.loadEditCoupon)
router.post('/updateCoupon', adminAuth, couponController.updateCoupon);
router.get('/deleteCoupon', adminAuth, couponController.deleteCoupon)

// --Order Management--

router.get("/orderList", adminAuth, orderController.listOrders);
router.get("/orderView/:orderId", adminAuth, orderController.viewOrderDetailPage);
router.post("/orderView/:orderId", adminAuth, orderController.updateOrderStatus);
router.post('/refund', adminAuth, orderController.addRefund);

// --Sales Report--

router.get('/sales', adminAuth, salesController.loadSales);
router.get('/sales/pdf', adminAuth, salesController.downloadSalesPdf);


module.exports = router;