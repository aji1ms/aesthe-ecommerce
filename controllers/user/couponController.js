const Coupon = require("../../models/couponSchema");


// ---Apply coupon---

const applyCoupon = async (req, res) => {
    try {

        const { couponName, orderTotal, userId } = req.body;
        const coupon = await Coupon.findOne({ name: couponName });

        if (!coupon) {
            return res.status(400).json({ status: false, message: "Invalid Coupon" })
        }

        if (new Date() > coupon.expireOn) {
            return res.status(400).json({ status: false, message: "Coupon expired" })
        }
        if (orderTotal < coupon.minimumPrice) {
            return res.status(400).json({ status: false, message: `Order total must be at least ${coupon.minimumPrice}` })
        }
        if (coupon.userId.includes(userId)) {
            return res.status(400).json({ status: false, message: "coupon already used" })
        }

        coupon.userId.push(userId);
        await coupon.save();

        req.session.appliedCoupon = {
            couponName: coupon.name,
            discount: coupon.offerPrice
        }

        return res.status(200).json({
            status: true,
            discount: coupon.offerPrice,
            newTotal: orderTotal - coupon.offerPrice,
            message: "Coupon applied successfully"
        });

    } catch (error) {
        console.log("Error adding coupon: ", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
}


// ---Remove Coupon---

const removeCoupon = async (req, res) => {
    try {
        const { couponName, userId } = req.body;
        const coupon = await Coupon.findOne({ name: couponName });

        if (!coupon) {
            return res.status(400).json({ status: false, message: "Invalid coupon code" });
        }

        coupon.userId = coupon.userId.filter(id => id.toString() !== userId);
        await coupon.save();

        req.session.appliedCoupon = null;
        await req.session.save(); 
        res.status(200).json({ status: true, message: "Coupon removed successfully" });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Server error" });
    }
};


module.exports = {
    applyCoupon,
    removeCoupon,
}