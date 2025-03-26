const Order = require("../models/orderSchema");


const getMonthlySalesForYear = async (year) => {
  return await Order.aggregate([
    {
      $match: {
        status: "Delivered",
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
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); 

  return await Order.aggregate([
    {
      $match: {
        status: "Delivered",           
        invoiceDate: {
          $gte: startDate,
          $lte: endDate
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



const getYearlySales = async () => {
  return await Order.aggregate([
    {
      $match: {
        status: "Delivered",
        invoiceDate: {
          $lte: new Date()
        }
      }
    },
    {
      $group: {
        _id: { $year: "$invoiceDate" },
        totalSales: { $sum: "$finalAmount" },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { "_id": -1 } }
  ]);
};


const getTopSellingProducts = async () => {
  return await Order.aggregate([
    { $match: { status: "Delivered" } },
    { $unwind: "$orderedItem" },
    {
      $group: {
        _id: "$orderedItem.product",
        totalQuantity: { $sum: "$orderedItem.quantity" },
        revenue: { $sum: { $multiply: ["$orderedItem.price", "$orderedItem.quantity"] } }
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
      $lookup: {
        from: "categories",
        localField: "productInfo.category",
        foreignField: "_id",
        as: "categoryDetails"
      }
    },
    { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        totalQuantity: 1,
        revenue: 1,
        productName: "$productInfo.productName",
        price: "$productInfo.salePrice",
        categoryName: { $ifNull: [ "$categoryDetails.name", "N/A" ] }
      }
    }
  ]);
};



const getTopSellingCategories = async () => {
  return await Order.aggregate([
    { $match: { status: "Delivered" } },
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
  getYearlySales,
  getTopSellingProducts,
  getTopSellingCategories
};
