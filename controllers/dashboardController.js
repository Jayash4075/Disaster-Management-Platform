const {
    getAuthorityDashboard: getAuthorityDashboardService
} = require("../services/authorityDashboardService");


const getAuthorityDashboard = async (req, res) => {

    try {

        const data =
            await getAuthorityDashboardService();

        return res.status(200).json(data);

    } catch (error) {

        console.error(
            "Authority dashboard controller error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load authority dashboard",

            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined

        });

    }

};


module.exports = {
    getAuthorityDashboard
};