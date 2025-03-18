const Transaction = require("../../models/transactionSchema");
const Wallet = require("../../models/walletSchema");



const loadWallet = async (req, res) => {
    try {
        const userId = req.session.user;
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" })
        }
        res.render("wallet", { wallet })
    } catch (error) {
        console.log("error loading wallet: ", error);
        res.redirect('/pageNOtFound');
    }
}


const walletHistory = async (req, res) => {
    try {

        const transactions = await Transaction.find()
            .populate("user", "name email")
            .sort({ date: -1 })

        res.render("wallet-history", { transactions })
    } catch (error) {
        console.log("Error Loading wallet history: ", error);
        res.redirect("/pageNotFound");
    }
}

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
        console.log("Error occured trasaction detail page load: ", error);
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    loadWallet,
    walletHistory,
    transactionDetails,
}