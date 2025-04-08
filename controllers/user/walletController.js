const Transaction = require("../../models/transactionSchema");
const Wallet = require("../../models/walletSchema");
const Razorpay = require("razorpay");
const crypto = require('crypto');

const loadWallet = async (req, res) => {
  try {
    const userId = req.session.user;
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" })
    }
    res.render("wallet", { wallet })
  } catch (error) {
    res.redirect('/pageNOtFound');
  }
}


const walletHistory = async (req, res) => {
  try {

    const userId = req.session.userData._id;

    const transactions = await Transaction.find({ user: userId })
      .populate("user", "name email")
      .sort({ date: -1 });

    res.render("wallet-history", { transactions });
  } catch (error) {
    console.error("Wallet history error:", error);
    res.redirect("/pageNotFound");
  }
};

const transactionDetails = async (req, res) => {
  try {

    const transactionId = req.params.id;
    const transaction = await Transaction.findById(transactionId)
      .populate("user", "name email")
      .populate("order", "orderNumber status")

    if (!transaction) {
      return res.status(404).render("pageNotFound")
    }

    res.render("transaction-detail", { transaction })

  } catch (error) {
    res.redirect("/pageNotFound")
  }
}

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const createPaymentOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const amountPaise = amount * 100;

    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    }
    const order = await razorpayInstance.orders.create(options);
    if (!order) return res.status(500).json({ success: false, message: "Error creating order" });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error creating order" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;


    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }


    const userId = req.session.user;
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = new Wallet({ user: userId, balance: 0 });
    }

    wallet.balance += parseFloat(amount);


    const transaction = new Transaction({
      user: userId,
      type: "credit",
      amount: parseFloat(amount),
      description: "Wallet top-up via Razorpay"
    });
    await transaction.save();

    wallet.transactions.push(transaction._id);
    await wallet.save();

    res.json({ success: true, message: "Payment verified and wallet updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error verifying payment" });
  }
};

module.exports = {
  loadWallet,
  walletHistory,
  transactionDetails,
  createPaymentOrder,
  verifyPayment
}