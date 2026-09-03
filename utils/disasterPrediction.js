const predictDisaster = async ({
    rainfall,
    river_level,
    humidity,
    temperature,
    previous_floods
}) => {

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
        const response = await fetch(
            `${process.env.ML_SERVICE_URL || "http://localhost:5001"}/predict/disaster`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    rainfall,
                    river_level,
                    humidity,
                    temperature,
                    previous_floods
                })
            }
        );

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "ML service prediction failed"
            );
        }

        return data;

    } catch (error) {
        clearTimeout(timeoutId);

        console.error(
            "Disaster ML service error:",
            error.message
        );
        return {
            success: false,
            prediction: { risk: "UNKNOWN", probability: null },
            probabilities: {}
        };

    }
};

module.exports = predictDisaster;