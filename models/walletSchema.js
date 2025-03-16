const mongoose = require("mongoose");
const { Schema } = mongoose;
const transactionSchema = require('./transactionSchema');


const walletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true 
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [transactionSchema]
}, { timestamps: true })


const Wallet = mongoose.model("wallet", walletSchema);
module.exports = Wallet;