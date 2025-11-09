const { Session } = require("express-session");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Wallet = require("../../models/walletSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");
const env = require("dotenv").config();
const resend = require("resend");

// ---Home page---

const loadHomepage = async (req, res) => {
    try {
        const user = req.session.userData;

        const categories = await Category.find({ isListed: true });
        let productData = await Product.find(
            {
                isBlocked: false,
                category: { $in: categories.map(category => category._id) }, quantity: { $gt: 0 }
            }
        )

        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0, 5);

        if (user) {
            const userData = await User.findOne({ _id: user._id });
            res.render("home", { user: userData, products: productData });
        } else {
            return res.render('home', { products: productData });
        }
    } catch (error) {
        res.status(500).redirect("/pageNotFound")
    }
}

// ---Signup page---

const loadSignup = async (req, res) => {
    try {
        res.render("signup");
    } catch (error) {
        res.status(500).redirect("/pageNotFound")
    }
}

// ---Register page---

const loadRegisterpage = async (req, res) => {
    try {
        res.render("register")
    } catch (error) {
        res.status(500).redirect('/pageNotFound');

    }
}

// ---Register otp generation---

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    // try {
    //     const transporter = nodemailer.createTransport({
    //         service: 'gmail',
    //         port: 587,
    //         secure: false,
    //         requireTLS: true,
    //         auth: {
    //             user: process.env.NODEMAILER_EMAIL,
    //             pass: process.env.NODEMAILER_PASSWORD,
    //         }
    //     })

    //     const info = await transporter.sendMail({
    //         from: process.env.NODEMAILER_EMAIL,
    //         to: email,
    //         subject: "Verify your account",
    //         text: `Your OTP is ${otp}`,
    //         html: `<b>Your OTP: ${otp}</b>`,
    //     })

    //     return info.accepted.length > 0;

    // } catch (error) {
    //     return false;
    // }

    async function sendVerificationEmail(email, otp) {
        try {
            const data = await resend.emails.send({
                from: process.env.NODEMAILER_EMAIL,
                to: email,
                subject: 'Verify your AESTHE account',
                html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Welcome to AESTHE 👗</h2>
          <p>Use the following OTP to verify your email:</p>
          <h1 style="color: #4CAF50;">${otp}</h1>
          <p>This OTP is valid for 1 minute.</p>
        </div>
      `,
            });

            console.log("Resend response:", data);
            return true;
        } catch (error) {
            console.error("Resend error:", error);
            return false;
        }
    }
}

// ---user registration---

const register = async (req, res) => {
    try {
        const { name, email, phone, password, cPassword } = req.body;


        const normalizedEmail = email.toLowerCase();

        if (password != cPassword) {
            return res.render("register", { message: "Password do not match" });
        }


        const findUser = await User.findOne({ email: normalizedEmail });
        if (findUser) {

            if (findUser.authType === "google") {
                return res.render("register", { message: "This email is already registered with Google. Please use Google login." });
            } else {
                return res.render("register", { message: "Email already exists" });
            }
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(normalizedEmail, otp);
        if (!emailSent) {
            return res.render("register", { message: "Failed to send verification email" });
        }

        req.session.otp = otp;
        req.session.otpExpiresAt = Date.now() + 60000;
        req.session.userData = {
            name,
            email: normalizedEmail,
            phone,
            password
        };

        res.render("verify-otp");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const storedOTP = req.session.otp;
        const userData = req.session.userData;
        const otpExpiresAt = req.session.otpExpiresAt;


        if (Date.now() > otpExpiresAt) {
            return res.status(400).json({
                status: 'error',
                message: 'OTP has expired. Please request a new one.'
            });
        }

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

        await Wallet.create({
            user: saveUserData._id,
            balance: 0
        })

        req.session.otp = null;
        req.session.userData = null;
        req.session.otpExpiresAt = null;

        return res.status(200).json({
            status: 'success',
            message: 'Account verified successfully!',
            redirectUrl: '/login'
        });

    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: 'Failed to verify OTP.'
        });
    }
};

const resendOtp = async (req, res) => {
    try {
        const userData = req.session.userData;

        if (!userData || !userData.email) {
            return res.status(400).json({
                success: false,
                message: "Email not found in session. Please start registration again."
            });
        }

        const otp = generateOtp();

        req.session.otp = otp;
        req.session.otpExpiresAt = Date.now() + 60000;

        const emailSent = await sendVerificationEmail(userData.email, otp);

        if (emailSent) {
            return res.status(200).json({
                success: true,
                message: "OTP Resent Successfully"
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to resend OTP. Please try again"
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error. Please try again"
        });
    }
};

// ---login page---

const loadloginpage = async (req, res) => {
    try {
        if (req.session.userData) {
            return res.redirect('/');
        } else {
            return res.render("login");
        }
    } catch (error) {
        res.status(500).redirect("/pageNotFound")
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });


        if (!findUser) {
            return res.render('login', { message: "User not found" });
        }

        if (findUser.authType === "google") {
            return res.render('login', { message: "Please log in using Google" });
        }

        if (findUser.isBlocked) {
            return res.render('login', { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render('login', { message: "Password incorrect" });
        }

        req.session.user = findUser._id;
        req.session.userData = {
            _id: findUser._id,
            email: findUser.email,
            name: findUser.name
        };

        return res.redirect("/");

    } catch (error) {
        return res.render('login', { message: "Login failed. Please try again later" });
    }
}

// ---logout ---

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return res.redirect('/pageNotFound');
            }
            return res.redirect('/login');
        })
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}


// ---Shopping Page ---

const loadShoppingPage = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((category) => category._id.toString());

        const page = parseInt(req.query.page) || 1;
        const limit = 16;
        const skip = (page - 1) * limit;

        let sortCriteria = { createdAt: -1 };

        const sortOption = req.query.sort;

        switch (sortOption) {
            case "featured":
                sortCriteria = { isFeatured: -1, createdAt: -1 };
                break;
            case "newest":
                sortCriteria = { createdAt: -1 };
                break;
            case "price-low":
                sortCriteria = { salePrice: 1 };
                break;
            case "price-high":
                sortCriteria = { salePrice: -1 };
                break;
            case "name-asc":
                sortCriteria = { productName: 1 };
                break;
            case "name-desc":
                sortCriteria = { productName: -1 };
                break;
            default:
                sortCriteria = { createdAt: -1 };
        }

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 }
        })
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 }
        })
        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await Brand.find({ isBlocked: false });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        res.render("shop", {
            user: userData,
            products: products,
            category: categoriesWithIds,
            brand: brands,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

// --Ladies Page--

const loadLadies = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findOne({ _id: user })
        const categories = await Category.find({ isListed: true })
        const categoryIds = categories.map((category) => category._id.toString());

        const page = parseInt(req.query.page) || 1;
        const limit = 16;
        const skip = (page - 1) * limit;

        let sortCriteria = { createdAt: -1 };

        const sortOption = req.query.sort;

        switch (sortOption) {
            case "featured":
                sortCriteria = { isFeatured: -1, createdAt: -1 };
                break;
            case "newest":
                sortCriteria = { createdAt: -1 };
                break;
            case "price-low":
                sortCriteria = { salePrice: 1 };
                break;
            case "price-high":
                sortCriteria = { salePrice: -1 };
                break;
            case "name-asc":
                sortCriteria = { productName: 1 };
                break;
            case "name-desc":
                sortCriteria = { productName: -1 };
                break;
            default:
                sortCriteria = { createdAt: -1 };
        }

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
            categoryOf: "ladies"
        })
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
            categoryOf: "ladies"
        })
        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await Brand.find({ isBlocked: false });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));


        res.render("ladies", {
            user: userData,
            category: categoriesWithIds,
            products: products,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            brand: brands,
        });

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

// --mens Page--

const loadMens = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findOne({ _id: user })
        const categories = await Category.find({ isListed: true })
        const categoryIds = categories.map((category) => category._id.toString());

        const page = parseInt(req.query.page) || 1;
        const limit = 16;
        const skip = (page - 1) * limit;

        let sortCriteria = { createdAt: -1 };

        const sortOption = req.query.sort;

        switch (sortOption) {
            case "featured":
                sortCriteria = { isFeatured: -1, createdAt: -1 };
                break;
            case "newest":
                sortCriteria = { createdAt: -1 };
                break;
            case "price-low":
                sortCriteria = { salePrice: 1 };
                break;
            case "price-high":
                sortCriteria = { salePrice: -1 };
                break;
            case "name-asc":
                sortCriteria = { productName: 1 };
                break;
            case "name-desc":
                sortCriteria = { productName: -1 };
                break;
            default:
                sortCriteria = { createdAt: -1 };
        }

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
            categoryOf: "mens"
        })
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
            categoryOf: "mens"
        })
        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await Brand.find({ isBlocked: false });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));


        res.render("mens", {
            user: userData,
            category: categoriesWithIds,
            products: products,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            brand: brands,
        });


    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

// --Baby Page--

const loadBaby = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findOne({ _id: user })
        const categories = await Category.find({ isListed: true })
        const categoryIds = categories.map((category) => category._id.toString());

        const page = parseInt(req.query.page) || 1;
        const limit = 16;
        const skip = (page - 1) * limit;

        let sortCriteria = { createdAt: -1 };

        const sortOption = req.query.sort;

        switch (sortOption) {
            case "featured":
                sortCriteria = { isFeatured: -1, createdAt: -1 };
                break;
            case "newest":
                sortCriteria = { createdAt: -1 };
                break;
            case "price-low":
                sortCriteria = { salePrice: 1 };
                break;
            case "price-high":
                sortCriteria = { salePrice: -1 };
                break;
            case "name-asc":
                sortCriteria = { productName: 1 };
                break;
            case "name-desc":
                sortCriteria = { productName: -1 };
                break;
            default:
                sortCriteria = { createdAt: -1 };
        }

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
            categoryOf: "baby"
        })
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);


        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
            categoryOf: "baby"
        })
        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await Brand.find({ isBlocked: false });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));


        res.render("baby", {
            user: userData,
            category: categoriesWithIds,
            products: products,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            brand: brands,
        });


    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadKids = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findOne({ _id: user })
        const categories = await Category.find({ isListed: true })
        const categoryIds = categories.map((category) => category._id.toString());

        const page = parseInt(req.query.page) || 1;
        const limit = 16;
        const skip = (page - 1) * limit;

        let sortCriteria = { createdAt: -1 };

        const sortOption = req.query.sort;

        switch (sortOption) {
            case "featured":
                sortCriteria = { isFeatured: -1, createdAt: -1 };
                break;
            case "newest":
                sortCriteria = { createdAt: -1 };
                break;
            case "price-low":
                sortCriteria = { salePrice: 1 };
                break;
            case "price-high":
                sortCriteria = { salePrice: -1 };
                break;
            case "name-asc":
                sortCriteria = { productName: 1 };
                break;
            case "name-desc":
                sortCriteria = { productName: -1 };
                break;
            default:
                sortCriteria = { createdAt: -1 };
        }

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
            categoryOf: "kids"
        })
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);


        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
            categoryOf: "kids"
        })
        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await Brand.find({ isBlocked: false });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));


        res.render("kids", {
            user: userData,
            category: categoriesWithIds,
            products: products,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            brand: brands,
        });


    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

// --Filter Page--

const filterProducts = async (req, res) => {
    try {

        const user = req.session.user || null;
        const category = req.query.category;
        const findCategory = category ? await Category.findOne({ _id: category }) : null;
        const query = {
            isBlocked: false,
            quantity: { $gt: 0 },
        }

        if (findCategory) {
            query.category = findCategory._id;
        }

        let findProducts = await Product.find(query).lean();
        findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const categories = await Category.find({ isListed: true })

        let itemsPerPage = 16;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);
        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                    category: findCategory ? findCategory._id : null,
                    searchedOn: new Date(),
                }
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        req.session.filteredProduct = currentProduct;

        res.render("shop", {

            user: userData,
            products: currentProduct,
            category: categories,
            totalPages,
            currentPage,
            selectedCategory: category || null,
        })

    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

// --Filter By Price--

const filterByPrice = async (req, res) => {
    try {

        const user = req.session.user || null;
        const userData = await User.findOne({ _id: user });
        const categories = await Category.find({ isListed: true });

        let minPrice = Number(req.query.gt);
        let maxPrice = Number(req.query.lt);

        let findProducts = await Product.find({
            salePrice: { $gt: minPrice, $lt: maxPrice },
            isBlocked: false,
            quantity: { $gt: 0 },
        }).lean();

        findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let itemsPerPage = 16;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);
        req.session.filteredProduct = findProducts;

        res.render("shop", {
            user: userData,
            products: currentProduct,
            category: categories,
            totalPages,
            currentPage
        })

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

// ---search products---

const searchProducts = async (req, res) => {
    try {

        const user = req.session.user || null;
        const userData = await User.findOne({ _id: user });

        let search = req.body.query || req.query.query || "";
        search = search.trim();


        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map(category => category._id.toString());
        let searchResult = [];

        if (req.session.filteredProduct && req.session.filteredProduct.length > 0) {
            searchResult = req.session.filteredProduct.filter(product =>
                product.productName.toLowerCase().includes(search.toLowerCase())
            )
        } else {
            searchResult = await Product.find({
                productName: { $regex: ".*" + search + ".*", $options: "i" },
                isBlocked: false,
                quantity: { $gt: 0 },
                category: { $in: categoryIds }
            }).lean()
        }


        searchResult.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let itemsPerPage = 16;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(searchResult.length / itemsPerPage);
        const currentProduct = searchResult.slice(startIndex, endIndex);

        res.render("shop", {
            products: currentProduct,
            category: categories,
            totalPages,
            currentPage,
            count: searchResult.length,
        })

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

// ---404 page---

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
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
    loadShoppingPage,
    loadLadies,
    loadMens,
    loadBaby,
    loadKids,
    filterProducts,
    filterByPrice,
    searchProducts
} 
