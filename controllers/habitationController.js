const Habitation = require("../models/Habitation");
const RelocationSite = require("../models/RelocationSite");

// simple in-memory cache — avoids hitting MongoDB on every landing page visit
let cachedSummary = null;
let cacheTime = 0;
const CACHE_DURATION_MS = 60 * 1000; // 1 minute

exports.getLandingSummary = async (req, res) => {
    try {
        // serve from cache if still fresh
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

            // return actual site data, not just a count —
            // frontend needs names/scores to display, not a number
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