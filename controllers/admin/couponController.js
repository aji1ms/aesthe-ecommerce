const Coupon = require("../../models/couponSchema");
const mongoose = require("mongoose");

// ---Coupon page---

const loadCoupon = async (req, res) => {
    try {

        const findCoupons = await Coupon.find({});

        res.render("coupon", { coupons: findCoupons });

    } catch (error) {
        console.log("Error loading coupon page: ", error);
        res.redirect("/errorpage")
    }
}

// ---create coupon ---

const createCoupon = async (req, res) => {
    try {

        const data = {
            couponName: req.body.couponName,
            startDate: new Date(req.body.startDate + "T00:00:00"),
            endDate: new Date(req.body.endDate + "T00:00:00"),
            offerPrice: parseInt(req.body.offerPrice),
            minimumPrice: parseInt(req.body.minimumPrice),
        }

        const newCoupon = new Coupon({
            name: data.couponName,
            createdOn: data.startDate,
            expireOn: data.endDate,
            offerPrice: data.offerPrice,
            minimumPrice: data.minimumPrice,
        })
        await newCoupon.save();
        return res.redirect("/admin/coupon");

    } catch (error) {
        console.log("Error occured while creating coupon: ", error);
        res.redirect("/errorpage")
    }
}

// ---Edit coupon page ---

const loadEditCoupon = async (req, res) => {
    try {

        const id = req.query.id;
        const findCoupon = await Coupon.findOne({ _id: id });
        res.render("edit-coupon", { findCoupon: findCoupon })

    } catch (error) {
        console.log("Error Ocuured rendering edit coupon: ", error)
        res.redirect("/errorPage")
    }
}

// ---update coupon -

const updateCoupon = async (req, res) => {
    try {

        const couponId = req.body.couponId;
        const objId = new mongoose.Types.ObjectId(couponId);
        const selectedCoupon = await Coupon.findOne({ _id: objId });
        if (selectedCoupon) {
            const startDate = new Date(req.body.startDate);
            const endDate = new Date(req.body.endDate);
            const updatedCoupon = await Coupon.updateOne(
                { _id: objId },
                {
                    $set: {
                        name: req.body.couponName,
                        createdOn: req.body.startDate,
                        expireOn: endDate,
                        offerPrice: parseInt(req.body.offerPrice),
                        minimumPrice: parseInt(req.body.minimumPrice),
                    },
                }, { new: true }
            );

            if (updatedCoupon !== null) {
                res.send("Coupon updated successfully")
            } else {
                res.status(500).send("Coupon update failed")
            }
        }

    } catch (error) {
        console.log("error occured while coupon update", error);
        res.redirect("/errorpage")
    }
}

// ---Delete coupon -

const deleteCoupon = async (req, res) => {
    try {

        const id = req.query.id;
        await Coupon.deleteOne({ _id: id });
        res.status(200).send({ status: true, message: "coupon deleted successfully" })

    } catch (error) {
        console.log("Error occured while deleting: ", error);
        res.status(500).send({ success: false, message: "Failed to delete coupon" })
    }
}




module.exports = {
    loadCoupon,
    createCoupon,
    loadEditCoupon,
    updateCoupon,
    deleteCoupon,
}