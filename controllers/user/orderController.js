const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");


const loadOrderPage = async (req, res) => {
    try {
        res.render("order")
    } catch (error) {
        console.log("error rendering orderpage", error)
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    loadOrderPage
}