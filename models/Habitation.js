const mongoose = require("mongoose");

const habitationSchema = new mongoose.Schema({
    //Master Village Information - PS 191

    habitationId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number],
            default: undefined
        }
    },
    population: {
        type: Number,
        min: 0
    },
    households: {
        type: Number,
        min: 0
    },
    scPopulation: {
        type: Number,
        min: 0
    },
    stPopulation: {
        type: Number,
        min: 0
    },
    populationDensity: {
        type: Number,
        min: 0
    },
    //Vulnerability - From PS 191 Dataset
    
    vulnerability: {
        score: {
            type: Number,
            min: 0,
            max: 100
        },
        category: String,
        childrenRatio: Number,
        scRatio: Number,
        stRatio: Number
    },
    vulnerabilityScore: {
        type: Number,
        min: 0,
        max: 100
    },
    //Environmental Inputs
    //They are used by Ml

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

    //ML Assesement Outputs

    riskScore: {
        type: Number,
        min: 0,
        max: 100
    },
    riskLevel: {
        type: String,
        enum: ["RED", "ORANGE", "YELLOW", "GREEN"],
    },
    hazards: {
        flood: Number,
        landslide: Number,
        erosion: Number,
        cloudburst: Number,

    },
    relocationPriority: {
        type: String,
        enum: ['IMMEDIATE', 'SHORT_TERM', 'MEDIUM_TERM', 'MONITOR']
    },
    capacityRatio: {
        type: String,
        enum: ['SAFE', 'STRESSED', 'OVER_CAPACITY']
    },

    //ML PROBABILITIES
    riskProbability: Number,
    relocationProbability: Number,
    capacityProbability: Number,

    //Assesement Status

    assesementStatus: {
        type: String,
        enum: ["NOT_ACCESSED", "ASSESSED", "INPUTS_MISSING", "ML_ERROR"],
        default: "NOT_ASSESSED"
    },
    assessmentError: String,
    modelVersion: String,
    lastAssesement: Date
},
{
    timestamps: true
}
);
habitationSchema.index({
    location: "2dsphere"
});

module.exports = mongoose.model("Habitation", habitationSchema);

