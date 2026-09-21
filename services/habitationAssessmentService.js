const Habitation = require("../models/Habitation");

const {
    getHabitationPrediction
} = require("../utils/mlService");


// =====================================================
// SAVE ML RESULT
// =====================================================

function applyPrediction(
    habitation,
    prediction
) {

    habitation.riskScore =
        prediction.riskScore ?? 0;


    habitation.riskLevel =
        prediction.riskLevel || "GREEN";


    habitation.relocationPriority =
        prediction.relocationPriority || "MONITOR";


    if (
        prediction.vulnerabilityScore !==
        undefined
    ) {

        habitation.vulnerabilityScore =
            prediction.vulnerabilityScore;
    }


    habitation.hazards =
        prediction.hazards || {};


    if (prediction.details) {

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
    }


    habitation.assessmentStatus =
        "ASSESSED";


    habitation.assessmentError =
        null;


    habitation.modelVersion =
        prediction.modelVersion || "unknown";


    habitation.lastAssessment =
        new Date();
}


// =====================================================
// RUN ML ASSESSMENT
// =====================================================

async function assessHabitation(
    habitation
) {

    try {

        const prediction =
            await getHabitationPrediction(
                habitation
            );


        // Missing input
        if (!prediction.success) {

            habitation.assessmentStatus =
                prediction.missingFields
                    ? "INPUTS_MISSING"
                    : "ML_ERROR";


            habitation.assessmentError =
                prediction.error;


            await habitation.save();


            return prediction;
        }


        // Save ML result
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

        habitation.assessmentStatus =
            "ML_ERROR";


        habitation.assessmentError =
            error.message;


        await habitation.save();


        throw error;
    }
}


// =====================================================
// UPDATE AUTHORITY INPUTS
// =====================================================

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


    for (const field of allowedFields) {

        if (
            inputData[field] !==
            undefined
        ) {

            const value =
                Number(inputData[field]);


            if (Number.isNaN(value)) {

                throw new Error(
                    `${field} must be a valid number`
                );
            }


            habitation[field] = value;
        }
    }


    // Inputs changed,
    // previous ML result is no longer current

    habitation.assessmentStatus =
        "NOT_ASSESSED";


    habitation.assessmentError =
        null;


    await habitation.save();


    return habitation;
}


module.exports = {

    assessHabitation,

    updateHabitationInputs,

    applyPrediction

};