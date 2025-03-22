const {
    getMonthlySalesForYear,
    getDailySalesForMonth,
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
            chartData = await getMonthlySalesForYear(year);
        } else if (filterType === "monthly") {
            chartData = await getDailySalesForMonth(year, month);
        }

        const topProducts = await getTopSellingProducts();
        const topCategories = await getTopSellingCategories();

        // Basic stats (replace with your logic)
        const totalOrders = await Order.countDocuments();
        const totalRevenueObj = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$finalAmount" } } }]);
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
