const Contact = require("../../models/contactSchema");

const contactMessages = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const messages = await Contact.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalMessages = await Contact.countDocuments({});
        const totalPages = Math.ceil(totalMessages / limit);

        res.render("contactMessages", {
            messages,
            currentPage: page,
            totalPages
        });

    } catch (error) {
        res.redirect("/errorpage")
    }
}

module.exports = { contactMessages }