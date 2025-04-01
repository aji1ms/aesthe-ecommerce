const User = require("../../models/userSchema");
const Product = require('../../models/productSchema');
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const mongoose = require("mongoose");


// ---Load cart page---

const loadCart = async (req, res) => {
    try {

        const userId = req.session.user;
        const user = await User.findById(userId);
        let cart = await Cart.findOne({ userId: userId }).populate('items.productId');
        const cartItems = cart ? cart.items : [];

        res.render("cart", {
            user,
            cartItems,
        })
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

// ---Post products to cart Page---

const addToCart = async (req, res) => {
    try {
        const { productId, size,color } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ status: false, message: "Please login to add items to your cart" });
        }

        if (!size) {
            return res.status(400).json({ status: false, message: "Please select a size before adding to cart" });
          }

        const product = await Product.findById(productId).populate('category');
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }
        if (product.isBlocked || (product.category && product.category.isBlocked)) {
            return res.status(400).json({ status: false, message: 'Product is unavailable for cart addition' });
        }

        const price = product.salePrice || product.regularPrice;
        if (!price) {
            return res.status(400).json({ status: false, message: 'Product price not defined' });
        }

        let cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            cart = new Cart({ userId: userId, items: [] });
        }

        
        cart.items.forEach(item => {
            if (!item.color) {
              item.color = product.color || "default"; // Use a fallback if needed
            }
          });


        cart.items.forEach(item => {
            if (!item.size) {
              item.size = "S"; 
            }
          });

        const quantity = 1;
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
            cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * cart.items[itemIndex].price;
            if (cart.items[itemIndex].quantity > 10) {
                cart.items[itemIndex].quantity = 10;
                cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * cart.items[itemIndex].price;
                return res.status(400).json({ status: false, message: 'Reached maximum stock limit for this product' });
            }
        } else {
            cart.items.push({
                productId: productId,
                color: color,
                size: size,
                quantity: quantity,
                price: price,
                totalPrice: price * quantity
            });
        }

        await cart.save();

        await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } });

        return res.status(200).json({ status: true, message: "Product added to cart" });

    } catch (error) {
        return res.status(500).json({ status: false, message: 'Server error' });
    }
};

// ---update cart quantitys---

const updateProductQuantity = async (req, res) => {
    try {

        const { productId, action } = req.body;
        const userId = req.session.user;

        let cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.status(404).json({ status: false, message: "Cart not found" });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ status: false, message: "Item not found in cart" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        if (action === 'increase') {
            if (cart.items[itemIndex].quantity < product.quantity) {
                cart.items[itemIndex].quantity += 1;
            } else {
                return res.status(400).json({ status: false, message: "Reached maximum stock" });
            }
        } else if (action === 'decrease') {
            if (cart.items[itemIndex].quantity > 1) {
                cart.items[itemIndex].quantity -= 1;
            } else {
                return res.status(400).json({ status: false, message: "Minimum quantity reached" })
            }
        } else {
            return res.status(400).json({ status: false, message: "Invalid action" })
        }

        cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * cart.items[itemIndex].price;

        await cart.save();
        return res.status(200).json({
            status: true,
            quantity: cart.items[itemIndex].quantity,
            totalPrice: cart.items[itemIndex].totalPrice
        })

    } catch (error) {
        return res.status(500).json({ status: false, message: "Server Error" })
    }
}


// ---Delete product from cart---

const deleteProductFromCart = async (req, res) => {
    try {

        let { productId } = req.body;
        const userId = req.session.user;
        productId = productId.trim();

        let cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.status(404).json({ status: false, message: "Cart not found" });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString()===productId);
        if (itemIndex === -1) {
            return res.status(404).json({ status: false, message: "Product not found in cart" });
        }

        cart.items.splice(itemIndex, 1); 
        await cart.save()

        return res.status(200).json({ status: true, message: "Product removed succesfully" });

    } catch (error) {
        return res.status(404).json({ status: false, message: "Server Error" })
    }
}




module.exports = {
    loadCart,
    addToCart,
    updateProductQuantity,
    deleteProductFromCart,
}