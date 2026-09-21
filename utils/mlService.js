const axios = require("axios");

const ML_SERVICE_URL =
    process.env.ML_SERVICE_URL || "http://localhost:5001";

const ML_TIMEOUT =
    Number(process.env.ML_TIMEOUT) || 30000;

async function mlGet(endpoint) {
    try {
        const response = await axios.get(
            `${ML_SERVICE_URL}${endpoint}`,
            {
                timeout: ML_TIMEOUT
            }
        );

        return response.data;

    } catch (error) {
        console.error(
            "ML GET error:",
            error.response?.data || error.message
        );

        throw new Error(
            error.response?.data?.error ||
            "ML service unavailable"
        );
    }
}

async function getMLHealth() {
    return await mlGet("/health");
}

module.exports = {
    mlGet,
    getMLHealth
};