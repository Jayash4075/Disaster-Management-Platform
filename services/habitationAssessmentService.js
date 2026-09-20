const { getHabitationPrediction } = require("../utils/mlService");

function normalizePrediction(prediction) {
    const details = prediction?.details || {};
    const capacity = details?.carryingCapacity || {}; // FIXED typo
    const relocation = details?.relocation || {};

    const riskScore = prediction.riskScore ?? details.riskScore ?? details.score ?? null;
    const riskLevel = prediction.riskLevel ?? details.riskLevel ?? null;
    const vulnerabilityScore = prediction.vulnerabilityScore ?? null;

    const capacityRatio = prediction.capacityRatio ?? capacity.capacityRatio ?? null;
    const capacityStatus = prediction.capacityStatus ?? capacity.status ?? null;
    const capacityProbability = prediction.capacityProbability ?? capacity.probability ?? null;

    const relocationPriority = prediction.relocationPriority ?? relocation.priority ?? null;
    const relocationProbability = prediction.relocationProbability ?? relocation.probability ?? null;

    const riskProbability = prediction.riskProbability ?? details.riskProbability ?? null;
    const hazards = prediction.hazards || null;

    return {
        riskScore, riskLevel, vulnerabilityScore, hazards, relocationPriority,
        capacityRatio, capacityStatus, riskProbability, relocationProbability, capacityProbability, // FIXED typo
        modelVersion: prediction.modelVersion || details.modelVersion || "unknown",
        raw: prediction // FIXED typo
    };
}

function applyPrediction(habitation, prediction) {
    const result = normalizePrediction(prediction);

    if (result.riskScore != null) habitation.riskScore = Number(result.riskScore);
    if (result.riskLevel) habitation.riskLevel = String(result.riskLevel).toUpperCase();
    if (result.vulnerabilityScore != null) habitation.vulnerabilityScore = Number(result.vulnerabilityScore);
    if (result.hazards) habitation.hazards = result.hazards;
    if (result.relocationPriority) habitation.relocationPriority = String(result.relocationPriority).toUpperCase();
    if (result.capacityRatio != null) habitation.capacityRatio = Number(result.capacityRatio);
    if (result.capacityStatus) habitation.capacityStatus = String(result.capacityStatus).toUpperCase();
    if (result.riskProbability != null) habitation.riskProbability = Number(result.riskProbability);
    if (result.relocationProbability != null) habitation.relocationProbability = Number(result.relocationProbability);
    if (result.capacityProbability != null) habitation.capacityProbability = Number(result.capacityProbability);

    habitation.modelVersion = result.modelVersion;
    habitation.assessmentStatus = "ASSESSED";
    habitation.assessmentError = undefined;
    habitation.lastAssessment = new Date();

    return result;
}

async function assessHabitation(habitation) {
    const prediction = await getHabitationPrediction(habitation);

    if (!prediction.success) {
        habitation.assessmentStatus = prediction.missingFields ? "INPUTS_MISSING" : "ML_ERROR";
        habitation.assessmentError = prediction.error;
        await habitation.save();
        return prediction;
    }

    const normalized = applyPrediction(habitation, prediction);
    await habitation.save();

    return { success: true, prediction, normalized, habitation };
}

module.exports = { assessHabitation, applyPrediction, normalizePrediction };