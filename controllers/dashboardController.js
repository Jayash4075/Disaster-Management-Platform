const Shelter = require("../models/shelter");
const RiskZone = require("../models/riskzone");

const getCurrentWeather = require("../utils/weatherService");
const predictDisasterRisk = require("../utils/disasterPrediction");


// ============================================================
// GET CITIZEN DASHBOARD
// ============================================================

module.exports.getDashboard = async (req, res) => {
    try {

        const { lat, lng } = req.query;


        // ========================================================
        // 1. VALIDATE LOCATION
        // ========================================================

        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                message: "lat and lng query params are required"
            });
        }


        const latitude = Number(lat);
        const longitude = Number(lng);


        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return res.status(400).json({
                message: "Invalid lat/lng"
            });
        }


        console.log(
            "Dashboard location:",
            latitude,
            longitude
        );


        // Nearby emergency resources radius
        const RESOURCE_RADIUS_METERS = 10000;

        // Disaster alert radius
        const ALERT_RADIUS_METERS = 10000;

        let allShelters = [];

        try {

            allShelters = await Shelter.find({
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [
                                longitude,
                                latitude
                            ]
                        },
                        $maxDistance: RESOURCE_RADIUS_METERS
                    }
                }
            });

        } catch (err) {

            console.error(
                "Shelter fetch error:",
                err.message
            );

            allShelters = [];
        }

        const hospitals = allShelters.filter((place) => {

            return (
                place.type &&
                String(place.type)
                    .toLowerCase()
                    .includes("hospital")
            );

        });


        const shelters = allShelters.filter((place) => {

            return !(
                place.type &&
                String(place.type)
                    .toLowerCase()
                    .includes("hospital")
            );

        });


        console.log(
            "Nearby places:",
            allShelters.length
        );

        console.log(
            "Nearby hospitals:",
            hospitals.length
        );

        console.log(
            "Nearby shelters:",
            shelters.length
        );
        
        let nearbyRiskZones = [];

        try {

            nearbyRiskZones = await RiskZone.aggregate([

                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [
                                longitude,
                                latitude
                            ]
                        },

                        distanceField: "distanceFromUser",

                        spherical: true,

                        maxDistance:
                            ALERT_RADIUS_METERS,

                        query: {
                            active: true
                        }
                    }
                },

                {
                    $sort: {
                        createdAt: -1
                    }
                }

            ]);

        } catch (err) {

            console.error(
                "Risk zone fetch error:",
                err.message
            );

            nearbyRiskZones = [];
        }


        // ========================================================
        // 6. CONVERT RISK ZONES INTO CITIZEN ALERTS
        // ========================================================

        const alerts = nearbyRiskZones.map((zone) => {

            const distanceKm =
                Number(zone.distanceFromUser || 0) /
                1000;


            return {

                id: zone._id,

                _id: zone._id,

                type: "disaster",

                title:
                    `${String(zone.riskLevel || "low").toUpperCase()} RISK ALERT`,

                areaName:
                    zone.areaName,

                description:
                    zone.description ||
                    `A ${String(
                        zone.riskLevel || "low"
                    ).toUpperCase()} risk zone is active near your location.`,

                riskLevel:
                    zone.riskLevel,

                severity:
                    zone.riskLevel,

                active:
                    zone.active,

                distance:
                    Number(distanceKm.toFixed(2)),

                distanceKm:
                    Number(distanceKm.toFixed(2)),

                location:
                    zone.location,

                createdAt:
                    zone.createdAt,

                updatedAt:
                    zone.updatedAt
            };

        });


        console.log(
            "Active nearby alerts:",
            alerts.length
        );


        // ========================================================
        // 7. GET CURRENT WEATHER
        // ========================================================

        const weather =
            await getCurrentWeather(
                latitude,
                longitude
            )
            .catch((err) => {

                console.error(
                    "Weather fetch error:",
                    err.message
                );

                return null;

            });


        // ========================================================
        // 8. DISASTER ML PREDICTION
        // ========================================================

        let disasterRisk = null;


        if (weather) {

            try {

                /*
                 * IMPORTANT:
                 * These two values are currently fallback/demo
                 * values because your current ML model requires
                 * river_level and previous_floods.
                 *
                 * We can connect real sources later.
                 */

                const riverLevel = 3;

                const previousFloods = 2;


                disasterRisk =
                    await predictDisasterRisk({

                        rainfall:
                            weather.rainfall,

                        river_level:
                            riverLevel,

                        humidity:
                            weather.humidity,

                        temperature:
                            weather.temperature,

                        previous_floods:
                            previousFloods

                    });


            } catch (err) {

                console.error(
                    "ML prediction error:",
                    err.message
                );


                disasterRisk = {

                    success: false,

                    message:
                        "Prediction unavailable"

                };

            }

        }


        // ========================================================
        // 9. RETURN COMPLETE DASHBOARD DATA
        // ========================================================

        return res.status(200).json({

            // ----------------------------------------------------
            // ALERT SUMMARY
            // ----------------------------------------------------

            activeAlerts:
                alerts.length,


            // ----------------------------------------------------
            // NEARBY RESOURCES
            // ----------------------------------------------------

            nearbyHospitals:
                hospitals.length,

            nearbyShelters:
                shelters.length,


            // ----------------------------------------------------
            // ACTUAL ALERTS
            // ----------------------------------------------------

            alerts,


            // ----------------------------------------------------
            // MAP DATA
            // ----------------------------------------------------

            hospitals,

            shelters,


            // ----------------------------------------------------
            // ML RISK
            // ----------------------------------------------------

            disasterRisk,


            // ----------------------------------------------------
            // WEATHER
            // ----------------------------------------------------

            weather,


            // ----------------------------------------------------
            // FEATURES USED BY ML
            // ----------------------------------------------------

            features: weather
                ? {

                    rainfall:
                        weather.rainfall,

                    river_level:
                        3,

                    humidity:
                        weather.humidity,

                    temperature:
                        weather.temperature,

                    previous_floods:
                        2

                }
                : null

        });


    } catch (err) {

        console.error(
            "Dashboard error:",
            err
        );


        return res.status(500).json({

            message:
                "Failed to load dashboard",

            error:
                err.message

        });

    }
};