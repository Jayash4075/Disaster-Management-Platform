const Habitation = require("../models/Habitation.js");
const RelocationSite = require("../models/RelocationSite.js");
const {assessHabitation} = require("../services/habitationAssessmentService.js");
const {getMLHealth} = require("../utils/mlService");

//Get All Habitations

module.exports.getHabitations = async(req, res) => {
    try{
        const {riskLevel, relocationPriority, page = 1, limit = 50} = req.query;
        const filter = {};

        if (riskLevel){
            filter.riskLevel = riskLevel.toUpperCase();
        }
        if (relocationPriority){
            filter.relocationPriority = relocationPriority.toUpperCase();
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(Math.max(Number(limit) || 50, 1), 100);
        const skip  = (pageNumber - 1) * limitNumber;
        const [habitations, total] = await Promise.all([
            Habitation.find(filter)
                .sort({
                    riskScore: -1
                })
                .skip(skip)
                .limit(limitNumber)
                .lean(),
            Habitation.countDocuments(filter)
        ]);
        res.status(200).json({
            success: true,
            data: habitations,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                pages: Math.ceil(total/limitNumber)
            }
        });
    }
    catch(error){
        console.error("Get Habitations error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load Habitations"
        });
    }
};

//Get One Habitation

module.exports.getHabitation = async(req, res) => {
    try{
        const habitation = await Habitation.findOne({
            habitationId: req.params.id
        }).lean();

        if (!habitation){
            return res.status(404).json({
                success: false,
                message: "Habitation not found"
            });
        }

        res.status(200).json({
            success: true,
            habitation
        });
    }
    catch(error){
        res.status(500).json({
            success: false,
            message: "Failed to load habitation"
        });
    }
};

//Recalculate One Habitation

module.exports.recalculateRisk = async(req, res) => {
    try{
        const habitation = await Habitation.findOne({
            habitationId: req.params.id
        });

        if (!habitation){
            return res.status(404).json({
                success: false,
                message: "Habitation not found"
            });

        }

        const result = await assessHabitation(habitation);

        if (!result.success){
            return res.status(422).json({
                success: false,
                message: result.error || "Assessment Failed",
                missingFields: result.missingFields || []
            });
        }

        //Real time update

        const io = req.app.get("io");

        if (io){
            io.emit("riskUpdated", {
                habitationId: habitation.habitationId,
                name: habitation.name,
                riskScore: habitation.riskScore,
                riskLevel: habitation.riskLevel,
                relocationPriority: habitation.relocationPriority
            });
        }

        res.status(200).json({
            success: true,
            message: "Risk recalculated successfully",
            habitation
        });
    }
    catch(error){
        console.error("Recalculte error:", error);
        res.status(503).json({
            success: false,
            message: "ML assesment failed",
            detail: error.message
        });
    }
};

//Sync All Hbitations

module.exports.syncAllFromML = async(req, res) => {
    try{
        const habitations = await Habitation.find({});
        const results = [];
        let updated = 0;
        let skipped = 0;
        let failed = 0;
        for (const habitation of habitations){
            try{
                const result = await assessHabitation(habitation);
                if (result.success){
                    updated++;
                    results.push({
                        habitationId: habitation.habitationId,
                        name: habitation.name,
                        status: "updated",
                        riskLevel: habitation.riskLevel
                    });
                }
                else{
                    skipped++;
                    results.push({
                        habitationId: habitation.habitationId,
                        name: habitation.name,
                        status: "skipped",
                        reason: result.error,
                        missingFields: result.missingFields || []
                    });
                }
            }
            catch(error){
                failed++;
                results.push({
                    habitationId: habitation.habitationId,
                    name: habitation.name,
                    status: "failed",
                    error: error.message
                });
            }
        }

        res.status(200).json({
            success: true,
            total: habitations.length,
            updated,
            skipped,
            failed,
            results
        });
    }
    catch(error){
        console.error("Bulk sync error:", error);

        res.status(500).json({
            success: false,
            message: "Bulk sync failed"
        });

    }
};

//Authoriity Stats

module.exports.getAuthorityStats = async(req, res) => {
    try{
        const habitations = await Habitation.find({}).lean();
        const safeSites = await RelocationSite.countDocuments({
            "capacity.available": {$gt: 0}
        });
        const redZones = habitations.filter(h => h.riskLevel === "RED").length;
        const peopleAtRisk = habitations
            .filter(h => ["RED", 'ORANGE'].includes(h.riskLevel))
            .reduce((sum, h) => sum+ (h.population || 0),0);

        const immediateRelocation = habitations.filter(h => h.relocationPriority === "IMMEDIATE").length;

        res.status(200).json({
            success: true,
            criticalRedZones: redZones,
            peopleAtRisk,
            immediateRelocation,
            safeSites
        });
    }
    catch(error){
        console.error("Authority stats error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load authority stats"
        });
    }
};

//Hazard Overview

module.exports.getHazardOverview = async(req, res) => {
    try{
        const habitations = await Habitation.find({
            "hazards.flood": {$exists: true}
        }).lean();

        if (!habitations.length){
            return res.status(200).json({
                success: true,
                hazards: null,
                message: "No assessed hazard data available"
            });
        }
        const average = field => {
            const values = habitations
                .map(
                    h => h.hazards?.[field]
                )
                .filter(
                    value => 
                        typeof value === "number"
                );

            if (!values.length) return 0;

            return Math.round(values.reduce(
                (a, b) => a + b, 0)/values.length
            );
        };

        res.status(200).json({
            success: true,
            hazards: {
                flood: average("flood"),
                landslide: average("landslide"),
                erosion: average("erosion"),
                cloudburst: average("cloudburst"),
            }
        });
    }
    catch(error){
        res.status(500).json({
            success: false,
            message: "Failed to load hazard Overview"
        });
    }
};

//ML Health

module.exports.getMLServiceStatus = async(req, res) => {
    try{
        const health = await getMLHealth();
        res.status(200).json({
            success: true,
            mlService: health
        });
    }
    catch(error){
        res.status(503).json({
            success: false,
            mlService: {
                status: "unavailable"
                
            }
        });
    }
};

