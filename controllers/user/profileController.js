const { Session } = require("express-session");
const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { render } = require("ejs");
const env = require("dotenv").config();


function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP: ${otp}</h4></b>`
        }

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sentt: ", info.messageId);
        return true;

    } catch (error) {
        console.log("Error sending Email: ", error);
        return false;
    }

}

const securePassword = async (password) => {
    try {

        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;

    } catch (error) {
        console.error("Error hashing password:", error);
        throw error;
    }
}

// ---Forgot Password page---

const getForgotPasswordPage = async (req, res) => {
    try {
        res.render("forgot-password")
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

// ---Forgot Password Email Validate---

const forgotEmailValid = async (req, res) => {
    try {

        const { email } = req.body;
        const findUser = await User.findOne({ email: email })
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgot-pass-otp");
                console.log("ForgotPassword OTP: ", otp);
            } else {
                res.json({ success: false, message: "Failed to sent OTP. Please try again" });
            }
        } else {
            res.render("forgot-password", {
                message: "User with this email does not exist"
            })
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

// ---OTP verification forgot password---

const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        const storedOtp = req.session.userOtp;

        if (!storedOtp) {
            return res.json({ success: false, message: "OTP expired or not found. Please resend OTP." });
        }

        if (enteredOtp === storedOtp) {

            res.json({ success: true, redirectUrl: "/reset-password" });
        } else {
            res.json({ success: false, message: "OTP not matching" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
};

// ---Reset Password page---

const getResetPassPage = async (req, res) => {
    try {
        res.render("reset-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

// ---Resend OTP---

const resendOtp = async (req, res) => {
    try {

        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending OTP to email: ", email);
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP: ", otp);
            res.status(200).json({ success: true, message: "Resend OTP succesfully" });
        }

    } catch (error) {
        console.log("Error sending resend OTP: ", error);
        res.status(500).json({ success: false, message: "Intermal Server Error" });
    }
}

// ---New Password---

const postNewPassword = async (req, res) => {
    try {

        const { newPass1, newPass } = req.body;
        const email = req.session.email;
        if (newPass1 == newPass) {
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                { email: email },
                { $set: { password: passwordHash } }
            )
            res.redirect("/login");
        } else {
            res.render("reset-password", { message: 'Password do not match' });
        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

// ---userProfile page---

const userProfile = async (req, res) => {
    try {

        const userData = req.session.userData;
        res.render("profile", {
            user: userData,
        })

    } catch (error) {
        console.log("Error retrieving profileData", error);
        res.redirect("/pageNotFound");
    }
}

// ---User Email Change---

const changeEmail = async (req, res) => {
    try {
        res.render("change-email")
    } catch (error) {
        res.redirect("pageNotFound")
    }
}

// ---User Email Change validation---

const changeEmailValid = async (req, res) => {
    try {

        const { email } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-email-otp");
                console.log("Emaill Sent: ", email);
                console.log("Otp in session: ", req.session.userOtp)
                console.log("Email Change OTP: ", otp);

            } else {
                res.json("email-error");
            }
        } else {
            res.render("change-email", {
                message: "user with this email not exists"
            });
        }

    } catch (error) {
        res.redirect("pageNotFound")
    }
}

// ---User Email Change OTP verification---

const verifyEmailOtp = async (req, res) => {
    try {

        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            req.session.userData = req.body.userData;
            res.render("new-email", {
                userData: req.session.userData,
            })
        } else {
            res.render("change-email-otp", {
                message: "OTP not matching",
                userData: req.session.userData
            })
        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

// ---User new Email---

const updateEmail = async (req, res) => {
    try {

        const newEmail = req.body.newEmail;
        const userId = req.session.user;
        await User.findByIdAndUpdate(userId, { email: newEmail });
        res.redirect("/userProfile")

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

// ---Password Change---

const changePassword = async (req, res) => {
    try {
        res.render("change-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

// ---Password Change Validate---

const changePasswordValid = async (req, res) => {
    try {

        const { email } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp)

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp");
                console.log("OTP stored in section: ", req.session.userOtp)
                console.log("Password Change OTP: ", otp);
            } else {
                res.json({
                    success: false,
                    message: "Failed to send OTP. Please try again",
                })
            }
        } else {
            res.render("change-password", {
                message: "user with this email does not exists"
            })
        }

    } catch (error) {
        console.log("Error in password change  validation: ", error)
        res.redirect("/pageNotFound")
    }
}

// ---Password Change Verify---

const verifyChangePasswordOtp = async (req, res) => {
    try {

        const enteredOtp = req.body.otp;
        if (enteredOtp == req.session.userOtp) {
            res.redirect("/reset-password")
        } else {
            res.json({ success: false, message: "OTP not matching" })
        }

    } catch (error) {
        res.status(500).json({ success: true, message: "An error occured.Please try again" })
    }
}





module.exports = {
    getForgotPasswordPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePasswordOtp,
}