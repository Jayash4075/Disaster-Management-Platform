const mongoose = require("mongoose");

const habitationSchema = new mongoose.Schema({
    habitationId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: undefined }
    },
    population: { type: Number, min: 0 },
    households: { type: Number, min: 0 },
    scPopulation: { type: Number, min: 0 },
    stPopulation: { type: Number, min: 0 },
    populationDensity: { type: Number, min: 0 },

    vulnerability: {
        score: { type: Number, min: 0, max: 100 },
        category: String,
        childrenRatio: Number,
        scRatio: Number,
        stRatio: Number
    },
    vulnerabilityScore: { type: Number, min: 0, max: 100 },

    rainfall: Number,
    riverLevel: Number,
    floodHistory: Number,
    buildingDamage: Number,
    vulnerablePopulation: Number,
    waterLevel: Number,
    roadAccess: Number,
    hospitalDistance: Number,
    shelterCapacity: Number,
    availableWater: Number,
    foodStock: Number,
    medicalCapacity: Number,

    riskScore: { type: Number, min: 0, max: 100 },
    riskLevel: { type: String, enum: ["RED", "ORANGE", "YELLOW", "GREEN"] },
    hazards: {
        flood: Number,
        landslide: Number,
        erosion: Number,
        cloudburst: Number
    },
    relocationPriority: {
        type: String,
        enum: ["IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM", "MONITOR"]
    },

    // FIXED: split into numeric ratio + status string, was one broken String-enum field
    capacityRatio: Number,
    capacityStatus: { type: String, enum: ["SAFE", "STRESSED", "OVER_CAPACITY"] },

    riskProbability: Number,
    relocationProbability: Number,
    capacityProbability: Number,

    // FIXED: spelling + enum value now matches what the service code actually sets
    assessmentStatus: {
        type: String,
        enum: ["NOT_ASSESSED", "ASSESSED", "INPUTS_MISSING", "ML_ERROR"],
        default: "NOT_ASSESSED"
    },
    assessmentError: String,
    modelVersion: String,
    lastAssessment: Date  // FIXED: was "lastAssesement"
},
{ timestamps: true });

habitationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Habitation", habitationSchema);