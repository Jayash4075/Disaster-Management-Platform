const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const ML_Timeout = Number(process.env.ML_Timeout) || 30000;

//Generic ML request
async function mlPost(endpoint, payload){
    try{
        const response = await axios.post(
            `${ML_SERVICE_URL}${endpoint}`,
            payload,
            {
                timeout: ML_Timeout,
                headers: {
                    "Content-type": "application/json"
                }
            }
        );
        return response.data;
    }
    catch(error){
        console.error("ML Service Error:", error.response?.data || error.message);

        throw new Error(
            error.response?.data?.error || "ML service unavailable"
        );
    }
}

//ML Health

async function getMLHealth(){
    try{
        const response = await axios.get(
            `${ML_SERVICE_URL}/health`,
            {
                timeout: ML_TIMEOUT
            }
        );
        return response.data;
    }
    catch(error){
        throw new Error("ML service unavailable");
    }
}

//Habitation Prediction

async function getHabitationPrediction(habitation){
    const requiredFields = ['population', 'rainfall', 'riverLevel', 'floodHistory',
        'buildingDamage', 'vulnerablePopulation', 'waterLevel', 'roadAccess', 'hospitalDistance',
        'shelterCapacity', 'availableWater', 'foodStock', 'medicalCapacity'
    ];

    const missingFields = 
        requiredFields.filter(
            field => 
                habitation[field] === undefined || 
                habitation[field] === null
        );

    if (missingFields.length > 0){
        return {
            success: false,
            error: "Required ML inputs are missing",
            missingFields
        };
    }

    //Convert backend field names to ML field names

    const payload = {
        habitationId: habitation.habitationId,
        name: habitation.name,
        population: Number(habitation.population),
        rainfall: Number(habitation.rainfall),
        river_level: Number(habitation.riverLevel),
        flood_history: Number(habitation.floodHistory),
        building_damage: Number(habitation.buildingDamage),
        vulnerable_population: Number(habitation.vulnerablePopulation),
        water_level: Number(habitation.waterLevel),
        road_access: Number(habitation.waterLevel),
        hospital_distance: Number(habitation.hospitalDistance),
        shelter_capacity: Number(habitation.shelterCapacity),
        available_water: Number(habitation.availableWater),
        food_stock: Number(habitation.foodStock),
        medical_capacity: Number(habitation.medicalCapacity)
    };

    return await mlPost(
        "/predict/habitation",
        payload
    );
}

module.exports = {mlPost, getMLHealth, getHabitationPrediction};