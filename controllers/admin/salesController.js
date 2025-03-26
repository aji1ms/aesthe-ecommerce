const Order = require("../../models/orderSchema")
const PDFDocument = require('pdfkit');


// ---Sales page---

const loadSales = async (req, res) => {
    try {
        let match = { status: "Delivered" };
        const period = req.query.period || 'daily';
        const now = new Date();

        if (period === 'custom' && req.query.startDate && req.query.endDate) {
            const start = new Date(req.query.startDate);
            const end = new Date(req.query.endDate);
            end.setHours(23, 59, 59, 999);
            match.invoiceDate = { $gte: start, $lte: end };
        } else if (period === 'daily') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            match.createdOn = { $gte: start, $lte: now };
        } else if (period === 'weekly') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            match.createdOn = { $gte: start, $lte: new Date() };
        } else if (period === 'monthly') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            match.createdOn = { $gte: start, $lte: now };
        } else if (period === 'yearly') {
            const start = new Date(now.getFullYear(), 0, 1);
            match.createdOn = { $gte: start, $lte: now };
        }

        const orders = await Order.find(match)
            .populate('user')
            .populate('orderedItem.product')
            .sort({ createdOn: -1 });

        // Calculate totals
        const totalSalesCount = orders.length;
        const totalRevenue = orders.reduce((acc, order) => acc + order.finalAmount, 0);
        const totalDiscount = orders.reduce((acc, order) => acc + order.discount, 0);
        const totalCouponUsage = orders.filter(order => order.couponApplied).length;
        const discountCount = orders.filter(order => order.discount > 0).length;

        res.render("sales", {
            orders,
            totalSalesCount,
            totalRevenue,
            totalDiscount,
            totalCouponUsage,
            discountCount,
            period
        });

    } catch (error) {
        console.log("Error occurred while loading sales page: ", error);
        res.redirect("/pageNotFound");
    }
};

// ---PDF download---

const downloadSalesPdf = async (req, res) => {
    try {
        let match = { status: "Delivered" };
        const period = req.query.period || 'daily';
        const now = new Date();

        if (period === 'custom' && req.query.startDate && req.query.endDate) {
            const start = new Date(req.query.startDate);
            const end = new Date(req.query.endDate);
            end.setHours(23, 59, 59, 999);
            match.createdOn = { $gte: start, $lte: end };
        } else if (period === 'daily') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            match.createdOn = { $gte: start, $lte: now };
        } else if (period === 'weekly') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            match.createdOn = { $gte: start, $lte: now };
        } else if (period === 'monthly') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            match.createdOn = { $gte: start, $lte: now };
        } else if (period === 'yearly') {
            const start = new Date(now.getFullYear(), 0, 1);
            match.createdOn = { $gte: start, $lte: now };
        }

        const orders = await Order.find(match)
            .populate('user')
            .sort({ createdOn: -1 });

        // Calculate totals
        const totalSalesCount = orders.length;
        const totalRevenue = orders.reduce((acc, order) => acc + (order.finalAmount || 0), 0);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        // Dynamic report heading
        const periodMapping = {
            daily: "Daily",
            weekly: "Weekly",
            monthly: "Monthly",
            yearly: "Yearly",
            custom: "Custom"
        };
        const reportHeader = `${periodMapping[period] || 'Sales'} Sales Report`;

        // PDF Title
        doc.fontSize(18).text(reportHeader, { align: 'center' });
        doc.moveDown(1.5);

        // Add totals summary
        doc.fontSize(14).text(`Total Sales Count: ${totalSalesCount}`, { align: 'center' });
        doc.fontSize(14).text(`Total Revenue: $${totalRevenue.toFixed(2)}`, { align: 'center' });
        doc.moveDown(2);

        // Define column positions and widths for table header
        const columns = {
            date: { x: 50, width: 80 },
            orderId: { x: 130, width: 180 },
            customer: { x: 310, width: 120 },
            discount: { x: 430, width: 60 },
            total: { x: 490, width: 60 }
        };

        // Table Header
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text("Date", columns.date.x, doc.y);
        doc.text("Order ID", columns.orderId.x, doc.y - doc.currentLineHeight());
        doc.text("Customer", columns.customer.x, doc.y - doc.currentLineHeight());
        doc.text("Discount", columns.discount.x, doc.y - doc.currentLineHeight());
        doc.text("Total", columns.total.x, doc.y - doc.currentLineHeight());
        doc.moveDown();

        // Draw a line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Reset font to normal
        doc.font('Helvetica');

        // Iterate over orders and add rows
        orders.forEach(order => {
            const startY = doc.y;
            const orderDate = new Date(order.createdOn).toLocaleDateString();
            const customer = order.user ? order.user.name : "N/A";
            const discount = order.discount ? order.discount.toFixed(2) : "0.00";
            const total = order.finalAmount ? order.finalAmount.toFixed(2) : "0.00";

            doc.text(orderDate, columns.date.x, startY, {
                width: columns.date.width,
                align: 'left'
            });

            doc.text(order.orderId, columns.orderId.x, startY, {
                width: columns.orderId.width,
                align: 'left'
            });

            doc.text(customer, columns.customer.x, startY, {
                width: columns.customer.width,
                align: 'left'
            });

            doc.text(`$${discount}`, columns.discount.x, startY, {
                width: columns.discount.width,
                align: 'left'
            });

            doc.text(`$${total}`, columns.total.x, startY, {
                width: columns.total.width,
                align: 'left'
            });

            doc.moveDown(1.5);
        });

        doc.end();
    } catch (error) {
        console.error("Error generating PDF report:", error);
        res.status(500).send("Error generating PDF report.");
    }
};





module.exports = {
    loadSales,
    downloadSalesPdf,
}