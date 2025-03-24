const { Session } = require("express-session");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
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

            const updatedUser = await User.findOne({ email: email });
            req.session.userData = updatedUser;
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
        const addressData = await Address.findOne({ userData: userData });
        res.render("profile", {
            user: userData,
            userAddress: addressData,
        })

    } catch (error) {
        console.error("Error retrieving profileData", error);
        res.redirect("/pageNotFound");
    }
}

// ---Edit userProfile page---

const editUserProfile = async (req, res) => {
    try {

        const userData = req.session.userData;
        const findUser = await User.findOne({ userData: userData })
        res.render("edit-profile", {
            userData: userData
        })

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

// ---Edit userProfile page---

const postEditProfile = async (req, res) => {
    try {

        const data = req.body;
        const userId = req.query.id;
        const findUser = await User.findOne({ _id: userId });
        if (!findUser) {
            return res.redirect("/pageNotFound");
        }
        await User.updateOne(
            { _id: userId },
            {
                $set: {
                    name: data.name,
                    phone: data.phone,
                }
            }
        );
        res.json({ success: true, redirect: '/userProfile' });

    } catch (error) {
        console.log("Error occured while editing profile: ", error);
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
        console.log("Entered OTP:", enteredOtp);
        console.log("Session OTP:", req.session.userOtp);

        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, message: "OTP verified successfully", render: "new-email" });
        } else {
            res.json({ success: false, message: "OTP not matching" });
        }
    } catch (error) {
        console.error("Error in verifyEmailOtp:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
};

const loadNewEmail = async (req, res) => {
    try {
        res.render("new-email")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

// ---User new Email---

const updateEmail = async (req, res) => {
    try {
        console.log("updateEmail triggered. Request body:", req.body);
        console.log("Current session userData:", req.session.userData);

        const newEmail = req.session.newEmail;
        if (!newEmail) {
            console.error("newEmail not found in session");
            return res.redirect("/change-email");
        }

        const userId = req.session.userData && req.session.userData._id;
        if (!userId) {
            console.error("No user ID found in session");
            return res.redirect("/login");
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { email: newEmail },
            { new: true }
        );

        console.log("Updated user from DB:", updatedUser);
        if (!updatedUser) {
            console.error("User not found or email update failed");
            return res.redirect("/change-email");
        }

        req.session.userData = updatedUser;

        delete req.session.newEmail;

        res.redirect("/userProfile");
    } catch (error) {
        console.error("Error updating email:", error);
        res.redirect("/pageNotFound");
    }
};


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
        console.log("Entered OTP:", req.body.otp);
        console.log("Session OTP:", req.session.userOtp);

        if (req.body.otp === req.session.userOtp) {
            res.json({ success: true, message: "OTP verified successfully", redirect: "/reset-password" });
        } else {
            res.json({ success: false, message: "OTP not matching" });
        }
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again" });
    }
}

// ---Address Page---

const loadAddressPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const userAddress = await Address.findOne({ userId: userId });
        res.render("address", { userAddress });
    } catch (error) {
        console.log("Error loading address page: ", error);
        res.redirect('/pageNotFound');
    }
}

// ---Add Address Page---

const addAddress = async (req, res) => {
    try {

        const user = req.session.user;
        res.render("add-address", { user: user });

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

// ---Add Address---

const postAddAddress = async (req, res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

        const userAddress = await Address.findOne({ userId: userData._id });
        if (!userAddress) {
            const newAddress = new Address({
                userId: userData._id,
                address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }]
            })
            await newAddress.save();
        } else {
            userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
            await userAddress.save();
        }

        res.json({ success: true, redirect: '/address' });

    } catch (error) {
        console.log("Error adding address: ", error);
        res.redirect("/pageNotFound")
    }
}

// ---Edit Address---

const editAddress = async (req, res) => {
    try {

        const addressId = req.query.id;
        const user = req.session.user;
        const currAddress = await Address.findOne({
            userId: user,
            "address._id": addressId,
        });

        if (!currAddress) {
            return res.redirect('/pageNotFound');
        }
        const addressData = currAddress.address.find((item) => {
            return item._id.toString() === addressId.toString();
        })

        if (!addressData) {
            return res.redirect("/pageNotFound")
        }

        res.render("edit-address", { address: addressData, user: user });

    } catch (error) {
        console.log("Error in edit addresss: ", error);
        res.redirect('/pageNotFound')
    }
}

// ---Editing Address---

const postEditAddress = async (req, res) => {
    try {

        const data = req.body;
        const addressId = req.query.id;
        const user = req.session.user;
        const findAddress = await Address.findOne({ "address._id": addressId });

        if (!findAddress) {
            return res.redirect("/pageNotfound")
        }
        await Address.updateOne(
            { "address._id": addressId },
            {
                $set: {
                    "address.$.addressType": data.addressType,
                    "address.$.name": data.name,
                    "address.$.city": data.city,
                    "address.$.landMark": data.landMark,
                    "address.$.state": data.state,
                    "address.$.pincode": data.pincode,
                    "address.$.phone": data.phone,
                    "address.$.altPhone": data.altPhone,
                }
            }
        )
        res.json({ success: true, redirect: '/address' });

    } catch (error) {
        console.log("Error Ocuured while editiing address: ", error);
        return res.redirect("/pageNotFound")
    }
}

// ---Delete Address---

const deleteAddress = async (req, res) => {
    try {

        const addressId = req.query.id;
        const findAddress = await Address.findOne({ "address._id": addressId });
        if (!findAddress) {
            return res.status(404).send('Address not found');
        }
        await Address.updateOne(
            { "address._id": addressId },
            {
                $pull: {
                    address: {
                        _id: addressId,
                    }
                }
            }
        )
        res.redirect("/address");

    } catch (error) {
        console.log("Error occured while deleting address: ", error);
        return res.redirect('/pageNotFound');
    }
}

const contactPage = async (req, res) => {
    try {
        res.render("contact");
    } catch (error) {
        console.log("error loading contact page: ", error);
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
    editUserProfile,
    postEditProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    loadNewEmail,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePasswordOtp,
    loadAddressPage,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    contactPage,
}