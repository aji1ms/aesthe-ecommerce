
const Order = require("../models/orderSchema");

const getMonthlySalesForYear = async (year) => {
    return await Order.aggregate([
        {
            $match: {
                invoiceDate: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: "$invoiceDate" },
                totalSales: { $sum: "$finalAmount" },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);
};


const getDailySalesForMonth = async (year, month) => {
    return await Order.aggregate([
        {
            $match: {
                invoiceDate: {
                    $gte: new Date(`${year}-${month}-01`),
                    $lte: new Date(`${year}-${month}-31`)
                }
            }
        },
        {
            $group: {
                _id: { $dayOfMonth: "$invoiceDate" },
                totalSales: { $sum: "$finalAmount" },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);
};


const getTopSellingProducts = async () => {
    return await Order.aggregate([
      { $unwind: "$orderedItem" },
      {
        $group: {
          _id: "$orderedItem.product",
          totalQuantity: { $sum: "$orderedItem.quantity" },
          revenue: { $sum: { $multiply: [ "$orderedItem.price", "$orderedItem.quantity" ] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          _id: 1,
          totalQuantity: 1,
          revenue: 1,
          productName: "$productInfo.productName",
          categoryName: "$productInfo.categoryName", 
          price: "$productInfo.price" 
        }
      }
    ]);
  };


  const getTopSellingCategories = async () => {
    return await Order.aggregate([
      { $unwind: "$orderedItem" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItem.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.category",
          totalQuantity: { $sum: "$orderedItem.quantity" }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      { $unwind: "$categoryInfo" },
      {
        $project: {
          _id: 1,
          totalQuantity: 1,
          categoryName: "$categoryInfo.name"
        }
      }
    ]);
  };


  module.exports = {
    getMonthlySalesForYear,
    getDailySalesForMonth,
    getTopSellingProducts,
    getTopSellingCategories
  };
  
  