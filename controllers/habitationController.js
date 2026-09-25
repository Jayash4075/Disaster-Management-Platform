const Habitation = require("../models/Habitation.js");
const RelocationSite = require("../models/RelocationSite.js");

const {
    assessHabitation,
    updateHabitationInputs
} = require("../services/habitationAssessmentService.js");

const {
    getMLHealth,
    getVillages,
    searchVillages
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
            filter.riskLevel =
                riskLevel.toUpperCase();
        }


        if (relocationPriority) {
            filter.relocationPriority =
                relocationPriority.toUpperCase();
        }


        const pageNumber =
            Math.max(
                Number(page) || 1,
                1
            );


        const limitNumber =
            Math.min(
                Math.max(
                    Number(limit) || 50,
                    1
                ),
                100
            );


        const skip =
            (pageNumber - 1) *
            limitNumber;


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

            Habitation.countDocuments(
                filter
            )

        ]);


        res.status(200).json({

            success: true,

            data:
                habitations,

            pagination: {

                page:
                    pageNumber,

                limit:
                    limitNumber,

                total,

                pages:
                    Math.ceil(
                        total /
                        limitNumber
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

module.exports.getHabitation = async (
    req,
    res
) => {

    try {

        const habitation =
            await Habitation.findOne({

                habitationId:
                    req.params.id

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

module.exports.recalculateRisk = async (
    req,
    res
) => {

    try {

        const habitation =
            await Habitation.findOne({

                habitationId:
                    req.params.id

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


        // ====================================================
        // REAL-TIME DASHBOARD UPDATE
        // ====================================================

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

module.exports.syncAllFromML = async (
    req,
    res
) => {

    try {

        const habitations =
            await Habitation.find({});


        const results = [];


        let updated = 0;
        let skipped = 0;
        let failed = 0;


        for (
            const habitation
            of habitations
        ) {

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

module.exports.getAuthorityStats = async (
    req,
    res
) => {

    try {

        const assessedHabitations =
            await Habitation.find({

                assessmentStatus:
                    "ASSESSED"

            }).lean();


        const safeSites =
            await RelocationSite.countDocuments({

                "capacity.available": {
                    $gt: 0
                }

            });


        const redZones =
            assessedHabitations.filter(
                habitation =>
                    habitation.riskLevel ===
                    "RED"
            ).length;


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
                    (
                        sum,
                        habitation
                    ) =>
                        sum +
                        (
                            habitation.population ||
                            0
                        ),
                    0
                );


        const immediateRelocation =
            assessedHabitations.filter(
                habitation =>
                    habitation.relocationPriority ===
                    "IMMEDIATE"
            ).length;


        res.status(200).json({

            success: true,

            dataSource: {

                mlService:
                    true,

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

module.exports.getHazardOverview = async (
    req,
    res
) => {

    try {

        const habitations =
            await Habitation.find({

                assessmentStatus:
                    "ASSESSED",

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


        const average =
            field => {

                const values =
                    habitations

                        .map(
                            habitation =>
                                habitation
                                    .hazards?.[
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
                        (a, b) =>
                            a + b,
                        0
                    ) /
                    values.length

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

module.exports.getMLServiceStatus = async (
    req,
    res
) => {

    try {

        const health =
            await getMLHealth();


        res.status(200).json({

            success: true,

            mlService:
                health

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


// ============================================================
// CREATE HABITATION
// ============================================================

module.exports.createHabitation = async (
    req,
    res
) => {

    try {

        const {

            habitationId,
            name,
            latitude,
            longitude,

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


        if (
            !habitationId ||
            !name
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "habitationId and name are required"

            });

        }


        const requiredNumericFields = {

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

        };


        const missing =
            Object.entries(
                requiredNumericFields
            )

                .filter(
                    ([, value]) =>
                        value === undefined ||
                        value === null ||
                        value === ""
                )

                .map(
                    ([key]) => key
                );


        if (missing.length > 0) {

            return res.status(400).json({

                success: false,

                message:
                    "Missing required fields",

                missingFields:
                    missing

            });

        }


        const existing =
            await Habitation.findOne({

                habitationId

            });


        if (existing) {

            return res.status(409).json({

                success: false,

                message:
                    "A habitation with this ID already exists"

            });

        }


        const habitation =
            new Habitation({

                habitationId,

                name,

                location: {

                    type: "Point",

                    coordinates:
                        (
                            latitude != null &&
                            longitude != null
                        )

                            ? [
                                Number(longitude),
                                Number(latitude)
                            ]

                            : undefined

                },

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

            });


        await habitation.save();


        // ====================================================
        // IMMEDIATELY RUN ML
        // ====================================================

        const result =
            await assessHabitation(
                habitation
            );


        if (!result.success) {

            return res.status(201).json({

                success: true,

                message:
                    "Habitation created, but ML assessment failed",

                habitation,

                assessmentError:
                    result.error

            });

        }


        const io =
            req.app.get("io");


        if (io) {

            io.emit(
                "riskUpdated",
                {

                    habitationId:
                        habitation.habitationId,

                    name:
                        habitation.name,

                    riskScore:
                        habitation.riskScore,

                    riskLevel:
                        habitation.riskLevel,

                    relocationPriority:
                        habitation.relocationPriority

                }
            );

        }


        res.status(201).json({

            success: true,

            message:
                "Habitation created and assessed",

            habitation

        });

    } catch (error) {

        console.error(
            "Create habitation error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to create habitation"

        });

    }

};


// ============================================================
// UPDATE CURRENT HABITATION INPUTS
// ============================================================

module.exports.updateInputs = async (
    req,
    res
) => {

    try {

        const habitation =
            await Habitation.findOne({

                habitationId:
                    req.params.id

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


// ============================================================
// GET VILLAGES FROM ML SERVICE
// ============================================================

module.exports.getMLVillages = async (
    req,
    res
) => {

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


// ============================================================
// SEARCH VILLAGES
// ============================================================

module.exports.searchMLVillages = async (
    req,
    res
) => {

    try {

        const query =
            String(
                req.query.q || ""
            ).trim();


        if (!query) {

            return res.status(400).json({

                success: false,

                message:
                    "Search query is required"

            });

        }


        const data =
            await searchVillages(
                query
            );


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


// ============================================================
// ASSESSMENT STATUS
// ============================================================

module.exports.getAssessmentStatus = async (
    req,
    res
) => {

    try {

        const total =
            await Habitation.countDocuments();


        const assessed =
            await Habitation.countDocuments({

                assessmentStatus:
                    "ASSESSED"

            });


        const notAssessed =
            await Habitation.countDocuments({

                assessmentStatus:
                    "NOT_ASSESSED"

            });


        const missingInputs =
            await Habitation.countDocuments({

                assessmentStatus:
                    "INPUTS_MISSING"

            });


        const mlErrors =
            await Habitation.countDocuments({

                assessmentStatus:
                    "ML_ERROR"

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

            message:
                "Unable to get assessment status"

        });

    }

};


// ============================================================
// ASSESS VILLAGE
// ============================================================

module.exports.assessVillage = async (
    req,
    res
) => {

    try {

        const {

            villageCode,
            villageName,

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
            medicalCapacity,

            latitude,
            longitude

        } = req.body;


        // ====================================================
        // 1. CHECK VILLAGE
        // ====================================================

        if (
            !villageCode &&
            !villageName
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Village code or village name is required."

            });

        }


        // ====================================================
        // 2. CHECK ASSESSMENT INPUTS
        // ====================================================

        const fields = {

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


        const missingFields =
            Object.entries(fields)

                .filter(
                    ([, value]) =>
                        value === undefined ||
                        value === null ||
                        value === ""
                )

                .map(
                    ([key]) => key
                );


        if (
            missingFields.length > 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Some assessment inputs are missing.",

                missingFields

            });

        }


        // ====================================================
        // 3. GET VILLAGE FROM ML DATASET
        // ====================================================

        let villagesResponse;


        if (villageName) {

            villagesResponse =
                await searchVillages(
                    villageName
                );

        } else {

            villagesResponse =
                await getVillages();

        }


        // ====================================================
        // 4. NORMALIZE ML RESPONSE
        // ====================================================

        const villages =
            Array.isArray(
                villagesResponse
            )

                ? villagesResponse

                : villagesResponse?.data ||
                  villagesResponse?.villages ||
                  [];


        console.log(
            "Number of villages received:",
            villages.length
        );


        // ====================================================
        // 5. FIND SELECTED VILLAGE
        // ====================================================

        let selectedVillage =
            villages.find(
                (village) => {

                    const code =
                        village.village_code ??
                        village.villageCode ??
                        village.code;


                    return (
                        String(code) ===
                        String(villageCode)
                    );

                }
            );


        // If code wasn't found, search by name

        if (
            !selectedVillage &&
            villageName
        ) {

            selectedVillage =
                villages.find(
                    (village) => {

                        const name =
                            village.village_name ??
                            village.villageName ??
                            village.name;


                        return (

                            String(name)
                                .toLowerCase()
                                .trim()

                            ===

                            String(villageName)
                                .toLowerCase()
                                .trim()

                        );

                    }
                );

        }


        // ====================================================
        // 6. VILLAGE NOT FOUND
        // ====================================================

        if (!selectedVillage) {

            console.log(
                "Village not found:",
                {
                    villageCode,
                    villageName
                }
            );


            return res.status(404).json({

                success: false,

                message:
                    "Selected village was not found in ML dataset."

            });

        }


        // ====================================================
        // 7. GET SELECTED VILLAGE DETAILS
        // ====================================================

        const selectedVillageCode =
            selectedVillage.village_code ??
            selectedVillage.villageCode ??
            selectedVillage.code ??
            villageCode;


        const selectedVillageName =
            selectedVillage.village_name ??
            selectedVillage.villageName ??
            selectedVillage.name ??
            villageName;


        const population =
            Number(
                selectedVillage.population
            );


        const datasetVulnerabilityScore =
            selectedVillage
                .vulnerability_score_100;


        const datasetVulnerabilityCategory =
            selectedVillage
                .vulnerability_category;


        console.log(
            "Selected village:",
            {

                code:
                    selectedVillageCode,

                name:
                    selectedVillageName,

                population,

                vulnerabilityScore:
                    datasetVulnerabilityScore,

                vulnerabilityCategory:
                    datasetVulnerabilityCategory

            }
        );


        // ====================================================
        // 8. POPULATION VALIDATION
        // ====================================================

        if (
            !Number.isFinite(
                population
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Population data is unavailable for this village.",

                village:
                    selectedVillage

            });

        }


        // ====================================================
        // 9. BUILD HABITATION DATA
        // ====================================================

        const habitationData = {

            habitationId:
                String(
                    selectedVillageCode
                ),

            name:
                String(
                    selectedVillageName
                ),

            population,

            rainfall:
                Number(rainfall),

            riverLevel:
                Number(riverLevel),

            floodHistory:
                Number(floodHistory),

            buildingDamage:
                Number(buildingDamage),

            vulnerablePopulation:
                Number(vulnerablePopulation),

            waterLevel:
                Number(waterLevel),

            roadAccess:
                Number(roadAccess),

            hospitalDistance:
                Number(hospitalDistance),

            shelterCapacity:
                Number(shelterCapacity),

            availableWater:
                Number(availableWater),

            foodStock:
                Number(foodStock),

            medicalCapacity:
                Number(medicalCapacity)

        };


        // ====================================================
        // 10. OPTIONAL LOCATION
        // ====================================================

        if (

            latitude !== undefined &&
            latitude !== null &&

            longitude !== undefined &&
            longitude !== null

        ) {

            const lat =
                Number(latitude);

            const lng =
                Number(longitude);


            if (
                Number.isFinite(lat) &&
                Number.isFinite(lng)
            ) {

                habitationData.location = {

                    type:
                        "Point",

                    coordinates: [
                        lng,
                        lat
                    ]

                };

            }

        }


        // ====================================================
        // 11. VALIDATE NUMERIC VALUES
        // ====================================================

        const numericFields = [

            "population",
            "rainfall",
            "riverLevel",
            "floodHistory",
            "buildingDamage",
            "vulnerablePopulation",
            "waterLevel",
            "roadAccess",
            "hospitalDistance",
            "shelterCapacity",
            "availableWater",
            "foodStock",
            "medicalCapacity"

        ];


        const invalidFields =
            numericFields.filter(
                field =>
                    !Number.isFinite(
                        Number(
                            habitationData[
                                field
                            ]
                        )
                    )
            );


        if (
            invalidFields.length > 0
        ) {

            console.log(
                "Invalid habitation fields:",
                invalidFields
            );


            console.log(
                "Habitation data:",
                habitationData
            );


            return res.status(400).json({

                success: false,

                message:
                    "Invalid numeric assessment values.",

                invalidFields

            });

        }


        // ====================================================
        // 12. FIND EXISTING HABITATION
        // ====================================================

        let habitation =
            await Habitation.findOne({

                habitationId:
                    habitationData.habitationId

            });


        let isNewHabitation =
            false;


        // ====================================================
        // 13. CREATE OR UPDATE HABITATION
        // ====================================================

        if (!habitation) {

            // -----------------------------------------------
            // NEW VILLAGE
            // -----------------------------------------------

            habitation =
                new Habitation(
                    habitationData
                );


            isNewHabitation =
                true;

        } else {

            // -----------------------------------------------
            // EXISTING VILLAGE
            // -----------------------------------------------

            habitation.name =
                habitationData.name;


            habitation.population =
                habitationData.population;


            habitation.rainfall =
                habitationData.rainfall;

            habitation.riverLevel =
                habitationData.riverLevel;

            habitation.floodHistory =
                habitationData.floodHistory;

            habitation.buildingDamage =
                habitationData.buildingDamage;

            habitation.vulnerablePopulation =
                habitationData.vulnerablePopulation;

            habitation.waterLevel =
                habitationData.waterLevel;

            habitation.roadAccess =
                habitationData.roadAccess;

            habitation.hospitalDistance =
                habitationData.hospitalDistance;

            habitation.shelterCapacity =
                habitationData.shelterCapacity;

            habitation.availableWater =
                habitationData.availableWater;

            habitation.foodStock =
                habitationData.foodStock;

            habitation.medicalCapacity =
                habitationData.medicalCapacity;


            if (
                habitationData.location
            ) {

                habitation.location =
                    habitationData.location;

            }


            // Existing ML result is outdated

            habitation.assessmentStatus =
                "NOT_ASSESSED";

            habitation.assessmentError =
                null;

        }


        // ====================================================
        // 14. SAVE BEFORE ML ASSESSMENT
        // ====================================================

        await habitation.save();


        console.log(

            isNewHabitation

                ? "NEW HABITATION CREATED:"
                : "EXISTING HABITATION UPDATED:",

            habitation.habitationId

        );


        // ====================================================
        // 15. RUN SAME ML FLOW AS OLD FORM
        // ====================================================

        const result =
            await assessHabitation(
                habitation
            );


        // ====================================================
        // 16. ML ASSESSMENT FAILED
        // ====================================================

        if (
            !result.success
        ) {

            return res.status(502).json({

                success: false,

                message:
                    "Habitation was saved, but ML assessment failed.",

                habitation: {

                    habitationId:
                        habitation.habitationId,

                    name:
                        habitation.name,

                    population:
                        habitation.population,

                    assessmentStatus:
                        habitation.assessmentStatus,

                    assessmentError:
                        habitation.assessmentError

                },

                assessmentError:
                    result.error,

                missingFields:
                    result.missingFields || [],

                invalidFields:
                    result.invalidFields || []

            });

        }


        // ====================================================
        // 17. REAL-TIME DASHBOARD UPDATE
        // ====================================================

        const io =
            req.app.get("io");


        if (io) {

            io.emit(
                "riskUpdated",
                {

                    habitationId:
                        habitation.habitationId,

                    name:
                        habitation.name,

                    population:
                        habitation.population,

                    riskScore:
                        habitation.riskScore,

                    riskLevel:
                        habitation.riskLevel,

                    relocationPriority:
                        habitation.relocationPriority,

                    vulnerabilityScore:
                        habitation.vulnerabilityScore,

                    assessmentStatus:
                        habitation.assessmentStatus

                }
            );

        }


        // ====================================================
        // 18. FINAL SUCCESS RESPONSE
        // ====================================================

        return res.status(

            isNewHabitation
                ? 201
                : 200

        ).json({

            success: true,

            message:

                isNewHabitation

                    ? "Village created and assessed successfully."

                    : "Village updated and reassessed successfully.",


            village: {

                code:
                    habitation.habitationId,

                name:
                    habitation.name,

                population:
                    habitation.population,

                vulnerabilityScore:

                    datasetVulnerabilityScore ??
                    habitation.vulnerabilityScore ??
                    null,

                vulnerabilityCategory:

                    datasetVulnerabilityCategory ??
                    null

            },


            habitation: {

                habitationId:
                    habitation.habitationId,

                name:
                    habitation.name,

                population:
                    habitation.population,

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

                hazards:
                    habitation.hazards,

                assessmentStatus:
                    habitation.assessmentStatus,

                modelVersion:
                    habitation.modelVersion,

                lastAssessment:
                    habitation.lastAssessment

            },


            assessment:
                result.prediction

        });


    } catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "ASSESS VILLAGE ERROR:"
        );

        console.error(
            error
        );

        console.error(
            "======================================"
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to assess village.",

            error:
                error.message

        });

    }

};

// ============================================================
// GET AUTHORITY RISK MAP
// ============================================================

module.exports.getRiskMap = async (req, res) => {
    try {

        // --------------------------------------------------------
        // Get all assessed habitations having valid coordinates
        // --------------------------------------------------------

        const habitations = await Habitation.find({
            assessmentStatus: "ASSESSED",
            "location.type": "Point",
            "location.coordinates": {
                $exists: true,
                $ne: []
            }
        })
            .select(
                [
                    "habitationId",
                    "name",
                    "population",
                    "location",
                    "riskScore",
                    "riskLevel",
                    "vulnerabilityScore",
                    "riskProbability",
                    "relocationPriority",
                    "hazards",
                    "capacityRatio",
                    "capacityStatus",
                    "shelterCapacity",
                    "availableWater",
                    "foodStock",
                    "medicalCapacity",
                    "assessmentStatus",
                    "lastAssessment"
                ].join(" ")
            )
            .lean();


        // --------------------------------------------------------
        // Convert MongoDB documents to GeoJSON Features
        // --------------------------------------------------------

        const features = habitations
            .filter(habitation => {

                const coordinates =
                    habitation.location?.coordinates;

                return (
                    Array.isArray(coordinates) &&
                    coordinates.length === 2 &&
                    Number.isFinite(
                        Number(coordinates[0])
                    ) &&
                    Number.isFinite(
                        Number(coordinates[1])
                    )
                );

            })
            .map(habitation => {

                const coordinates =
                    habitation.location.coordinates;


                // ------------------------------------------------
                // Carrying Capacity Calculation
                // ------------------------------------------------

                const waterCapacity =
                    Number(habitation.availableWater || 0) / 5;

                const foodCapacity =
                    Number(habitation.foodStock || 0) / 2;

                const medicalPopulationCapacity =
                    Number(habitation.medicalCapacity || 0) * 10;

                const safeCapacity = Math.max(
                    (
                        0.40 *
                        Number(habitation.shelterCapacity || 0)

                        +

                        0.25 *
                        waterCapacity

                        +

                        0.20 *
                        foodCapacity

                        +

                        0.15 *
                        medicalPopulationCapacity
                    ),
                    100
                );


                return {

                    type: "Feature",

                    geometry: {

                        type: "Point",

                        coordinates: [
                            Number(coordinates[0]),
                            Number(coordinates[1])
                        ]

                    },

                    properties: {

                        id:
                            habitation._id,

                        habitationId:
                            habitation.habitationId,

                        name:
                            habitation.name,

                        population:
                            Number(
                                habitation.population
                            ) || 0,

                        riskScore:
                            Number(
                                habitation.riskScore
                            ) || 0,

                        riskLevel:
                            habitation.riskLevel ||
                            "GREEN",

                        vulnerabilityScore:
                            habitation.vulnerabilityScore !== null &&
                            habitation.vulnerabilityScore !== undefined
                                ? Number(
                                    habitation.vulnerabilityScore
                                )
                                : null,

                        riskProbability:
                            habitation.riskProbability !== null &&
                            habitation.riskProbability !== undefined
                                ? Number(
                                    habitation.riskProbability
                                )
                                : null,

                        relocationPriority:
                            habitation.relocationPriority ||
                            "MONITOR",

                        hazards:
                            habitation.hazards || {
                                flood: null,
                                landslide: null,
                                erosion: null,
                                cloudburst: null
                            },

                        // ----------------------------------------
                        // Carrying Capacity
                        // ----------------------------------------

                        safeCapacity:
                            Number(
                                safeCapacity.toFixed(2)
                            ),

                        capacityStatus:
                            habitation.capacityStatus ??
                            "UNKNOWN",

                        capacityRatio:
                            habitation.capacityRatio ??
                            null,

                        shelterCapacity:
                            habitation.shelterCapacity ??
                            null,

                        availableWater:
                            habitation.availableWater ??
                            null,

                        foodStock:
                            habitation.foodStock ??
                            null,

                        medicalCapacity:
                            habitation.medicalCapacity ??
                            null,

                        // ----------------------------------------
                        // Assessment
                        // ----------------------------------------

                        assessmentStatus:
                            habitation.assessmentStatus ??
                            "NOT_ASSESSED",

                        lastAssessment:
                            habitation.lastAssessment ??
                            null
                    }

                };

            });


        // --------------------------------------------------------
        // Risk statistics
        // --------------------------------------------------------

        const red =
            features.filter(
                feature =>
                    feature.properties.riskLevel === "RED"
            );

        const orange =
            features.filter(
                feature =>
                    feature.properties.riskLevel === "ORANGE"
            );

        const yellow =
            features.filter(
                feature =>
                    feature.properties.riskLevel === "YELLOW"
            );

        const green =
            features.filter(
                feature =>
                    feature.properties.riskLevel === "GREEN"
            );


        // --------------------------------------------------------
        // Vulnerable habitations
        // --------------------------------------------------------

        const vulnerableHabitations =
            features.filter(feature => {

                const vulnerability =
                    Number(
                        feature.properties.vulnerabilityScore
                    );

                return (
                    Number.isFinite(vulnerability) &&
                    vulnerability >= 60
                );

            });


        // --------------------------------------------------------
        // Immediate relocation
        // --------------------------------------------------------

        const immediateRelocation =
            features.filter(feature =>
                feature.properties.relocationPriority ===
                "IMMEDIATE"
            );


        // --------------------------------------------------------
        // Overall risk
        // --------------------------------------------------------

        const riskScores =
            features
                .map(feature =>
                    Number(
                        feature.properties.riskScore
                    )
                )
                .filter(score =>
                    Number.isFinite(score)
                );


        const overallRiskScore =
            riskScores.length > 0
                ? Math.round(
                    riskScores.reduce(
                        (sum, score) =>
                            sum + score,
                        0
                    ) /
                    riskScores.length
                )
                : 0;


        let overallRiskLevel = "GREEN";

        if (overallRiskScore >= 75) {
            overallRiskLevel = "RED";
        } else if (overallRiskScore >= 50) {
            overallRiskLevel = "ORANGE";
        } else if (overallRiskScore >= 25) {
            overallRiskLevel = "YELLOW";
        }



        // --------------------------------------------------------
        // Return GeoJSON
        // --------------------------------------------------------

        return res.status(200).json({

            success: true,

            generatedAt: new Date(),

            map: {

                type: "FeatureCollection",

                features

            },

            statistics: {

                totalMapped:
                    features.length,

                red:
                    red.length,

                orange:
                    orange.length,

                yellow:
                    yellow.length,

                green:
                    green.length,

                vulnerable:
                    vulnerableHabitations.length,

                immediateRelocation:
                    immediateRelocation.length

            },

            riskOverview: {

                overallRiskScore,

                riskLevel:
                    overallRiskLevel,

                affectedVillages:
                    features.filter(
                        feature =>
                            feature.properties.riskLevel !==
                            "GREEN"
                    ).length,

                criticalVillages:
                    red.length,

                highRiskVillages:
                    orange.length,

                distribution: {

                    red:
                        red.length,

                    orange:
                        orange.length,

                    yellow:
                        yellow.length,

                    green:
                        green.length

                }

            }

        });

    } catch (error) {

        console.error(
            "Authority risk map error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to generate authority risk map.",

            error:
                error.message

        });

    }
};