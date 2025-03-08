const User = require("../../models/userSchema");
const Order = require('../../models/orderSchema');
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");



// ---Check out page---

const loadCheckoutPage = async (req, res) => {
    try {

        const userId = req.session.user;
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        let totalPrice = cart.items.reduce((acc, item) => {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 0;
            return acc + (price * quantity);
        }, 0);

        const deliveryCharge = 149;
        const finalAmount = totalPrice + deliveryCharge;

        const addresses = await Address.find({ userId });

        res.render("checkout", {
            user,
            cartItems: cart.items,
            totalPrice,
            deliveryCharge,
            finalAmount,
            addresses
        });

    } catch (error) {
        console.log("Error loading checkout page: ", error);
        res.redirect('/pageNotFound')
    }
}

// ---OrderPlace---

const placeOrder = async (req, res) => {
    try {

        const userId = req.session.user;
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length == 0) {
            return res.redirect('/cart')
        }

        let totalPrice = 0;
        cart.items.forEach(item => {
            totalPrice += item.totalPrice;
        });

        const discount = 0;
        const finalAmount = totalPrice - discount;

        const orderItem = cart.items.map(item => {
            return {
                product: item.productId._id,
                quantity: item.quantity,
                price: item.price
            }
        })

        const newOrder = new Order({
            orderedItem,
            totalPrice,
            discount,
            finalAmount,
            address: user._id,
            invoiceDate: new Date(),
            status: "Pending",
            couponApplied: false
        });

        await newOrder.save();

        cart.items = [];
        await cart.save();

        res.render("orderConfirmation", {
            order: newOrder,
            user
        });
    } catch (error) {
        console.error("Error placing order:", error);
        res.redirect("/pageNotFound");
    }
};



module.exports = {
    loadCheckoutPage,
    placeOrder,
}
