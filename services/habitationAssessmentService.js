const Habitation = require("../models/Habitation");

const {
    getHabitationPrediction
} = require("../utils/mlService");


// ============================================================
// APPLY ML PREDICTION TO HABITATION
// ============================================================

function applyPrediction(
    habitation,
    prediction
) {

    habitation.riskScore =
        Number(prediction.riskScore) || 0;


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


    habitation.hazards =
        prediction.hazards || {};


    // --------------------------------------------------------
    // Carrying capacity / probability details
    // --------------------------------------------------------

    habitation.capacityRatio =
        prediction.details
            ?.carryingCapacity
            ?.capacityRatio ?? null;


    habitation.capacityStatus =
        prediction.details
            ?.carryingCapacity
            ?.status ?? null;


    habitation.riskProbability =
        prediction.details
            ?.riskProbability ?? null;


    habitation.relocationProbability =
        prediction.details
            ?.relocation
            ?.probability ?? null;


    habitation.capacityProbability =
        prediction.details
            ?.carryingCapacity
            ?.probability ?? null;


    // --------------------------------------------------------
    // Assessment metadata
    // --------------------------------------------------------

    habitation.assessmentStatus =
        "ASSESSED";


    habitation.assessmentError =
        null;


    habitation.modelVersion =
        prediction.modelVersion || "unknown";


    habitation.lastAssessment =
        new Date();

}


// ============================================================
// RUN ML ASSESSMENT
// ============================================================

async function assessHabitation(
    habitation
) {

    try {

        const prediction =
            await getHabitationPrediction(
                habitation
            );


        // ----------------------------------------------------
        // ML returned an application-level failure
        // ----------------------------------------------------

        if (
            !prediction ||
            prediction.success === false
        ) {

            habitation.assessmentStatus =
                prediction?.missingFields ||
                prediction?.invalidFields
                    ? "INPUTS_MISSING"
                    : "ML_ERROR";


            habitation.assessmentError =
                prediction?.error ||
                "ML prediction failed";


            await habitation.save();


            return {

                success: false,

                error:
                    habitation.assessmentError,

                missingFields:
                    prediction?.missingFields || [],

                invalidFields:
                    prediction?.invalidFields || []

            };

        }


        // ----------------------------------------------------
        // Save successful ML result
        // ----------------------------------------------------

        applyPrediction(
            habitation,
            prediction
        );


        await habitation.save();


        return {

            success: true,

            prediction,

            habitation

        };

    } catch (error) {

        console.error(
            "Habitation ML assessment error:",
            error.message
        );


        habitation.assessmentStatus =
            "ML_ERROR";


        habitation.assessmentError =
            error.message;


        await habitation.save();


        throw error;

    }

}


// ============================================================
// UPDATE CURRENT CONDITIONS
// ============================================================

async function updateHabitationInputs(
    habitation,
    inputData
) {

    const allowedFields = [

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


    for (
        const field of allowedFields
    ) {

        if (
            inputData[field] !== undefined
        ) {

            const value =
                Number(inputData[field]);


            if (
                Number.isNaN(value)
            ) {

                throw new Error(
                    `${field} must be a valid number`
                );

            }


            habitation[field] =
                value;

        }

    }


    // --------------------------------------------------------
    // Previous ML result is now outdated
    // --------------------------------------------------------

    habitation.assessmentStatus =
        "NOT_ASSESSED";


    habitation.assessmentError =
        null;


    await habitation.save();


    return habitation;

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    assessHabitation,

    updateHabitationInputs,

    applyPrediction

};