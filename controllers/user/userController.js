// ---Home page---


const loadHomepage = async (req, res) => {
    try {
        res.render("home");
    } catch (error) {
        console.log("Home Page Not Found", error)
        res.status(500).send("Server Error")
    }
}

// ---Signup page---

const loadSignup = async (req, res) => {
    try {
        res.render("signup");
    } catch (error) {
        console.log("Sign Up page Loading Error", error)
        res.render('/pageNotFound')
    }
}

// ---Register page---

const loadRegisterpage = async (req, res) => {
    try {
        res.render("register")
    } catch (error) {
        console.log("Register Page Loading Error", error);
        res.render('/pageNotFound');
    }
}

// ---Register page---

const loadloginpage = async (req, res) => {
    try {
        res.render("login")
    } catch (error) {
        console.log("Login Page Loading Error", error);
        res.render('/pageNotFound')
    }
}

// ---404 page---

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
        console.log("Page-404 Loading Error", error)
        res.redirect('/pageNotFound')
    }
}


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    loadRegisterpage,
    loadloginpage,
} 