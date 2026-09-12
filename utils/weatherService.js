const weatherCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const getCurrentWeather = async (latitude, longitude) => {
    try {
        if (
            latitude === undefined ||
            longitude === undefined ||
            !Number.isFinite(Number(latitude)) ||
            !Number.isFinite(Number(longitude))
        ) {
            throw new Error("Valid latitude and longitude are required");
        }

        const lat = Number(latitude);
        const lon = Number(longitude);

        const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
        const cached = weatherCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
            return cached.data;
        }

        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${lat}` +
            `&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,rain` +
            `&hourly=precipitation` +
            `&timezone=auto`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(
                `Weather API returned ${response.status}`
            );
        }

        const data = await response.json();
        const current = data.current;

        if (!current) {
            throw new Error("Invalid weather API response");
        }

        // FIX: build the actual result object first...
        const result = {
            temperature: Number(current.temperature_2m ?? 0),
            humidity: Number(current.relative_humidity_2m ?? 0),
            rainfall: Number(current.rain ?? 0)
        };

        // ...THEN cache it, using the real object
        weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });

        return result;

    } catch (error) {
        console.error(
            "Weather service error:",
            error.message
        );

        throw error;
    }
};

module.exports = getCurrentWeather;