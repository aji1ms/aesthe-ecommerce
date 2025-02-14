const express = require('express');
const router = express.Router();
const userController = require("../controllers/user/userController");


router.get('/', userController.loadHomepage);
router.get('/signup', userController.loadSignup);

router.get('/register', userController.loadRegisterpage);
router.post('/register', userController.register);

router.get('/login',userController.loadloginpage);
router.get('/pageNotFound', userController.pageNotFound);

module.exports = router;