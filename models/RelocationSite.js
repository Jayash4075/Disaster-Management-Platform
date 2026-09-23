const mongoose = require("mongoose");

const RelocationSiteSchema =
    new mongoose.Schema(
        {

            siteId: {
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

            location: {

                type: {
                    type: String,

                    enum: ["Point"],

                    required: true
                },

                coordinates: {
                    type: [Number],

                    required: true
                }
            },

            capacity: {

                total: {
                    type: Number,
                    required: true,
                    min: 0
                },

                occupied: {
                    type: Number,
                    default: 0,
                    min: 0
                },

                available: {
                    type: Number,
                    default: 0,
                    min: 0
                }
            },

            suitabilityScore: {
                type: Number,
                default: 0
            },

            status: {
                type: String,

                enum: [
                    "ACTIVE",
                    "FULL",
                    "INACTIVE"
                ],

                default: "ACTIVE"
            }
        },

        {
            timestamps: true
        }
    );


RelocationSiteSchema.index({
    location: "2dsphere"
});


module.exports =
    mongoose.model(
        "RelocationSite",
        RelocationSiteSchema
    );