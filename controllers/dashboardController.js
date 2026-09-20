const {getAuthorityDashboard} = require("../services/authorityDashboardService");

module.exports.getAuthorityDashboard = async (req, res) => {
    try {
        const data = await getAuthorityDashboard();
        res.status(200).json(data);
    } catch (error) {
        console.error("Authority dashboard error:", error);
        res.status(500).json({ success: false, message: "Unable to load authority dashboard" });
    }
};