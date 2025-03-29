const {
    getMonthlySalesForYear,
    getDailySalesForMonth,
    getYearlySales,
    getWeeklySales,
    getTopSellingProducts,
    getTopSellingCategories,
} = require("../../helpers/aggregation");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Order = require("../../models/orderSchema");


const loadAdminDashboard = async (req, res) => {
    try {
        const filterType = req.query.filter || "monthly";
        const year = req.query.year || new Date().getFullYear();
        const month = req.query.month || new Date().getMonth() + 1;

        let chartData = [];
        if (filterType === "yearly") {
            chartData = await getYearlySales();
        } else if (filterType === "monthly") {
            chartData = await getMonthlySalesForYear(year);
        } else if (filterType === "weekly") {
            chartData = await getWeeklySales();
        } else {
            chartData = await getMonthlySalesForYear(year);
        }


        const topProducts = await getTopSellingProducts();
        const topCategories = await getTopSellingCategories();

       
        const deliveredFilter = { status: "Delivered" };

        const totalOrders = await Order.countDocuments(deliveredFilter);
        const totalRevenueObj = await Order.aggregate([
            { $match: deliveredFilter },
            { $group: { _id: null, total: { $sum: "$finalAmount" } } }
        ]);
        const totalRevenue = totalRevenueObj.length ? totalRevenueObj[0].total : 0;

        const totalCustomers = await User.countDocuments({ isAdmin: false });
        const totalCategories = await Category.countDocuments();

        res.render("dashboard", {
            chartData,
            topProducts,
            topCategories,
            filterType,
            year,
            month,
            totalOrders,
            totalRevenue,
            totalCustomers,
            totalCategories
        });
    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.status(500).send("Server Error");
    }
};

module.exports = { loadAdminDashboard };
