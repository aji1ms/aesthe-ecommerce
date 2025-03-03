const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true,
    },
    isListed: {
        type: Boolean,
        defaul: true
    },
    categoryOffer: {
        type: Number,
        default: 0
    },
    categoryOf: {
        type: String,
        enum: ['mens', 'ladies', 'kids', 'baby'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;