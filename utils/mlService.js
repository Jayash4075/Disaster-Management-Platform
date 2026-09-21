const axios = require("axios");

const ML_SERVICE_URL =
    process.env.ML_SERVICE_URL ||
    "http://localhost:5001";

const ML_TIMEOUT =
    Number(process.env.ML_TIMEOUT) || 10000;


// ============================================================
// COMMON GET REQUEST
// ============================================================

async function mlGet(endpoint) {

    try {

        const response =
            await axios.get(

                `${ML_SERVICE_URL}${endpoint}`,

                {
                    timeout: ML_TIMEOUT
                }

            );

        return response.data;

    } catch (error) {

        console.error(
            `ML GET error [${endpoint}]:`,
            error.response?.data ||
            error.message
        );

        throw new Error(
            error.response?.data?.error ||
            `ML service unavailable at ${endpoint}`
        );

    }

}


// ============================================================
// COMMON POST REQUEST
// ============================================================

async function mlPost(
    endpoint,
    payload
) {

    try {

        const response =
            await axios.post(

                `${ML_SERVICE_URL}${endpoint}`,

                payload,

                {

                    timeout: ML_TIMEOUT,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }

                }

            );

        return response.data;

    } catch (error) {

        console.error(
            `ML POST error [${endpoint}]:`,
            error.response?.data ||
            error.message
        );

        throw new Error(
            error.response?.data?.error ||
            `ML service unavailable at ${endpoint}`
        );

    }

}


// ============================================================
// ML HEALTH
// ============================================================

async function getMLHealth() {

    return await mlGet("/health");

}


// ============================================================
// HABITATION RISK PREDICTION
// ============================================================

async function getHabitationPrediction(
    habitation
) {

    const requiredFields = [

        "population",
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


    const missingFields =
        requiredFields.filter(

            field =>
                habitation[field] === undefined ||
                habitation[field] === null ||
                habitation[field] === ""

        );


    if (missingFields.length > 0) {

        return {

            success: false,

            error:
                "Required ML inputs are missing",

            missingFields

        };

    }


    const numericFields = [

        "population",
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


    const invalidFields =
        numericFields.filter(

            field =>
                Number.isNaN(
                    Number(habitation[field])
                )

        );


    if (invalidFields.length > 0) {

        return {

            success: false,

            error:
                "Some ML inputs are not valid numbers",

            invalidFields

        };

    }


    const payload = {

        habitationId:
            habitation.habitationId,

        name:
            habitation.name,

        population:
            Number(habitation.population),

        rainfall:
            Number(habitation.rainfall),

        river_level:
            Number(habitation.riverLevel),

        flood_history:
            Number(habitation.floodHistory),

        building_damage:
            Number(habitation.buildingDamage),

        vulnerable_population:
            Number(
                habitation.vulnerablePopulation
            ),

        water_level:
            Number(habitation.waterLevel),

        road_access:
            Number(habitation.roadAccess),

        hospital_distance:
            Number(
                habitation.hospitalDistance
            ),

        shelter_capacity:
            Number(
                habitation.shelterCapacity
            ),

        available_water:
            Number(
                habitation.availableWater
            ),

        food_stock:
            Number(
                habitation.foodStock
            ),

        medical_capacity:
            Number(
                habitation.medicalCapacity
            )

    };


    return await mlPost(
        "/predict/habitation",
        payload
    );

}


// ============================================================
// GET ALL VILLAGES
// ============================================================

async function getVillages() {

    return await mlGet(
        "/api/villages"
    );

}


// ============================================================
// SEARCH VILLAGES
// ============================================================

async function searchVillages(query) {

    return await mlGet(
        `/api/villages/search?q=${encodeURIComponent(query)}`
    );

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    mlGet,

    mlPost,

    getMLHealth,

    getHabitationPrediction,

    getVillages,

    searchVillages

};