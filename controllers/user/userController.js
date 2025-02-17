
const { Session } = require("express-session");
const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");
const env = require("dotenv").config();

// ---Home page---

const loadHomepage = async (req, res) => {
    try {
        const user = req.session.userData;
        console.log(user)
        if (user) {
            const userData = await User.findOne({ _id: user._id });
            res.render("home", { user: userData });
        } else {
            return res.render('home');
        }
    } catch (error) {
        console.log("Home Page Not Found", error)
        res.status(500).redirect("/pageNotFound")
    }
}

// ---Signup page---

const loadSignup = async (req, res) => {
    try {
        res.render("signup");
    } catch (error) {
        console.log("Sign Up page Loading Error", error)
        res.status(500).redirect("/pageNotFound")
    }
}

// ---Register page---

const loadRegisterpage = async (req, res) => {
    try {
        res.render("register")
    } catch (error) {
        console.log("Register Page Loading Error", error);
        res.status(500).redirect('/pageNotFound');

    }
}

// ---Register otp generation---

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        })

        return info.accepted.length > 0;

    } catch (error) {
        console.error("Error sending email,", error);
        return false;
    }
}

// ---user registration---

const register = async (req, res) => {

    try {

        const { name, email, phone, password, cPassword } = req.body;
        console.log("Registration attempt with password:", password);

        if (password != cPassword) {
            return res.render("register", { message: "Password do not match" });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("register", { message: "Email already exists" })
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email-error")
        }

        req.session.otp = otp;
        req.session.userData = { name, email, phone, password };

        res.render("verify-otp");
        console.log("OTP Sent :", otp);

    } catch (error) {
        console.log("Register Error", error);
        res.redirect("/pageNotFound");
    }
}


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const storedOTP = req.session.otp;
        const userData = req.session.userData;

        console.log("Received OTP from user:", otp);
        console.log("Stored OTP in session:", req.session.otp);
        console.log("Stored User Data:", req.session.userData);


        if (otp !== storedOTP) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid OTP. Please try again.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        const saveUserData = new User({
            name: userData.name,
            phone: userData.phone,
            email: userData.email,
            password: hashedPassword,
            isVerified: true
        });

        await saveUserData.save();

        // Clear session data
        req.session.otp = null;
        req.session.userData = null;
        req.session.otpTimestamp = null;

        return res.status(200).json({
            status: 'success',
            message: 'Account verified successfully!',
            redirectUrl: '/login'
        });

    } catch (error) {
        console.error("OTP verification error:", error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to verify OTP.'
        });
    }
};

// ---resend OTP ---

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            res.status(400).json({ success: false, message: "Email not found in session" });
        }
        const otp = generateOtp();
        req.session.otp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP : ", otp);
            res.status(200).json({ success: true, message: "OTP Resend Successfully" });
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again" });
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({ success: false, message: "Internal server Error. please try again" });
    }
}

// ---login page---

const loadloginpage = async (req, res) => {
    try {
        if (req.session.userData) {
            return res.redirect('/');
        } else {
            return res.render("login");
        }
    } catch (error) {
        console.log("Login Page Loading Error", error);
        res.status(500).redirect("/pageNotFound")
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });

        // Add logging to debug
        console.log("Login attempt for email:", email);
        console.log("User found:", findUser);

        if (!findUser) {
            return res.render('login', { message: "User not found" });
        }

        if (findUser.isBlocked) {
            return res.render('login', { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        console.log("Password match:", passwordMatch);

        if (!passwordMatch) {
            return res.render('login', { message: "Password incorrect" });
        }

        req.session.userData = {
            _id: findUser._id,
            email: findUser.email,
            name: findUser.name
        };

        return res.redirect("/");

    } catch (error) {
        console.log("Error Login", error);
        return res.render('login', { message: "Login failed. Please try again later" });
    }
}

// ---logout ---

const logout = async (req,res) => {
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destroty error",err.message);
                return res.redirect('/pageNotFound');
            }
            return res.redirect('/login');
        })
    } catch (error) {
        console.log("Logout error",error);
        res.redirect('/pageNotFound');
    }
}

// ---404 page---

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
        console.log("Page-404 Loading Error", error)
        res.status(500).redirect("/pageNotFound")
    }
}


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    loadRegisterpage,
    register,
    verifyOtp,
    resendOtp,
    loadloginpage,
    login,
    logout,
} 