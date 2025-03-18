const mongoose = require("mongoose");
const { Schema } = mongoose;

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order" 
  }
});


module.exports = mongoose.model("Transaction", TransactionSchema);