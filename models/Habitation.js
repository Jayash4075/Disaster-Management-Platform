const mongoose = require('mongoose');

const habitationSchema = new mongoose.Schema({
    habitationId:{
        type: String,
        required: true,
        unique: true
    },
    name: String,
    location: {
        type: {
            type: String,
            default: "Point"
        },
        coordinates: [Number]
    },
    population: Number,
    vulnerability: {
        elderly: Number,
        children: Number,
        disabled: Number,
        density: Number,
        score: Number
    },
    hazardRisk: {
        flood: Number,
        landslide: Number,
        erosion: Number,
        cloudburst: Number,
        overall: Number
    },
    historicalRisk: Number,
    riskScore: Number,
    riskLevel: {
        type: String,
        enum: ["RED", "ORANGE", "YELLOW", "GREEN"]
    },
    relocationPriority: {
        type: String,
        enum: ["IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM", "MONITOR"]
    },
    lastAssessment: Date
});

module.exports = mongoose.model('Habitation', habitationSchema);