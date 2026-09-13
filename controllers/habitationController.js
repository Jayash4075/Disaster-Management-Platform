const Habitation = require("../models/Habitation");
const RelocationSite = require("../models/RelocationSite");

let cachedSummary = null;
let cacheTime = 0;
const CACHE_DURATION_MS = 60 * 1000;

module.exports.getLandingSummary = async (req, res) => {
    try {
        if (cachedSummary && Date.now() - cacheTime < CACHE_DURATION_MS) {
            return res.status(200).json(cachedSummary);
        }

        const [redZones, highRisk, totalHabitations, saferSites] = await Promise.all([
            Habitation.countDocuments({
                riskLevel: "RED"
            }),

            Habitation.countDocuments({
                riskLevel: {
                    $in: ["RED", "ORANGE"]
                }
            }),

            Habitation.countDocuments(),

            RelocationSite.find(
                { suitabilityScore: { $gte: 70 } },
                'name suitabilityScore capacity'
            ).limit(4)
        ]);

        const summary = {
            success: true,
            redZones,
            highRisk,
            totalHabitations,
            saferSites
        };

        cachedSummary = summary;
        cacheTime = Date.now();

        res.status(200).json(summary);

    } catch (error) {
        console.error("Landing summary error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load landing summary"
        });
    }
};

module.exports.getAuthorityStats = async(req, res) => {
    try{
        const [totalHabitations, highRisk, redZones, immediateRelocation] = await Promise.all([
            Habitation.countDocuments(),
            Habitation.countDocuments({riskLevel: { $in: ["RED", "ORANGE"]}}),
            Habitation.countDocuments({riskLevel: "RED"}),
            Habitation.countDocuments({ relocationPriority: "IMMEDIATE"})
        ]);

        res.status(200).json({
            success: true,
            totalHabitations,
            highRisk,
            redZones,
            immediateRelocation
        });
    }
    catch(err){
        console.error("Authority stats error:", err);
        res.status(500).json({success: false, message: "Failed to load stats"})
    }
}

module.exports.getAllHabitations = async(req, res) => {
    try{
        const habitations = await Habitation.find({});
        res.status(200).json({success: true, habitations});
    }
    catch(err){
        console.error("Get habitations error:", err);
        res.status(500).json({success: false, message: "Failed to load habitations"});
    }
}

module.exports.getHabitationRisk = async(req, res) => {
    try{
        const habitation = await Habitation.findOne({ habitationId: req.params.id});
        if (!habitation){
            return res.status(404).json({ success: false, message: "Habitation Not Found"});
        }
        res.status(200).json({success: true, habitation});
    }
    catch(err){
        console.error("Get habitation risk error:", err);
        res.status(500).json({ success: false, message: "Failed to load habitation"});
    }
}