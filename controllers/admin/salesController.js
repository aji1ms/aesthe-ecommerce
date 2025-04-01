const Order = require("../../models/orderSchema")
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


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

        const totalSalesCount = orders.length;
        const totalRevenue = orders.reduce((acc, order) => acc + (order.finalAmount || 0), 0);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        const periodMapping = {
            daily: "Daily",
            weekly: "Weekly",
            monthly: "Monthly",
            yearly: "Yearly",
            custom: "Custom"
        };
        const reportHeader = `${periodMapping[period] || 'Sales'} Sales Report`;

        doc.fontSize(18).text(reportHeader, { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(14).text(`Total Sales Count: ${totalSalesCount}`, { align: 'center' });
        doc.fontSize(14).text(`Total Revenue: $${totalRevenue.toFixed(2)}`, { align: 'center' });
        doc.moveDown(2);

        const columns = {
            date: { x: 50, width: 80 },
            orderId: { x: 130, width: 180 },
            customer: { x: 310, width: 120 },
            discount: { x: 430, width: 60 },
            total: { x: 490, width: 60 }
        };

        doc.fontSize(12).font('Helvetica-Bold');
        doc.text("Date", columns.date.x, doc.y);
        doc.text("Order ID", columns.orderId.x, doc.y - doc.currentLineHeight());
        doc.text("Customer", columns.customer.x, doc.y - doc.currentLineHeight());
        doc.text("Discount", columns.discount.x, doc.y - doc.currentLineHeight());
        doc.text("Total", columns.total.x, doc.y - doc.currentLineHeight());
        doc.moveDown();

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.font('Helvetica');

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
        res.status(500).send("Error generating PDF report.");
    }
};


const downloadExcelPdf = async (req, res) => {
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

        const totalSalesCount = orders.length;
        const totalRevenue = orders.reduce((acc, order) => acc + (order.finalAmount || 0), 0);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        const periodMapping = {
            daily: "Daily",
            weekly: "Weekly",
            monthly: "Monthly",
            yearly: "Yearly",
            custom: "Custom"
        };
        const reportHeader = `${periodMapping[period] || 'Sales'} Sales Report`;

        worksheet.mergeCells('A1:E1');
        const titleRow = worksheet.getCell('A1');
        titleRow.value = reportHeader;
        titleRow.font = { size: 18, bold: true };
        titleRow.alignment = { horizontal: 'center' };

        worksheet.addRow([]);

        const totalOrdersRow = worksheet.addRow([`Total Sales Count: ${totalSalesCount}`]);
        totalOrdersRow.font = { size: 14, bold: true };
        const totalRevenueRow = worksheet.addRow([`Total Revenue: ₹${totalRevenue.toFixed(2)}`]);
        totalRevenueRow.font = { size: 14, bold: true };

        worksheet.addRow([]);

        const headerRow = worksheet.addRow(["Date", "Order ID", "Customer", "Discount", "Total"]);
        headerRow.font = { bold: true };
        headerRow.eachCell((cell) => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.alignment = { horizontal: 'center' };
        });

        orders.forEach(order => {
            const orderDate = new Date(order.createdOn).toLocaleDateString();
            const customer = order.user ? order.user.name : "N/A";
            const discount = order.discount ? order.discount.toFixed(2) : "0.00";
            const total = order.finalAmount ? order.finalAmount.toFixed(2) : "0.00";
            const row = worksheet.addRow([orderDate, order.orderId, customer, `₹${discount}`, `₹${total}`]);
            row.eachCell((cell) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).send("Error generating Excel report.");
    }
};



module.exports = {
    loadSales,
    downloadSalesPdf,
    downloadExcelPdf,
}