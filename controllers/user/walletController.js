const Transaction = require("../../models/transactionSchema");
const Wallet = require("../../models/walletSchema");



const loadWallet = async (req, res) => {
    try {
        const userId = req.session.user;
        const wallet = await Wallet.findOne({user: userId});
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" })
        }
        res.render("wallet", { wallet })
    } catch (error) {
        console.log("error loading wallet: ", error);
        res.redirect('/pageNOtFound');
    }
}

module.exports = {
    loadWallet,
}