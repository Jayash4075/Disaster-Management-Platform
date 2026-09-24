
const axios = require("axios");


// ============================================================
// ML SERVICE CONFIG
// ============================================================

const ML_SERVICE_URL =
    process.env.ML_SERVICE_URL ||
    "http://localhost:5001";

const ML_TIMEOUT =
    Number(process.env.ML_TIMEOUT) || 10000;


// ============================================================
// COMMON GET REQUEST
// ============================================================

async function mlGet(endpoint) {

    const url = `${ML_SERVICE_URL}${endpoint}`;

    try {

        console.log(`ML GET → ${url}`);

        const response = await axios.get(
            url,
            {
                timeout: ML_TIMEOUT
            }
        );

        console.log(
            `ML GET SUCCESS [${endpoint}]`
        );

        return response.data;

    } catch (error) {

        console.error(
            "========== ML GET ERROR =========="
        );

        console.error(
            "URL:",
            url
        );

        console.error(
            "Status:",
            error.response?.status
        );

        console.error(
            "Response:",
            error.response?.data
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "=================================="
        );

        throw new Error(
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
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

    const url = `${ML_SERVICE_URL}${endpoint}`;

    try {

        console.log(
            `ML POST → ${url}`
        );

        console.log(
            "ML Payload:",
            JSON.stringify(payload, null, 2)
        );

        const response = await axios.post(

            url,

            payload,

            {
                timeout: ML_TIMEOUT,

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }

        );

        console.log(
            `ML POST SUCCESS [${endpoint}]`
        );

        console.log(
            "ML Response:",
            JSON.stringify(
                response.data,
                null,
                2
            )
        );

        return response.data;

    } catch (error) {

        console.error(
            "========== ML POST ERROR =========="
        );

        console.error(
            "URL:",
            url
        );

        console.error(
            "Status:",
            error.response?.status
        );

        console.error(
            "Response:",
            error.response?.data
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "==================================="
        );

        throw new Error(

            error.response?.data?.error ||

            error.response?.data?.message ||

            error.message ||

            `ML service unavailable at ${endpoint}`

        );

    }

}


// ============================================================
// ML HEALTH
// ============================================================

async function getMLHealth() {

    return await mlGet(
        "/health"
    );

}


// ============================================================
// HABITATION RISK PREDICTION
// ============================================================

async function getHabitationPrediction(
    habitation
) {

    // --------------------------------------------------------
    // REQUIRED INPUTS
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // CHECK MISSING FIELDS
    // --------------------------------------------------------

    const missingFields =
        requiredFields.filter(

            field =>

                habitation[field] === undefined ||

                habitation[field] === null ||

                habitation[field] === ""

        );


    if (missingFields.length > 0) {

        console.error(
            "Missing ML fields:",
            missingFields
        );

        return {

            success: false,

            error:
                "Required ML inputs are missing",

            missingFields

        };

    }


    // --------------------------------------------------------
    // CHECK NUMERIC FIELDS
    // --------------------------------------------------------

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

            field => {

                const value =
                    Number(
                        habitation[field]
                    );

                return !Number.isFinite(value);

            }

        );


    if (invalidFields.length > 0) {

        console.error(
            "Invalid ML fields:",
            invalidFields
        );

        return {

            success: false,

            error:
                "Some ML inputs are not valid numbers",

            invalidFields

        };

    }


    // --------------------------------------------------------
    // BUILD ML PAYLOAD
    // --------------------------------------------------------

    const payload = {

        habitationId:
            habitation.habitationId ||
            habitation.villageCode ||
            habitation.village_code ||
            null,

        name:
            habitation.name ||
            habitation.villageName ||
            habitation.village_name ||
            null,


        // ----------------------------------------------------
        // VILLAGE INFORMATION
        // ----------------------------------------------------

        villageCode:
            habitation.villageCode ||
            habitation.village_code ||
            null,

        villageName:
            habitation.villageName ||
            habitation.village_name ||
            habitation.name ||
            null,


        // ----------------------------------------------------
        // ML INPUT FEATURES
        // ----------------------------------------------------

        population:
            Number(
                habitation.population
            ),

        rainfall:
            Number(
                habitation.rainfall
            ),

        river_level:
            Number(
                habitation.riverLevel
            ),

        flood_history:
            Number(
                habitation.floodHistory
            ),

        building_damage:
            Number(
                habitation.buildingDamage
            ),

        vulnerable_population:
            Number(
                habitation.vulnerablePopulation
            ),

        water_level:
            Number(
                habitation.waterLevel
            ),

        road_access:
            Number(
                habitation.roadAccess
            ),

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
            ),

        latitude:
            habitation.location?.coordinates?.[1] ?? 0,

        longitude:
            habitation.location?.coordinates?.[0] ?? 0


    };


    // --------------------------------------------------------
    // FINAL PAYLOAD LOG
    // --------------------------------------------------------

    console.log(
        "=========================================="
    );

    console.log(
        "Sending habitation data to ML service:"
    );

    console.log(
        JSON.stringify(
            payload,
            null,
            2
        )
    );

    console.log(
        "=========================================="
    );


    // --------------------------------------------------------
    // CALL ML SERVICE
    // --------------------------------------------------------

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

async function searchVillages(
    query
) {

    if (
        query === undefined ||
        query === null ||
        String(query).trim() === ""
    ) {

        return {

            success: false,

            error:
                "Village search query is required",

            villages: []

        };

    }


    return await mlGet(

        `/api/villages/search?q=${encodeURIComponent(
            String(query).trim()
        )}`

    );

}

// ============================================================
// SOS SEVERITY PREDICTION
// ============================================================

const predictSOSSeverity = async ({
    peopleCount,
    injured_people,
    critical_injuries,
    children_elderly,
    water_level,
    building_damage,
    hours_trapped,
    communication_available
}) => {

    try {

        const response = await mlPost("/predict/sos", {

            people_trapped: Number(peopleCount) || 0,

            injured_people:
                Number(injured_people) || 0,

            critical_injuries:
                Number(critical_injuries) || 0,

            children_elderly:
                Number(children_elderly) || 0,

            water_level:
                Number(water_level) || 0,

            building_damage:
                Number(building_damage) || 0,

            hours_trapped:
                Number(hours_trapped) || 0,

            communication_available:
                Number(communication_available ?? 1)

        });

        const prediction =
            response?.prediction || {};

        return {

            severityScore:
                Number(
                    prediction.severity_score
                ) || 0,

            severityLabel:
                prediction.severity || "MEDIUM",

            mlProbability:
                Number(
                    prediction.probability
                ) || 0,

            mlStatus:
                response?.success
                    ? "SUCCESS"
                    : "FAILED",

            isMlPredicted:
                Boolean(response?.success)

        };

    } catch (error) {

        console.error(
            "SOS ML prediction error:",
            error.response?.data ||
            error.message
        );

        throw error;
    }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    mlGet,

    mlPost,

    getMLHealth,

    getHabitationPrediction,

    getVillages,

    searchVillages,

    predictSOSSeverity

};