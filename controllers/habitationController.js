const Habitation = require("../models/Habitation.js");
const RelocationSite = require("../models/RelocationSite.js");

const {
    assessHabitation
} = require("../services/habitationAssessmentService.js");

const {
    getVillages, searchVillages, getHabitationPrediction, getMLHealth
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


        const result =
            await assessHabitation(
                habitation
            );


        if (!result.success) {

            return res.status(400).json({

                success: false,

                message:
                    result.error,

                missingFields:
                    result.missingFields || []

            });
        }


        // Real-time dashboard update
        const io =
            req.app.get("io");


        if (io) {

            io.emit(
                "riskUpdated",
                {
                    habitationId:
                        habitation.habitationId,

                    riskScore:
                        habitation.riskScore,

                    riskLevel:
                        habitation.riskLevel,

                    relocationPriority:
                        habitation.relocationPriority
                }
            );
        }


        return res.status(200).json({

            success: true,

            message:
                "Risk assessment completed successfully",

            data: {

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

                vulnerabilityScore:
                    habitation.vulnerabilityScore,

                riskProbability:
                    habitation.riskProbability,

                relocationProbability:
                    habitation.relocationProbability,

                capacityProbability:
                    habitation.capacityProbability,

                capacityRatio:
                    habitation.capacityRatio,

                capacityStatus:
                    habitation.capacityStatus,

                lastAssessment:
                    habitation.lastAssessment,

                modelVersion:
                    habitation.modelVersion

            }

        });

    } catch (error) {

        console.error(
            "Risk recalculation error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Risk calculation failed"

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

module.exports.createHabitation = async (req, res) => {
    try {
        const {
            habitationId, name, latitude, longitude,
            population, rainfall, riverLevel, floodHistory, buildingDamage,
            vulnerablePopulation, waterLevel, roadAccess, hospitalDistance,
            shelterCapacity, availableWater, foodStock, medicalCapacity
        } = req.body;

        if (!habitationId || !name) {
            return res.status(400).json({
                success: false,
                message: "habitationId and name are required"
            });
        }

        const requiredNumericFields = {
            population, rainfall, riverLevel, floodHistory, buildingDamage,
            vulnerablePopulation, waterLevel, roadAccess, hospitalDistance,
            shelterCapacity, availableWater, foodStock, medicalCapacity
        };

        const missing = Object.entries(requiredNumericFields)
            .filter(([, value]) => value === undefined || value === null || value === "")
            .map(([key]) => key);

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                missingFields: missing
            });
        }

        const existing = await Habitation.findOne({ habitationId });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "A habitation with this ID already exists"
            });
        }

        const habitation = new Habitation({
            habitationId,
            name,
            location: {
                type: "Point",
                coordinates: (latitude != null && longitude != null)
                    ? [Number(longitude), Number(latitude)]
                    : undefined
            },
            population, rainfall, riverLevel, floodHistory, buildingDamage,
            vulnerablePopulation, waterLevel, roadAccess, hospitalDistance,
            shelterCapacity, availableWater, foodStock, medicalCapacity
        });

        await habitation.save();

        // Immediately run through ML — this is the actual "authority submits, ML predicts" flow
        const result = await assessHabitation(habitation);

        if (!result.success) {
            return res.status(201).json({
                success: true,
                message: "Habitation created, but ML assessment failed",
                habitation,
                assessmentError: result.error
            });
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("riskUpdated", {
                habitationId: habitation.habitationId,
                name: habitation.name,
                riskScore: habitation.riskScore,
                riskLevel: habitation.riskLevel,
                relocationPriority: habitation.relocationPriority
            });
        }

        res.status(201).json({
            success: true,
            message: "Habitation created and assessed",
            habitation
        });
    } catch (error) {
        console.error("Create habitation error:", error);
        res.status(500).json({ success: false, message: "Failed to create habitation" });
    }
};

module.exports.updateInputs = async (req, res) => {

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


        const updatedHabitation =
            await updateHabitationInputs(
                habitation,
                req.body
            );


        return res.status(200).json({

            success: true,

            message:
                "Current habitation inputs updated successfully",

            data: {

                habitationId:
                    updatedHabitation.habitationId,

                name:
                    updatedHabitation.name,

                inputs: {

                    rainfall:
                        updatedHabitation.rainfall,

                    riverLevel:
                        updatedHabitation.riverLevel,

                    floodHistory:
                        updatedHabitation.floodHistory,

                    buildingDamage:
                        updatedHabitation.buildingDamage,

                    vulnerablePopulation:
                        updatedHabitation.vulnerablePopulation,

                    waterLevel:
                        updatedHabitation.waterLevel,

                    roadAccess:
                        updatedHabitation.roadAccess,

                    hospitalDistance:
                        updatedHabitation.hospitalDistance,

                    shelterCapacity:
                        updatedHabitation.shelterCapacity,

                    availableWater:
                        updatedHabitation.availableWater,

                    foodStock:
                        updatedHabitation.foodStock,

                    medicalCapacity:
                        updatedHabitation.medicalCapacity
                },

                assessmentStatus:
                    updatedHabitation.assessmentStatus

            }

        });

    } catch (error) {

        console.error(
            "Update habitation inputs error:",
            error
        );


        return res.status(400).json({

            success: false,

            message:
                error.message ||
                "Unable to update habitation inputs"

        });
    }
};

module.exports.getMLVillages = async (req, res) => {

    try {

        const data =
            await getVillages();


        return res.status(200).json({

            success: true,

            data

        });

    } catch (error) {

        console.error(
            "Get ML villages error:",
            error
        );


        return res.status(503).json({

            success: false,

            message:
                "Unable to fetch villages from ML service"

        });
    }
};

module.exports.searchMLVillages = async (req, res) => {

    try {

        const query =
            String(req.query.q || "")
                .trim();


        if (!query) {

            return res.status(400).json({

                success: false,

                message:
                    "Search query is required"

            });
        }


        const data =
            await searchVillages(query);


        return res.status(200).json({

            success: true,

            data

        });

    } catch (error) {

        console.error(
            "Village search error:",
            error
        );


        return res.status(503).json({

            success: false,

            message:
                "Unable to search villages"

        });
    }
};

module.exports.getAssessmentStatus = async (req, res) => {
    try {
        const total = await Habitation.countDocuments();

        const assessed = await Habitation.countDocuments({
            assessmentStatus: "ASSESSED"
        });

        const notAssessed = await Habitation.countDocuments({
            assessmentStatus: "NOT_ASSESSED"
        });

        const missingInputs = await Habitation.countDocuments({
            assessmentStatus: "INPUTS_MISSING"
        });

        const mlErrors = await Habitation.countDocuments({
            assessmentStatus: "ML_ERROR"
        });

        return res.status(200).json({
            success: true,
            data: {
                total,
                assessed,
                notAssessed,
                missingInputs,
                mlErrors
            }
        });

    } catch (error) {
        console.error(
            "Assessment status error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to get assessment status"
        });
    }
};

exports.assessVillage = async (req, res) => {
    try {
        const {
            villageCode,
            villageName,
            population,

            rainfall,
            riverLevel,
            floodHistory,
            buildingDamage,
            vulnerablePopulation,
            waterLevel,
            roadAccess,
            hospitalDistance,
            shelterCapacity,
            availableWater,
            foodStock,
            medicalCapacity
        } = req.body;

        if (!villageCode) {
            return res.status(400).json({
                success: false,
                message: "Village code is required"
            });
        }

        const requiredInputs = {
            rainfall,
            riverLevel,
            floodHistory,
            buildingDamage,
            vulnerablePopulation,
            waterLevel,
            roadAccess,
            hospitalDistance,
            shelterCapacity,
            availableWater,
            foodStock,
            medicalCapacity
        };

        const missingFields = Object.entries(requiredInputs)
            .filter(
                ([, value]) =>
                    value === undefined ||
                    value === null ||
                    value === ""
            )
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "All current condition fields are required",
                missingFields
            });
        }

        /*
         * Find existing assessment for this village.
         * This prevents creating duplicate MongoDB documents
         * every time authority reassesses the same village.
         */

        let habitation = await Habitation.findOne({
            habitationId: String(villageCode)
        });

        if (!habitation) {
            habitation = new Habitation({
                habitationId: String(villageCode),
                name: villageName,
                population: Number(population) || 0,

                assessmentStatus: "NOT_ASSESSED",

                rainfall: Number(rainfall),
                riverLevel: Number(riverLevel),
                floodHistory: Number(floodHistory),
                buildingDamage: Number(buildingDamage),
                vulnerablePopulation: Number(vulnerablePopulation),
                waterLevel: Number(waterLevel),
                roadAccess: Number(roadAccess),
                hospitalDistance: Number(hospitalDistance),
                shelterCapacity: Number(shelterCapacity),
                availableWater: Number(availableWater),
                foodStock: Number(foodStock),
                medicalCapacity: Number(medicalCapacity)
            });
        } else {
            habitation.name = villageName;
            habitation.population = Number(population) || 0;

            habitation.rainfall = Number(rainfall);
            habitation.riverLevel = Number(riverLevel);
            habitation.floodHistory = Number(floodHistory);
            habitation.buildingDamage = Number(buildingDamage);
            habitation.vulnerablePopulation =
                Number(vulnerablePopulation);
            habitation.waterLevel = Number(waterLevel);
            habitation.roadAccess = Number(roadAccess);
            habitation.hospitalDistance =
                Number(hospitalDistance);
            habitation.shelterCapacity =
                Number(shelterCapacity);
            habitation.availableWater =
                Number(availableWater);
            habitation.foodStock = Number(foodStock);
            habitation.medicalCapacity =
                Number(medicalCapacity);
        }

        /*
         * Ask ML service for prediction
         */

        const prediction = await getHabitationPrediction({
            habitationId: String(villageCode),
            name: villageName,
            population: Number(population),

            rainfall: Number(rainfall),
            riverLevel: Number(riverLevel),
            floodHistory: Number(floodHistory),
            buildingDamage: Number(buildingDamage),
            vulnerablePopulation: Number(vulnerablePopulation),
            waterLevel: Number(waterLevel),
            roadAccess: Number(roadAccess),
            hospitalDistance: Number(hospitalDistance),
            shelterCapacity: Number(shelterCapacity),
            availableWater: Number(availableWater),
            foodStock: Number(foodStock),
            medicalCapacity: Number(medicalCapacity)
        });

        if (!prediction || prediction.success === false) {
            habitation.assessmentStatus = "ML_ERROR";
            habitation.assessmentError =
                prediction?.error || "ML prediction failed";

            await habitation.save();

            return res.status(500).json({
                success: false,
                message: "ML prediction failed",
                error: prediction?.error
            });
        }

        /*
         * Save ML result
         */

        habitation.riskScore = Number(prediction.riskScore) || 0;

        habitation.riskLevel =
            prediction.riskLevel || "GREEN";

        habitation.relocationPriority =
            prediction.relocationPriority || "MONITOR";

        if (
            prediction.vulnerabilityScore !== undefined &&
            prediction.vulnerabilityScore !== null
        ) {
            habitation.vulnerabilityScore =
                Number(prediction.vulnerabilityScore);
        }

        habitation.hazards = prediction.hazards || {};

        habitation.riskProbability =
            prediction.details?.riskProbability ?? null;

        habitation.relocationProbability =
            prediction.details?.relocation?.probability ?? null;

        habitation.capacityProbability =
            prediction.details?.carryingCapacity?.probability ?? null;

        habitation.capacityRatio =
            prediction.details?.carryingCapacity?.capacityRatio ?? null;

        habitation.capacityStatus =
            prediction.details?.carryingCapacity?.status ?? null;

        habitation.assessmentStatus = "ASSESSED";
        habitation.assessmentError = null;
        habitation.modelVersion =
            prediction.modelVersion || "unknown";
        habitation.lastAssessment = new Date();

        await habitation.save();

        return res.status(200).json({
            success: true,
            message: "Village assessed successfully",
            habitation
        });

    } catch (error) {
        console.error("Assess village error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to assess village",
            error: error.message
        });
    }
};