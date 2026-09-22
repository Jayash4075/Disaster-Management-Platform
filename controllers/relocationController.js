const Habitation = require("../models/Habitation");
const RelocationSite = require("../models/RelocationSite");

module.exports.getRecommendedSite = async (req, res) => {
    try {
        const habitation = await Habitation.findOne({
            habitationId: req.params.id
        }).lean();

        if (!habitation) {
            return res.status(404).json({
                success: false,
                message: "Habitation not found"
            });
        }

        const sites = await RelocationSite.find({
            "capacity.available": {
                $gte: habitation.population || 0
            }
        })
            .sort({
                suitabilityScore: -1
            })
            .lean();


        if (sites.length === 0) {
            return res.status(200).json({
                success: true,
                habitationId: habitation.habitationId,
                habitationName: habitation.name,
                recommendations: [],
                message:
                    "No relocation site with sufficient capacity found"
            });
        }

        const best = sites[0];
        const reasons = [];
        if (
            best.capacity &&
            best.capacity.available >=
                (habitation.population || 0)
        ) {
            reasons.push(
                "Adequate available capacity"
            );
        }
        if (
            typeof best.suitabilityScore === "number"
        ) {
            reasons.push(
                "High suitability score"
            );
        }


        return res.status(200).json({

            success: true,
            habitationId: habitation.habitationId,

            habitationName: habitation.name,

            population: habitation.population || 0,

            recommendedSite: {
                siteId: best.siteId,

                name: best.name,

                location: best.location,

                suitabilityScore: best.suitabilityScore || 0,

                capacity: {
                    total: best.capacity?.total || 0,

                    occupied: best.capacity?.occupied || 0,

                    available: best.capacity?.available || 0
                }
            },

            reasons
        });


    } catch (error) {
        console.error(
            "Recommended site error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to recommend relocation site"
        });
    }
};

module.exports.getPriorityVillages = async (req, res) => {
    try {
        const villages = await Habitation.find({
            relocationPriority: { $in: ["IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM"] }
        }).sort({ riskScore: -1 }).lean();

        return res.status(200).json({
            success: true,
            total: villages.length,
            villages // FIXED typo
        });
    } catch (error) {
        console.error("Relocation priority error:", error);
        return res.status(500).json({ success: false, message: "Failed to load relocation priorities" });
    }
};

module.exports.getAllSites = async (req, res) => {
    try {
        const sites = await RelocationSite.find({}).lean();
        res.status(200).json({ success: true, data: sites });
    } catch (error) {
        console.error("Get all sites error:", error);
        res.status(500).json({ success: false, message: "Failed to load relocation sites" });
    }
};

module.exports.getSafeSites = async (req, res) => {
    try {
        const sites = await RelocationSite.find({
            "capacity.available": {
                $gt: 0
            }
        })
        .sort({
            suitabilityScore: -1
        })
        .lean();

        return res.status(200).json({
            success: true,
            count: sites.length,
            sites
        });

    } catch (error) {
        console.error(
            "Safe sites error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load safe sites"
        });
    }
};

// relocationController.js — add alongside getAllSites
module.exports.createSite = async (req, res) => {
    try {
        const { siteId, name, location, capacity, suitabilityScore } = req.body;
        if (!siteId || !name || !location?.coordinates || capacity?.total == null) {
            return res.status(400).json({ success: false, message: "siteId, name, location, and capacity.total are required" });
        }
        const existing = await RelocationSite.findOne({ siteId });
        if (existing) {
            return res.status(409).json({ success: false, message: "A site with this ID already exists" });
        }
        const site = await RelocationSite.create({
            siteId, name,
            location: { type: "Point", coordinates: location.coordinates },
            capacity: {
                total: capacity.total,
                occupied: capacity.occupied || 0,
                available: capacity.total - (capacity.occupied || 0)
            },
            suitabilityScore: suitabilityScore || 70
        });
        res.status(201).json({ success: true, site });
    } catch (error) {
        console.error("Create site error:", error);
        res.status(500).json({ success: false, message: "Failed to create site" });
    }
};