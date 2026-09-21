const Habitation = require("../models/Habitation.js");
const RelocationSite = require("../models/RelocationSite.js");

const {
    getMLHealth,
    getVillages
} = require("../utils/mlService");


// ============================================================
// RISK LEVEL FROM SCORE
// ============================================================

function calculateRiskLevel(score) {

    if (score >= 75) {
        return "RED";
    }

    if (score >= 50) {
        return "ORANGE";
    }

    if (score >= 25) {
        return "YELLOW";
    }

    return "GREEN";
}


// ============================================================
// EXTRACT ML VILLAGE COUNT
// ============================================================

function extractVillageCount(data) {

    if (Array.isArray(data)) {
        return data.length;
    }

    if (typeof data?.count === "number") {
        return data.count;
    }

    if (typeof data?.total === "number") {
        return data.total;
    }

    if (typeof data?.totalVillages === "number") {
        return data.totalVillages;
    }

    if (Array.isArray(data?.villages)) {
        return data.villages.length;
    }

    if (Array.isArray(data?.data)) {
        return data.data.length;
    }

    if (Array.isArray(data?.data?.villages)) {
        return data.data.villages.length;
    }

    return null;
}


// ============================================================
// AUTHORITY DASHBOARD
// ============================================================

async function getAuthorityDashboard() {

    // --------------------------------------------------------
    // 1. LOAD MONGODB DATA
    //
    // Dashboard must primarily depend on MongoDB operational
    // records. ML service should be supplementary.
    // --------------------------------------------------------

    const [
        habitations,
        relocationSites
    ] = await Promise.all([

        Habitation.find({})
            .lean(),

        RelocationSite.find({})
            .lean()

    ]);


    // --------------------------------------------------------
    // 2. ONLY ML-ASSESSED VILLAGES
    // --------------------------------------------------------

    const assessed = habitations.filter(
        habitation =>
            habitation.assessmentStatus === "ASSESSED"
    );


    // --------------------------------------------------------
    // 3. RISK DISTRIBUTION
    // --------------------------------------------------------

    const red = assessed.filter(
        habitation =>
            habitation.riskLevel === "RED"
    );

    const orange = assessed.filter(
        habitation =>
            habitation.riskLevel === "ORANGE"
    );

    const yellow = assessed.filter(
        habitation =>
            habitation.riskLevel === "YELLOW"
    );

    const green = assessed.filter(
        habitation =>
            habitation.riskLevel === "GREEN"
    );


    // --------------------------------------------------------
    // 4. PEOPLE AT RISK
    // RED + ORANGE
    // --------------------------------------------------------

    const peopleAtRisk = [
        ...red,
        ...orange
    ].reduce(

        (sum, habitation) =>
            sum +
            (Number(habitation.population) || 0),

        0

    );


    // --------------------------------------------------------
    // 5. IMMEDIATE RELOCATION
    // --------------------------------------------------------

    const immediateRelocation =
        assessed.filter(

            habitation =>
                habitation.relocationPriority ===
                "IMMEDIATE"

        ).length;


    // --------------------------------------------------------
    // 6. SAFE RELOCATION SITES
    // --------------------------------------------------------

    const safeSites =
        relocationSites.filter(

            site =>
                (Number(site.capacity?.available) || 0) > 0

        ).length;


    // --------------------------------------------------------
    // 7. OVERALL RISK SCORE
    // --------------------------------------------------------

    const overallRiskScore =
        assessed.length > 0

            ? Number(

                (
                    assessed.reduce(

                        (sum, habitation) =>
                            sum +
                            (
                                Number(
                                    habitation.riskScore
                                ) || 0
                            ),

                        0

                    ) / assessed.length

                ).toFixed(2)

            )

            : 0;


    // --------------------------------------------------------
    // 8. GEOJSON MAP FEATURES
    // --------------------------------------------------------

    const features = assessed

        .filter(habitation => {

            const coordinates =
                habitation.location?.coordinates;

            return (

                Array.isArray(coordinates) &&

                coordinates.length === 2 &&

                coordinates.every(
                    value =>
                        typeof value === "number" &&
                        Number.isFinite(value)
                )

            );

        })

        .map(habitation => ({

            type: "Feature",

            geometry: {

                type: "Point",

                coordinates:
                    habitation.location.coordinates

            },

            properties: {

                habitationId:
                    habitation.habitationId,

                name:
                    habitation.name,

                population:
                    Number(
                        habitation.population
                    ) || 0,

                riskScore:
                    Number(
                        habitation.riskScore
                    ) || 0,

                riskLevel:
                    habitation.riskLevel,

                vulnerabilityScore:
                    Number(
                        habitation.vulnerabilityScore
                    ) || 0,

                relocationPriority:
                    habitation.relocationPriority,

                capacityStatus:
                    habitation.capacityStatus

            }

        }));


    // --------------------------------------------------------
    // 9. ML SERVICE HEALTH
    //
    // IMPORTANT:
    // ML failure MUST NOT crash dashboard.
    // --------------------------------------------------------

    let mlStatus = "unavailable";

    try {

        const health =
            await getMLHealth();

        const rawStatus =
            String(
                health?.status ||
                health?.data?.status ||
                ""
            ).toLowerCase();

        if (
            [
                "healthy",
                "ok",
                "operational",
                "up"
            ].includes(rawStatus)
        ) {

            mlStatus = "healthy";

        } else {

            mlStatus =
                rawStatus || "unknown";

        }

    } catch (error) {

        console.error(
            "ML health check failed:",
            error.message
        );

        mlStatus = "unavailable";

    }


    // --------------------------------------------------------
    // 10. ML MASTER DATASET COUNT
    //
    // IMPORTANT:
    // This is OPTIONAL.
    //
    // If /api/villages is unavailable, dashboard still works.
    // --------------------------------------------------------

    let mlDatasetVillages = null;

    if (mlStatus === "healthy") {

        try {

            const villageData =
                await getVillages();

            mlDatasetVillages =
                extractVillageCount(
                    villageData
                );

        } catch (error) {

            console.warn(
                "ML village dataset unavailable. " +
                "Using MongoDB count instead:",
                error.message
            );

            mlDatasetVillages = null;

        }

    }


    // --------------------------------------------------------
    // 11. TOTAL VILLAGES
    //
    // Prefer ML master dataset when available.
    // Otherwise MongoDB operational records.
    // --------------------------------------------------------

    const totalVillages =
        mlDatasetVillages !== null
            ? mlDatasetVillages
            : habitations.length;


    // --------------------------------------------------------
    // 12. FINAL RESPONSE
    // --------------------------------------------------------

    return {

        success: true,

        systemStatus:
            mlStatus === "healthy"
                ? "operational"
                : "degraded",

        dataSource: {

            mlService:
                mlStatus === "healthy",

            mlStatus,

            villages:
                totalVillages,

            mlDatasetVillages,

            operationalVillages:
                habitations.length,

            assessedVillages:
                assessed.length

        },

        summary: {

            criticalRedZones:
                red.length,

            peopleAtRisk,

            immediateRelocation,

            safeSites

        },

        riskOverview: {

            overallRiskScore,

            riskLevel:
                calculateRiskLevel(
                    overallRiskScore
                ),

            affectedVillages:
                red.length + orange.length,

            criticalVillages:
                red.length,

            highRiskVillages:
                orange.length,

            totalVillages,

            assessedVillages:
                assessed.length,

            distribution: {

                red:
                    red.length,

                orange:
                    orange.length,

                yellow:
                    yellow.length,

                green:
                    green.length

            }

        },

        map: {

            type:
                "FeatureCollection",

            features

        }

    };

}


module.exports = {
    getAuthorityDashboard
};