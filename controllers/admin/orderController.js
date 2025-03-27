const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Transaction = require('../../models/transactionSchema');


// ---order listing Page---

const listOrders = async (req, res) => {
  try {
    let { page = 1, limit = 15, search = "", orderFilter = "All" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    let query = {};

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { paymentStatus: { $regex: search, $options: "i" } }
      ];
    }

    if (orderFilter && orderFilter !== "All") {
      query.status = { $regex: '^' + orderFilter + '$', $options: 'i' };
    }

    const orders = await Order.find(query)
      .sort({ createdOn: -1 })
      .populate('billingAddress')
      .populate('user')
      .skip((page - 1) * limit)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);

    res.render("adminOrders", {
      orders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      search,
      orderFilter: orderFilter || "All"
    });
  } catch (error) {
    console.error("Error listing orders:", error);
    res.redirect("/errorpage");
  }
};

// ---view order details---


const viewOrderDetailPage = async (req, res) => {
  try {

    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate('orderedItem.product')
      .populate('billingAddress');

    if (!order) {
      return res.redirect("/orderList");
    }

    res.render("orderViewPage", { order })

  } catch (error) {
    console.error("Error viewing order details:", error);
    res.redirect("/orderList");
  }
}

const updateOrderStatus = async (req, res) => {
  try {

    const orderId = req.params.orderId;
    const { status, paymentStatus } = req.body;

    await Order.findByIdAndUpdate(orderId, {
      status,
      paymentStatus,
    });

    res.redirect("/admin/orderView/" + orderId + "?updated=true");

  } catch (error) {

    console.error("Error updating order status:", error);
    res.redirect("/admin/orderView/" + req.params.orderId);
  }
}

// ---refund---

const addRefund = async (req, res) => {
  try {

    const { orderId, refundAmount } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    order.refundStatus = true;
    await order.save();

    let wallet = await Wallet.findOne({ user: order.user });

    if (!wallet) {
      wallet = new Wallet({ user: order.user, balance: 0 });
      await wallet.save()
    }

    const transaction = await Transaction.create({
      user: order.user,
      type: 'credit',
      amount: refundAmount,
      description: `Refund for the order ${order._id}`
    });

    wallet.balance += parseFloat(refundAmount);
    wallet.transactions.push(transaction._id);
    await wallet.save();

    res.json({ message: "Refund processed and wallet updated" });

  } catch (error) {
    console.log("Error occured while adding refund: ", error);
    res.status(500).json({ error: 'Server error processing refund.' });
  }
}

module.exports = {
  listOrders,
  viewOrderDetailPage,
  updateOrderStatus,
  addRefund,
}