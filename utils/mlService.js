const predictSOSSeverity = async (features) => {
    const mlServiceUrl = process.env.ML_SERVICE_URL;
    
    const payload = {
        people_trapped: Number(features.peopleCount),
        injured_people: Number(features.injured_people),
        critical_injuries: Number(features.critical_injuries),
        children_elderly: Number(features.children_elderly),
        water_level: Number(features.water_level),
        building_damage: Number(features.building_damage),
        hours_trapped: Number(features.hours_trapped),
        communication_available: Number(features.communication_available)
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
        const response = await fetch(`${mlServiceUrl}/predict/sos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`ML service HTTP error: status ${response.status}`);
        }

        const data = await response.json();

        if (data && data.success && data.prediction) {
            return {
                success: true,
                severityScore: Number(data.prediction.severity_score),
                severityLabel: String(data.prediction.severity),
                mlProbability: (data.prediction.probability !== undefined && data.prediction.probability !== null) ? Number(data.prediction.probability) : null,
                isMlPredicted: true,
                mlStatus: 'SUCCESS'
            };
        } else {
            throw new Error('Invalid or unexpected ML service response format');
        }
        
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn('[ML Service Warning] Failed to reach Flask ML service:', err.message);

        // Safe heuristic fallback calculation when ML service is unavailable
        const fallbackScore = Math.min(
            100,
            (payload.people_trapped * 10) +
            (payload.injured_people * 20) +
            (payload.critical_injuries * 35) +
            (payload.building_damage * 10) +
            (payload.water_level * 10)
        );

        return {
            success: false,
            severityScore: fallbackScore,
            severityLabel: 'HEURISTIC_FALLBACK',
            mlProbability: null,
            isMlPredicted: false,
            mlStatus: 'FALLBACK_HEURISTIC'
        };
    }
};

module.exports = predictSOSSeverity;