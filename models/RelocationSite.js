const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
    siteId: { 
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
    capacity: { 
        total: Number, 
        occupied: Number, 
        available: Number 
    },
    suitabilityScore: Number
    });

module.exports = mongoose.model('RelocationSite', siteSchema);