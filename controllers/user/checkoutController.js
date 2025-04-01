const User = require("../../models/userSchema");
const Order = require('../../models/orderSchema');
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");
const Transaction = require("../../models/transactionSchema");



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
        let discount = 0;
        if (req.session.appliedCoupon) {
            discount = req.session.appliedCoupon.discount;
        }
        const finalAmount = totalPrice + deliveryCharge - discount;

        const addresses = await Address.find({ userId });

        res.render("checkout", {
            user,
            cartItems: cart.items,
            totalPrice,
            deliveryCharge,
            finalAmount,
            discount,
            appliedCoupon: req.session.appliedCoupon || null,
            addresses
        });

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

// ---OrderPlace---

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { billingAddress, payment } = req.body;

        if (!billingAddress) {
            return res.status(400).json({ status: false, message: "Billing address is required" });
        }

        if (!payment) {
            return res.status(400).json({ status: false, message: "Payment method is required" });
        }

        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ status: false, message: "Your cart is empty" });
        }

        const userAddresses = await Address.findOne({ userId });
        if (!userAddresses) {
            return res.status(400).json({ status: false, message: "No addresses found for user" });
        }

        const selectedAddress = userAddresses.address.find(addr => addr._id.toString() === billingAddress);
        if (!selectedAddress) {
            return res.status(400).json({ status: false, message: "Selected address not found" });
        }

        let totalPrice = 0;
        const orderedItem = cart.items.map(item => {
            totalPrice += item.totalPrice;
            return {
                product: item.productId._id,
                quantity: item.quantity,
                price: item.price
            };
        });

        const deliveryCharge = 149;
        let discount = 0;
        if (req.session.appliedCoupon) {
            discount = req.session.appliedCoupon.discount;
        }
        const finalAmount = totalPrice + deliveryCharge - discount;

        if (payment.toLowerCase() === "cod" && finalAmount > 1000) {
            return res.status(400).json({
                status: false,
                message: "Order above Rs 1000 is not allowed for COD. Please choose another payment method."
            });
        }

        if (payment.toLowerCase() === "wallet") {
           
            let wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                return res.status(400).json({ status: false, message: "Wallet not found." });
            }
            
            if (wallet.balance < finalAmount) {
                return res.status(400).json({ status: false, message: "Wallet is empty or has insufficient funds." });
            }
            
            wallet.balance -= finalAmount;
            
            
            const transaction = new Transaction({
                user: userId,
                type: "debit",
                amount: finalAmount,
                description: "Wallet payment for order"
            });
            await transaction.save();
            wallet.transactions.push(transaction._id);
            await wallet.save();
            
          
            req.body.paymentStatus = "Completed";
        }

        const newOrder = new Order({
            orderedItem,
            totalPrice,
            discount,
            finalAmount,
            billingAddress: selectedAddress,
            user: userId,
            paymentMethod: payment,
            paymentStatus: (payment.toLowerCase() === "wallet") ? "Completed" : (payment === "cod" ? "Pending" : "Completed"),
            status: "Pending",
            invoiceDate: new Date()
        });

        await newOrder.save();

        await Promise.all(orderedItem.map(async (item) => {
            await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
        }));

        cart.items = [];
        await cart.save();

        req.session.appliedCoupon = null;

        res.status(200).json({ status: true, message: "Order placed successfully" });

    } catch (error) {
        res.redirect("/pageNotFound");
    }
};



module.exports = {
    loadCheckoutPage,
    placeOrder,
}
