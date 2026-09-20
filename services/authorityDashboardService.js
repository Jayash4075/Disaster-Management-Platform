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
        RelocationSite.find({}).lean()
    ]);

    /*
     * IMPORTANT:
     * A village is considered assessed ONLY when the ML assessment
     * has successfully completed.
     *
     * Do NOT use:
     * typeof h.riskScore === "number"
     *
     * because seeded/demo risk values could already exist in MongoDB.
     */
    const assessed = habitations.filter(
        habitation => habitation.assessmentStatus === "ASSESSED"
    );

    const red = assessed.filter(
        habitation => habitation.riskLevel === "RED"
    );

    const orange = assessed.filter(
        habitation => habitation.riskLevel === "ORANGE"
    );

    const yellow = assessed.filter(
        habitation => habitation.riskLevel === "YELLOW"
    );

    const green = assessed.filter(
        habitation => habitation.riskLevel === "GREEN"
    );

    /*
     * People at risk:
     * Count population only from ML-assessed RED + ORANGE villages.
     */
    const peopleAtRisk = [...red, ...orange].reduce(
        (sum, habitation) => sum + (habitation.population || 0),
        0
    );

    /*
     * Immediate relocation:
     * Count only ML-assessed villages whose ML result says
     * relocationPriority = IMMEDIATE.
     */
    const immediateRelocation = assessed.filter(
        habitation =>
            habitation.relocationPriority === "IMMEDIATE"
    ).length;

    /*
     * Safe sites are independent of ML village assessment.
     * They come from actual relocation-site records.
     */
    const safeSites = relocationSites.filter(
        site => (site.capacity?.available || 0) > 0
    ).length;

    /*
     * Average risk score of ML-assessed villages only.
     */
    const overallRiskScore = assessed.length
        ? Number(
              (
                  assessed.reduce(
                      (sum, habitation) =>
                          sum + (habitation.riskScore || 0),
                      0
                  ) / assessed.length
              ).toFixed(2)
          )
        : 0;

    /*
     * Map should contain ONLY ML-assessed villages
     * with valid GeoJSON coordinates.
     */
    const features = assessed
        .filter(
            habitation =>
                Array.isArray(habitation.location?.coordinates) &&
                habitation.location.coordinates.length === 2
        )
        .map(habitation => ({
            type: "Feature",

            geometry: {
                type: "Point",
                coordinates: habitation.location.coordinates
            },

            properties: {
                habitationId: habitation.habitationId,
                name: habitation.name,
                population: habitation.population || 0,

                riskScore: habitation.riskScore,
                riskLevel: habitation.riskLevel,

                vulnerabilityScore:
                    habitation.vulnerabilityScore,

                relocationPriority:
                    habitation.relocationPriority,

                capacityStatus:
                    habitation.capacityStatus
            }
        }));

    /*
     * Check ML service health.
     */
    let mlStatus = "unknown";

    try {
        const health = await getMLHealth();

        mlStatus = health.status || "unknown";
    } catch (error) {
        console.error(
            "ML health check failed:",
            error.message
        );

        mlStatus = "unavailable";
    }

    return {
        success: true,

        systemStatus:
            mlStatus === "healthy"
                ? "operational"
                : "degraded",

        dataSource: {
            mlService: mlStatus === "healthy",

            // Total villages present in MongoDB
            villages: habitations.length,

            // Villages successfully assessed by ML
            assessedVillages: assessed.length
        },

        summary: {
            criticalRedZones: red.length,

            peopleAtRisk,

            immediateRelocation,

            safeSites
        },

        riskOverview: {
            overallRiskScore,

            riskLevel:
                calculateRiskLevel(overallRiskScore),

            affectedVillages:
                red.length + orange.length,

            criticalVillages:
                red.length,

            highRiskVillages:
                orange.length,

            totalVillages:
                habitations.length,

            assessedVillages:
                assessed.length,

            distribution: {
                red: red.length,
                orange: orange.length,
                yellow: yellow.length,
                green: green.length
            }
        },

        map: {
            type: "FeatureCollection",
            features
        }
    };
}

module.exports = {
    getAuthorityDashboard
};