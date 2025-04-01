const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const Product = require('../../models/productSchema');


// ---Thanking Page---

const thankingPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);

        res.render("order", { user })
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

// ---Order List---

const orderList = async (req, res) => {
    try {

        const userId = req.session.user;
        const orders = await Order.find({ user: req.session.user }).sort({ createdOn: -1 }).populate('orderedItem.product').populate('billingAddress');

        res.render("orderListing", { orders })

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


// ---Order Detailed Page---

const loadOrderDetails = async (req, res) => {
    try {

        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate('orderedItem.product')
            .populate('billingAddress')
            .populate('user');

        res.render("orders", { order });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


// ---cancel order---

const cancelOrder = async (req, res) => {
    try {

        const { orderId } = req.body;
        const order = await Order.findOne({ _id: orderId, user: req.session.user });
        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found" });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({ status: false, message: "Order already cancelled" });
        }

        order.status = "Cancelled";
        await order.save();

        await Promise.all(order.orderedItem.map(async (item) => {
            await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
        }))

        res.status(200).json({ status: true, message: "Order cancelled successfully" });

    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server error" });
    }
}


// ---return order---

const returnOrder = async (req, res) => {
    try {

        const { orderId, returnReason } = req.body;
        const order = await Order.findOne({ _id: orderId, user: req.session.user });

        if (!order) {
            return res.status(404).json({ status: false, message: "Order Not found" });
        }

        if (order.status !== "Delivered") {
            return res.status(400).json({ status: false, message: "Order cannot be returned" });
        }

        order.status = "Return Request";
        order.returnReason = returnReason;
        await order.save();

        res.status(200).json({ status: true, message: "Return request submitted successfully." });

    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server error" });
    }
}

module.exports = {
    thankingPage,
    orderList,
    loadOrderDetails,
    cancelOrder,
    returnOrder,
}