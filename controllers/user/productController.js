const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");



// productController.js
const productDetails = async (req, res) => {
    try {
        const userId = req.session.user || null;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        
        const product = await Product.findById(productId).populate('category');
        const findCategory = product.category;
        
        // Get related products
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id }
        }).limit(4);

        // Get "others also bought" (you might want different logic here)
        const othersAlsoBought = await Product.find({
            category: product.category,
            _id: { $nin: [product._id, ...relatedProducts.map(p => p._id)] }
        }).limit(4);

        const categoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

        res.render("product-details", {
            user: userData,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory,
            relatedProducts,
            othersAlsoBought
        });

    } catch (error) {
        console.log("Error fetching Product Details", error);
        res.redirect("/PageNotFound");
    }
}



module.exports = {
    productDetails,
}