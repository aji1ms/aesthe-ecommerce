const express = require('express');
const router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const passport = require('passport');
const { userAuth } = require('../middlewares/auth');


// --Error Page--

router.get('/pageNotFound', userController.pageNotFound);

// --signup Page--

router.get('/', userController.loadHomepage);
router.get('/signup', userController.loadSignup);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    req.session.userData = {
        _id: req.user._id,
        email: req.user.email,
        name: req.user.name,
    }
    res.redirect('/');
})

router.get('/register', userController.loadRegisterpage);
router.post('/register', userController.register);

router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);

router.get('/login', userController.loadloginpage);
router.post('/login', userController.login);
router.get('/logout', userController.logout);

// --Shopping Page--

router.get('/shop', userController.loadShoppingPage);

// --Filter Page--

router.get('/filter', userController.filterProducts);
router.get('/filterPrice', userController.filterByPrice);
router.post('/search', userController.searchProducts);

// --Profile Management--

router.get('/forgot-password', profileController.getForgotPasswordPage);
router.post('/forgot-email-valid', profileController.forgotEmailValid);
router.post('/verify-passForgot-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-forgot-otp', profileController.resendOtp);
router.post('/reset-password', profileController.postNewPassword);
router.get("/userProfile", userAuth, profileController.userProfile);
router.get("/change-email", userAuth, profileController.changeEmail);
router.post("/change-email", userAuth, profileController.changeEmailValid);
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/update-email", userAuth, profileController.updateEmail);
router.get('/change-password', userAuth, profileController.changePassword);
router.post('/change-password', userAuth, profileController.changePasswordValid);
router.post('/verify-changePassword-otp', userAuth, profileController.verifyChangePasswordOtp);

// --Address Management--

router.get('/address', userAuth, profileController.loadAddressPage);
router.get('/addAddress', userAuth, profileController.addAddress);
router.post('/addAddress', userAuth, profileController.postAddAddress);
router.get('/editAddress', userAuth, profileController.editAddress);
router.post('/editAddress', userAuth, profileController.postEditAddress);
router.get('/deleteAddress', userAuth, profileController.deleteAddress);

// --Product Management--

router.get("/productDetails", productController.productDetails);




module.exports = router;