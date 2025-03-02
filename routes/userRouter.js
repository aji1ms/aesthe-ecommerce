const express = require('express');
const router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
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




module.exports = router;