const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");



const getProductAddPage = async (req, res) => {
    try {

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        res.render("product-add",{
            cat:category,
            brand:brand,
        })

    } catch (error) {
        res.redirect("/errorpage");
    }
}


module.exports = {
    getProductAddPage,
}