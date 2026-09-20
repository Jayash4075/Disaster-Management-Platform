const Habitation = require("../models/Habitation");
const RelocationSite = require("../models/RelocationSite");
const { getMLHealth } = require("../utils/mlService");

function calculateRiskLevel(score) {
    if (score >= 75) return "RED";
    if (score >= 50) return "ORANGE";
    if (score >= 25) return "YELLOW";
    return "GREEN";
}

async function getAuthorityDashboard() {
    const [habitations, relocationSites] = await Promise.all([
        Habitation.find({}).lean(),
        RelocationSite.find({}).lean()   // FIXED: was missing entirely
    ]);

    const assessed = habitations.filter(h => typeof h.riskScore === "number");
    const red = assessed.filter(h => h.riskLevel === "RED");
    const orange = assessed.filter(h => h.riskLevel === "ORANGE");
    const yellow = assessed.filter(h => h.riskLevel === "YELLOW");
    const green = assessed.filter(h => h.riskLevel === "GREEN");

    const peopleAtRisk = [...red, ...orange].reduce((sum, v) => sum + (v.population || 0), 0);
    const immediateRelocation = assessed.filter(h => h.relocationPriority === "IMMEDIATE").length;
    const safeSites = relocationSites.filter(site => (site.capacity?.available || 0) > 0).length;

    const overallRiskScore = assessed.length
        ? Number((assessed.reduce((sum, v) => sum + (v.riskScore || 0), 0) / assessed.length).toFixed(2))
        : 0;

    const features = assessed
        .filter(v => Array.isArray(v.location?.coordinates) && v.location.coordinates.length === 2)
        .map(v => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: v.location.coordinates },
            properties: {
                habitationId: v.habitationId,
                name: v.name,
                population: v.population || 0,
                riskScore: v.riskScore,
                riskLevel: v.riskLevel,
                vulnerabilityScore: v.vulnerabilityScore,
                relocationPriority: v.relocationPriority,
                capacityStatus: v.capacityStatus
            }
        }));

    let mlStatus = "unknown";
    try {
        const health = await getMLHealth();
        mlStatus = health.status || "unknown";
    } catch {
        mlStatus = "unavailable";
    }

    return {
        success: true,
        systemStatus: mlStatus === "healthy" ? "operational" : "degraded",
        dataSource: {
            mlService: mlStatus === "healthy",
            villages: habitations.length,
            assessedVillages: assessed.length
        },
        summary: {
            criticalRedZones: red.length,
            peopleAtRisk,
            immediateRelocation,
            safeSites
        },
        riskOverview: {
            overallRiskScore, // FIXED typo
            riskLevel: calculateRiskLevel(overallRiskScore),
            affectedVillages: red.length + orange.length,
            criticalVillages: red.length,
            highRiskVillages: orange.length,
            totalVillages: habitations.length,
            assessedVillages: assessed.length,
            distribution: { red: red.length, orange: orange.length, yellow: yellow.length, green: green.length }
        },
        map: { type: "FeatureCollection", features }
    };
}

module.exports = { getAuthorityDashboard };