const Habitation = require("../models/Habitation");

const {
    getVillages
} = require("../utils/mlService");


async function syncVillagesFromML() {

    const response =
        await getVillages();

    const villages =
        response?.villages ||
        response?.data ||
        response?.results ||
        [];

    if (!Array.isArray(villages)) {

        throw new Error(
            "Invalid village data received from ML service"
        );
    }


    const operations = [];


    for (const village of villages) {

        const habitationId =
            String(
                village.village_code ??
                village.villageCode ??
                village.code ??
                ""
            ).trim();


        if (!habitationId) {
            continue;
        }


        const name =
            village.village_name ??
            village.villageName ??
            village.name ??
            "Unknown Village";


        const population =
            Number(
                village.population ?? 0
            );


        const vulnerabilityScore =
            village.vulnerability_score_100 ??
            village.vulnerabilityScore ??
            null;


        const vulnerabilityCategory =
            village.vulnerability_category ??
            village.vulnerabilityCategory ??
            null;


        const latitude =
            Number(
                village.latitude
            );


        const longitude =
            Number(
                village.longitude
            );


        const update = {

            name,

            population,

            vulnerabilityScore,

            vulnerabilityCategory
        };


        // Only update location if ML service
        // actually returned valid coordinates.
        if (
            Number.isFinite(latitude) &&
            Number.isFinite(longitude)
        ) {

            update.location = {
                type: "Point",

                coordinates: [
                    longitude,
                    latitude
                ]
            };
        }


        operations.push({

            updateOne: {

                filter: {
                    habitationId
                },

                update: {
                    $set: update,

                    $setOnInsert: {

                        assessmentStatus:
                            "NOT_ASSESSED"
                    }
                },

                upsert: true
            }
        });
    }


    if (operations.length === 0) {

        return {
            totalFromML: villages.length,
            synchronized: 0
        };
    }


    const result =
        await Habitation.bulkWrite(
            operations,
            {
                ordered: false
            }
        );


    return {

        totalFromML:
            villages.length,

        synchronized:
            operations.length,

        inserted:
            result.upsertedCount || 0,

        modified:
            result.modifiedCount || 0
    };
}


module.exports = {
    syncVillagesFromML
};
