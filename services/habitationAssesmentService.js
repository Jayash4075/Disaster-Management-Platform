const Habitation = require("../models/Habitation");
const {getHabitationPrediction} = require("../utils/mlService");

//Normalize ML Response 

function normalizePrediction(prediction){
    const details = prediction?.details || {};
    const capacity = details?.carrryingCapacity || {};
    const relocation = details?.relocation || {};

    //Risk

    const riskScore = 
        prediction.riskScore ??
        details.riskScore ??
        details.score??
        null;

    const riskLevel = 
        prediction.riskLevel??
        details.riskLevel??
        null;
    
    //Vulnerability
    const vulnerabilityScore = prediction.vulnerabilityScore ?? null;

    //Capacity
    const capacityRatio = 
        prediction.capacityRatio ?? 
        capacity.capacityRatio ??
        null;

    const capacityStatus =
        prediction.capacityStatus ??
        capacity.status ??
        null;

    const capacityProbability = 
        prediction.capacityProbability ??
        capacity.probability ??
        null;

    //Relocation
    const relocationPriority = 
        prediction.relocationPriority ??
        relocation.priority ??
        null;

    const relocationProbability = 
        prediction.relocationProbability ??
        relocation.probability ??
        null;

    // Risk probability

    const riskProbability = 
        prediction.riskProbability??
        details.riskProbability??
        null;

    //Hazards

    const hazards = prediction.hazards || null;

    return{riskScore, riskLevel, vulnerabilityScore, hazards, relocationPriority, capacityRatio, 
        capacityStatus, riskProbabiltiy, relocationProbability, capacityProbability, 
        modelVersion:
            prediction.modelVersion ||
            details.modelVersion ||
            "unknown",
        
        raw: preidction
     };
}

//Apply ML Result to MongoDB

function applyPrediction(habitation, prediction){
    const result = normalizePrediction(prediction);

    //Risk
    if(result.riskScore != null && result.riskScore !== undefined){
        habitation.riskScore = Number(result.riskScore);
    }
    if (result.riskLevel){
        habitation.riskLevel = String(result.riskLevel).toUpperCase();
    }
    if (result.vulnerabilityScore !== null && result.vulnerabilityScore !== undefined) {
        habitation.vulnerabilityScore = Number(result.vulnerabilityScore);
    }
    if (result.hazards) {
        habitation.hazards = result.hazards;
    }
    if (result.relocationPriority) {
        habitation.relocationPriority = String(result.relocationPriority).toUpperCase();
    }
    if (result.capacityRatio !== null && result.capacityRatio !== undefined) {
        habitation.capacityRatio = Number(result.capacityRatio);
    }
    if (result.capacityStatus) {
        habitation.capacityStatus = String(result.capacityStatus).toUpperCase();
    }
    if (result.riskProbability !== null && result.riskProbability !== undefined) {
        habitation.riskProbability = Number(result.riskProbability);
    }
    if (result.relocationProbability !== null && result.relocationProbability !== undefined) {
        habitation.relocationProbability = Number(result.relocationProbability);
    }
    if (result.capacityProbability !== null && result.capacityProbability !== undefined) {
        habitation.capacityProbability = Number(result.capacityProbability);
    }

    habitation.modelVersion = result.modelVersion;
    habitation.assessmentStatus = "ASSESSED";
    habitation.assessmentError = undefined;
    habitation.lastAssessment = new Date();

    return result;
}

// ASSESS ONE HABITATION
async function assessHabitation(habitation) {

    const prediction = await getHabitationPrediction(habitation);
    if (!prediction.success) {
        habitation.assessmentStatus = prediction.missingFields ? "INPUTS_MISSING": "ML_ERROR";
                
        habitation.assessmentError = prediction.error;
        
        await habitation.save();
        
        return prediction;
    }


    const normalized = applyPrediction(habitation, prediction);
    
    await habitation.save();


    return {success: true, prediction, normalized, habitation};
}

module.exports = {assessHabitation, applyPrediction, normalizePrediction};
