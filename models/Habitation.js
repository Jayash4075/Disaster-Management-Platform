const mongoose = require("mongoose");

const HabitationSchema = new mongoose.Schema(
    {
        // ====================================================
        // BASIC INFORMATION
        // ====================================================

        habitationId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        villageCode: {
            type: String,
            default: null,
            index: true
        },

        population: {
            type: Number,
            default: 0
        },

        // ====================================================
        // LOCATION
        // ====================================================

        location: {
            type: {
                type: String,
                enum: ["Point"]
            },

            coordinates: {
                type: [Number]
            }
        },

        // ====================================================
        // RAW DISASTER INPUTS
        // ====================================================

        rainfall: {
            type: Number,
            default: null
        },

        riverLevel: {
            type: Number,
            default: null
        },

        floodHistory: {
            type: Number,
            default: null
        },

        buildingDamage: {
            type: Number,
            default: null
        },

        vulnerablePopulation: {
            type: Number,
            default: null
        },

        waterLevel: {
            type: Number,
            default: null
        },

        roadAccess: {
            type: Number,
            default: null
        },

        hospitalDistance: {
            type: Number,
            default: null
        },

        shelterCapacity: {
            type: Number,
            default: null
        },

        availableWater: {
            type: Number,
            default: null
        },

        foodStock: {
            type: Number,
            default: null
        },

        medicalCapacity: {
            type: Number,
            default: null
        },

        // ====================================================
        // ML RISK OUTPUT
        // ====================================================

        riskScore: {
            type: Number,
            default: 0
        },

        riskLevel: {
            type: String,
            enum: [
                "GREEN",
                "YELLOW",
                "ORANGE",
                "RED"
            ],
            default: "GREEN"
        },

        vulnerabilityScore: {
            type: Number,
            default: null
        },

        riskProbability: {
            type: Number,
            default: null
        },

        relocationProbability: {
            type: Number,
            default: null
        },

        capacityProbability: {
            type: Number,
            default: null
        },

        relocationPriority: {
            type: String,
            enum: [
                "IMMEDIATE",
                "SHORT_TERM",
                "MEDIUM_TERM",
                "MONITOR"
            ],
            default: "MONITOR"
        },

        capacityRatio: {
            type: Number,
            default: null
        },

        capacityStatus: {
            type: String,
            default: null
        },

        // ====================================================
        // HAZARD BREAKDOWN
        // ====================================================

        hazards: {
            flood: {
                type: Number,
                default: null
            },

            landslide: {
                type: Number,
                default: null
            },

            erosion: {
                type: Number,
                default: null
            },

            cloudburst: {
                type: Number,
                default: null
            }
        },

        // ====================================================
        // ASSESSMENT STATUS
        // ====================================================

        assessmentStatus: {
            type: String,
            enum: [
                "NOT_ASSESSED",
                "ASSESSED",
                "INPUTS_MISSING",
                "ML_ERROR"
            ],
            default: "NOT_ASSESSED"
        },

        assessmentError: {
            type: String,
            default: null
        },

        modelVersion: {
            type: String,
            default: null
        },

        lastAssessment: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// ============================================================
// GEOSPATIAL INDEX
// ============================================================

HabitationSchema.index(
    {
        location: "2dsphere"
    },
    {
        sparse: true
    }
);

module.exports =
    mongoose.model(
        "Habitation",
        HabitationSchema
    );