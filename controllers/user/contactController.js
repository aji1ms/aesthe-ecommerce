const Contact = require("../../models/contactSchema");

const sendContactMessage = async (req, res) => {
    try {

        const { name, email, subject, message } = req.body;
        const wordCount = message.trim().split(/\s+/).length;
        if (wordCount < 50) {
            return res.status(400).json({ status: false, message: "Message must contain at least 50 words." });
        }

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ status: false, message: "All fields are required" })
        }


        const contactMessage = new Contact({
            name,
            email,
            message,
            subject,
        })
        await contactMessage.save();
        return res.status(200).json({ status: true, message: "Message sent successfully" })

    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error." });
    }
}



module.exports = { sendContactMessage }