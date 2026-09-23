const {
    getAuthorityDashboard: getAuthorityDashboardService
} = require("../services/authorityDashboardService");

const {
    getCitizenDashboard: getCitizenDashboardService
} = require("../services/citizenDashboardService");


const getAuthorityDashboard = async (req, res) => {

    try {

        const data = await getAuthorityDashboardService();

        return res.status(200).json(data);

    } catch (error) {

        console.error("Authority dashboard controller error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load authority dashboard",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });

    }

};


// ============================================================
// CITIZEN DASHBOARD
// ============================================================

const getCitizenDashboard = async (req, res) => {

    try {

        const { lat, lng } = req.query;

        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                success: false,
                message: "lat and lng query parameters are required"
            });
        }

        const latitude = Number(lat);
        const longitude = Number(lng);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({
                success: false,
                message: "lat and lng must be valid numbers"
            });
        }

        const data = await getCitizenDashboardService(latitude, longitude);

        return res.status(200).json(data);

    } catch (error) {

        console.error("Citizen dashboard controller error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load citizen dashboard",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });

    }

};


module.exports = {
    getAuthorityDashboard,
    getCitizenDashboard
};