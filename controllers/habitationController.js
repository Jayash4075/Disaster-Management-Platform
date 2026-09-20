const Habitation = require("../models/Habitation.js");
const RelocationSite = require("../models/RelocationSite.js");

const {
    assessHabitation
} = require("../services/habitationAssessmentService.js");

const {
    getMLHealth
} = require("../utils/mlService");


// ============================================================
// GET ALL HABITATIONS
// ============================================================

module.exports.getHabitations = async (req, res) => {
    try {
        const {
            riskLevel,
            relocationPriority,
            page = 1,
            limit = 50
        } = req.query;

        const filter = {};

        if (riskLevel) {
            filter.riskLevel = riskLevel.toUpperCase();
        }

        if (relocationPriority) {
            filter.relocationPriority =
                relocationPriority.toUpperCase();
        }

        const pageNumber = Math.max(
            Number(page) || 1,
            1
        );

        const limitNumber = Math.min(
            Math.max(Number(limit) || 50, 1),
            100
        );

        const skip =
            (pageNumber - 1) * limitNumber;

        const [
            habitations,
            total
        ] = await Promise.all([
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
                pages: Math.ceil(
                    total / limitNumber
                )
            }
        });
    } catch (error) {
        console.error(
            "Get Habitations error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to load Habitations"
        });
    }
};


// ============================================================
// GET ONE HABITATION
// ============================================================

module.exports.getHabitation = async (req, res) => {
    try {
        const habitation =
            await Habitation.findOne({
                habitationId: req.params.id
            }).lean();

        if (!habitation) {
            return res.status(404).json({
                success: false,
                message:
                    "Habitation not found"
            });
        }

        res.status(200).json({
            success: true,
            habitation
        });
    } catch (error) {
        console.error(
            "Get habitation error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to load habitation"
        });
    }
};


// ============================================================
// RECALCULATE ONE HABITATION USING ML
// ============================================================

module.exports.recalculateRisk = async (req, res) => {
    try {
        const habitation =
            await Habitation.findOne({
                habitationId: req.params.id
            });

        if (!habitation) {
            return res.status(404).json({
                success: false,
                message:
                    "Habitation not found"
            });
        }

        /*
         * Send habitation to ML service.
         */
        const result =
            await assessHabitation(
                habitation
            );

        /*
         * Required ML inputs are missing.
         */
        if (!result.success) {
            return res.status(422).json({
                success: false,

                message:
                    result.error ||
                    "Assessment failed",

                missingFields:
                    result.missingFields || []
            });
        }

        /*
         * Real-time dashboard update.
         */
        const io = req.app.get("io");

        if (io) {
            io.emit("riskUpdated", {
                habitationId:
                    habitation.habitationId,

                name:
                    habitation.name,

                riskScore:
                    habitation.riskScore,

                riskLevel:
                    habitation.riskLevel,

                relocationPriority:
                    habitation.relocationPriority,

                assessmentStatus:
                    habitation.assessmentStatus
            });
        }

        res.status(200).json({
            success: true,

            message:
                "Risk recalculated successfully",

            habitation
        });
    } catch (error) {
        console.error(
            "Recalculate error:",
            error
        );

        res.status(503).json({
            success: false,

            message:
                "ML assessment failed",

            detail:
                error.message
        });
    }
};


// ============================================================
// SYNC ALL HABITATIONS WITH ML
// ============================================================

module.exports.syncAllFromML = async (req, res) => {
    try {
        const habitations =
            await Habitation.find({});

        const results = [];

        let updated = 0;
        let skipped = 0;
        let failed = 0;

        for (const habitation of habitations) {
            try {
                const result =
                    await assessHabitation(
                        habitation
                    );

                if (result.success) {
                    updated++;

                    results.push({
                        habitationId:
                            habitation.habitationId,

                        name:
                            habitation.name,

                        status:
                            "updated",

                        riskLevel:
                            habitation.riskLevel,

                        assessmentStatus:
                            habitation.assessmentStatus
                    });
                } else {
                    skipped++;

                    results.push({
                        habitationId:
                            habitation.habitationId,

                        name:
                            habitation.name,

                        status:
                            "skipped",

                        reason:
                            result.error,

                        missingFields:
                            result.missingFields || [],

                        assessmentStatus:
                            habitation.assessmentStatus
                    });
                }
            } catch (error) {
                failed++;

                results.push({
                    habitationId:
                        habitation.habitationId,

                    name:
                        habitation.name,

                    status:
                        "failed",

                    error:
                        error.message
                });
            }
        }

        res.status(200).json({
            success: true,

            total:
                habitations.length,

            updated,

            skipped,

            failed,

            results
        });
    } catch (error) {
        console.error(
            "Bulk sync error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Bulk sync failed"
        });
    }
};


// ============================================================
// AUTHORITY STATS
// ============================================================

module.exports.getAuthorityStats = async (req, res) => {
    try {
        /*
         * VERY IMPORTANT:
         *
         * Only villages successfully assessed by ML
         * should contribute to risk statistics.
         */
        const assessedHabitations =
            await Habitation.find({
                assessmentStatus: "ASSESSED"
            }).lean();

        /*
         * Safe sites are actual relocation sites.
         * They do not require habitation ML assessment.
         */
        const safeSites =
            await RelocationSite.countDocuments({
                "capacity.available": {
                    $gt: 0
                }
            });

        /*
         * Critical RED zones from ML results only.
         */
        const redZones =
            assessedHabitations.filter(
                habitation =>
                    habitation.riskLevel === "RED"
            ).length;

        /*
         * Population at risk:
         * RED + ORANGE ML-assessed villages only.
         */
        const peopleAtRisk =
            assessedHabitations
                .filter(
                    habitation =>
                        [
                            "RED",
                            "ORANGE"
                        ].includes(
                            habitation.riskLevel
                        )
                )
                .reduce(
                    (sum, habitation) =>
                        sum +
                        (habitation.population || 0),
                    0
                );

        /*
         * Immediate relocation:
         * ML-assessed villages only.
         */
        const immediateRelocation =
            assessedHabitations.filter(
                habitation =>
                    habitation.relocationPriority ===
                    "IMMEDIATE"
            ).length;

        res.status(200).json({
            success: true,

            dataSource: {
                mlService: true,

                assessedVillages:
                    assessedHabitations.length
            },

            criticalRedZones:
                redZones,

            peopleAtRisk,

            immediateRelocation,

            safeSites
        });
    } catch (error) {
        console.error(
            "Authority stats error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to load authority stats"
        });
    }
};


// ============================================================
// HAZARD OVERVIEW
// ============================================================

module.exports.getHazardOverview = async (req, res) => {
    try {
        /*
         * Only use ML-assessed villages.
         */
        const habitations =
            await Habitation.find({
                assessmentStatus: "ASSESSED",

                "hazards.flood": {
                    $exists: true
                }
            }).lean();

        if (!habitations.length) {
            return res.status(200).json({
                success: true,

                hazards: null,

                message:
                    "No assessed hazard data available"
            });
        }

        const average = field => {
            const values =
                habitations
                    .map(
                        habitation =>
                            habitation.hazards?.[
                                field
                            ]
                    )
                    .filter(
                        value =>
                            typeof value ===
                            "number"
                    );

            if (!values.length) {
                return 0;
            }

            return Math.round(
                values.reduce(
                    (a, b) => a + b,
                    0
                ) / values.length
            );
        };

        res.status(200).json({
            success: true,

            hazards: {
                flood:
                    average("flood"),

                landslide:
                    average("landslide"),

                erosion:
                    average("erosion"),

                cloudburst:
                    average("cloudburst")
            }
        });
    } catch (error) {
        console.error(
            "Hazard overview error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to load hazard overview"
        });
    }
};


// ============================================================
// ML SERVICE HEALTH
// ============================================================

module.exports.getMLServiceStatus = async (req, res) => {
    try {
        const health =
            await getMLHealth();

        res.status(200).json({
            success: true,

            mlService: health
        });
    } catch (error) {
        console.error(
            "ML health check error:",
            error.message
        );

        res.status(503).json({
            success: false,

            mlService: {
                status:
                    "unavailable"
            }
        });
    }
};