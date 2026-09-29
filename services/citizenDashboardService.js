const Habitation = require("../models/Habitation.js");
const Shelter = require("../models/shelter.js");
const RelocationSite = require("../models/RelocationSite.js");
const RiskZone = require("../models/riskzone.js");
const Resource = require("../models/Resource.js");
const ResourceRequest = require("../models/ResourceRequest.js");

const getCurrentWeather = require("../utils/weatherService.js");
const predictDisaster = require("../utils/disasterPrediction.js");


// ============================================================
// CONFIG
// ============================================================

const HABITATION_RADIUS_METERS = 50000;       // 50 km
const HOSPITAL_SHELTER_RADIUS_METERS = 20000; // 20 km
const RELOCATION_RADIUS_METERS = 50000;       // 50 km
const RESOURCE_RADIUS_METERS = 20000;         // 20 km
const ALERT_RADIUS_METERS = 50000;            // 50 km

const FACILITY_LIMIT = 20;
const RELOCATION_CANDIDATES = 5;
const RESOURCE_LIMIT = 20;
const ALERT_LIMIT = 20;


// ============================================================
// HAVERSINE DISTANCE
// ============================================================

function distanceKm(lat1, lon1, lat2, lon2) {

    const toRad = (deg) => (deg * Math.PI) / 180;

    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}


// ============================================================
// NEAREST ASSESSED HABITATION
// ============================================================

async function getNearestHabitation(lat, lng) {

    let habitation = await Habitation.findOne({

        assessmentStatus: "ASSESSED",

        location: {

            $near: {

                $geometry: {
                    type: "Point",
                    coordinates: [lng, lat]
                },

                $maxDistance:
                    HABITATION_RADIUS_METERS

            }

        }

    });

    /*
     * If there is no assessed habitation within 50 km,
     * try the nearest assessed habitation anywhere.
     */

    if (!habitation) {

        habitation = await Habitation.findOne({

            assessmentStatus: "ASSESSED",

            location: {

                $near: {

                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    }

                }

            }

        });

    }

    return habitation;
}


// ============================================================
// NEARBY HOSPITALS / SHELTERS
// ============================================================

async function getNearbyFacilities(lat, lng, type) {

    const docs = await Shelter.find({

        type,

        location: {

            $near: {

                $geometry: {
                    type: "Point",
                    coordinates: [lng, lat]
                },

                $maxDistance:
                    HOSPITAL_SHELTER_RADIUS_METERS

            }

        }

    }).limit(FACILITY_LIMIT);


    return docs.map((doc) => {

        const [
            docLng,
            docLat
        ] = doc.location?.coordinates || [];


        return {

            id: doc._id,

            name: doc.name,

            type: doc.type,

            address: doc.address,

            contact: doc.contact,

            capacity: doc.capacity,

            currentOccupancy:
                doc.currentOccupancy,

            facilities:
                doc.facilities,

            latitude: docLat,

            longitude: docLng,

            distance:
                docLat !== undefined &&
                docLng !== undefined

                    ? Number(
                        distanceKm(
                            lat,
                            lng,
                            docLat,
                            docLng
                        ).toFixed(1)
                    )

                    : null

        };

    });

}


// ============================================================
// NEARBY RELOCATION SITES
//
// This function is now independent of "habitation".
// requiredCapacity is explicitly passed in.
// ============================================================

async function getRelocationCandidates(
    lat,
    lng,
    requiredCapacity = 0
) {

    const query = {

        status: "ACTIVE",

        location: {

            $near: {

                $geometry: {
                    type: "Point",
                    coordinates: [lng, lat]
                },

                $maxDistance:
                    RELOCATION_RADIUS_METERS

            }

        },

        "capacity.available": {
            $gt: 0
        }

    };


    /*
     * First fetch nearby active sites.
     *
     * We deliberately do NOT require the entire village
     * population here, because citizens should still be able
     * to see nearby safer sites even when none can accommodate
     * the whole population.
     */

    const sites =
        await RelocationSite
            .find(query)
            .limit(20);


    const withDistance =
        sites.map((site) => {

            const [
                siteLng,
                siteLat
            ] =
                site.location?.coordinates || [];


            const availableCapacity =
                Number(
                    site.capacity?.available
                ) || 0;


            const suitableForPopulation =
                requiredCapacity > 0
                    ? availableCapacity >=
                      requiredCapacity
                    : true;


            return {

                id: site._id,

                siteId: site.siteId,

                name: site.name,

                status: site.status,

                capacity: {

                    total:
                        Number(
                            site.capacity?.total
                        ) || 0,

                    occupied:
                        Number(
                            site.capacity?.occupied
                        ) || 0,

                    available:
                        availableCapacity

                },

                suitabilityScore:
                    Number(
                        site.suitabilityScore
                    ) || 0,

                suitableForPopulation,

                latitude: siteLat,

                longitude: siteLng,

                distance:
                    siteLat !== undefined &&
                    siteLng !== undefined

                        ? Number(
                            distanceKm(
                                lat,
                                lng,
                                siteLat,
                                siteLng
                            ).toFixed(1)
                        )

                        : null

            };

        });


    /*
     * For recommendation:
     *
     * 1. Must be able to accommodate the population.
     * 2. Higher suitability first.
     * 3. Then shorter distance.
     */

    const suitableSites =
        withDistance.filter(
            site =>
                site.suitableForPopulation
        );


    suitableSites.sort(
        (a, b) => {

            const scoreA =
                a.suitabilityScore || 0;

            const scoreB =
                b.suitabilityScore || 0;


            if (
                scoreB !== scoreA
            ) {

                return (
                    scoreB -
                    scoreA
                );

            }


            return (
                (a.distance ?? Infinity) -
                (b.distance ?? Infinity)
            );

        }
    );


    /*
     * Nearby sites for display.
     *
     * These are not necessarily the final recommendation.
     */

    withDistance.sort(
        (a, b) => {

            const scoreA =
                a.suitabilityScore || 0;

            const scoreB =
                b.suitabilityScore || 0;


            if (
                scoreB !== scoreA
            ) {

                return (
                    scoreB -
                    scoreA
                );

            }


            return (
                (a.distance ?? Infinity) -
                (b.distance ?? Infinity)
            );

        }
    );


    return {

        nearbySites:
            withDistance.slice(
                0,
                RELOCATION_CANDIDATES
            ),

        recommendedSite:
            suitableSites.length > 0
                ? suitableSites[0]
                : null

    };

}


// ============================================================
// ACTIVE ALERTS / RISK ZONES
// ============================================================

async function getNearbyAlerts(lat, lng) {

    const zones =
        await RiskZone.find({

            active: true,

            location: {

                $near: {

                    $geometry: {

                        type: "Point",

                        coordinates: [
                            lng,
                            lat
                        ]

                    },

                    $maxDistance:
                        ALERT_RADIUS_METERS

                }

            }

        })

        .sort({
            createdAt: -1
        })

        .limit(ALERT_LIMIT);


    return zones.map((zone) => {

        const [
            zoneLng,
            zoneLat
        ] =
            zone.location?.coordinates || [];


        return {

            id: zone._id,

            areaName:
                zone.areaName,

            riskLevel:
                zone.riskLevel,

            disasterType:
                zone.disasterType,

            description:
                zone.description,

            active:
                zone.active,

            latitude:
                zoneLat,

            longitude:
                zoneLng,

            distance:
                zoneLat !== undefined &&
                zoneLng !== undefined

                    ? Number(
                        distanceKm(
                            lat,
                            lng,
                            zoneLat,
                            zoneLng
                        ).toFixed(1)
                    )

                    : null,

            createdAt:
                zone.createdAt

        };

    });

}


// ============================================================
// NEARBY EMERGENCY RESOURCES
// ============================================================

async function getNearbyResources(lat, lng) {

    const resources =
        await Resource.find({

            status: "available",

            quantity: {
                $gt: 0
            },

            location: {

                $near: {

                    $geometry: {

                        type: "Point",

                        coordinates: [
                            lng,
                            lat
                        ]

                    },

                    $maxDistance:
                        RESOURCE_RADIUS_METERS

                }

            }

        })

        .limit(RESOURCE_LIMIT);


    return resources.map((resource) => {

        const [
            resourceLng,
            resourceLat
        ] =
            resource.location?.coordinates || [];


        return {

            id: resource._id,

            type:
                resource.type,

            quantity:
                Number(
                    resource.quantity
                ) || 0,

            transportAvailable:
                Boolean(
                    resource.transportAvailable
                ),

            status:
                resource.status,

            latitude:
                resourceLat,

            longitude:
                resourceLng,

            distance:
                resourceLat !== undefined &&
                resourceLng !== undefined

                    ? Number(
                        distanceKm(
                            lat,
                            lng,
                            resourceLat,
                            resourceLng
                        ).toFixed(1)
                    )

                    : null

        };

    });

}


// ============================================================
// OPEN RESOURCE REQUESTS / SHORTAGE INFORMATION
//
// This uses the existing ResourceRequest collection.
// It does NOT call the removed shortage ML model.
// ============================================================

async function getNearbyResourceRequests(lat, lng) {

    const requests =
        await ResourceRequest.find({

            status: {
                $in: [
                    "open",
                    "partially-fulfilled"
                ]
            },

            location: {

                $near: {

                    $geometry: {

                        type: "Point",

                        coordinates: [
                            lng,
                            lat
                        ]

                    },

                    $maxDistance:
                        RESOURCE_RADIUS_METERS

                }

            }

        })

        .limit(RESOURCE_LIMIT);


    return requests.map((request) => {

        const [
            requestLng,
            requestLat
        ] =
            request.location?.coordinates || [];


        return {

            id: request._id,

            campName:
                request.campName,

            type:
                request.type,

            quantityNeeded:
                Number(
                    request.quantityNeeded
                ) || 0,

            quantityFulfilled:
                Number(
                    request.quantityFulfilled
                ) || 0,

            population:
                Number(
                    request.population
                ) || 0,

            urgency:
                request.urgency,

            status:
                request.status,

            shortageStatus:
                request.shortageStatus,

            shortageHours:
                request.shortageHours,

            latitude:
                requestLat,

            longitude:
                requestLng,

            distance:
                requestLat !== undefined &&
                requestLng !== undefined

                    ? Number(
                        distanceKm(
                            lat,
                            lng,
                            requestLat,
                            requestLng
                        ).toFixed(1)
                    )

                    : null

        };

    });

}


// ============================================================
// HAZARD BREAKDOWN
// ============================================================

function buildHazardZones(habitation) {

    if (
        !habitation ||
        !habitation.hazards
    ) {

        return [];

    }


    const {
        flood,
        landslide,
        erosion,
        cloudburst
    } =
        habitation.hazards;


    return Object.entries({

        flood,

        landslide,

        erosion,

        cloudburst

    })

        .filter(
            ([, score]) =>
                score !== null &&
                score !== undefined
        )

        .map(
            ([type, score]) => ({

                type,

                score:
                    Number(score),

                habitationName:
                    habitation.name

            })
        );

}


// ============================================================
// GEOJSON MAP FEATURES
//
// Reuses the same MongoDB records used by authority.
// ============================================================

function buildMapFeatures({

    habitations,

    riskZones,

    relocationSites,

    hospitals,

    shelters

}) {

    const features = [];


    // --------------------------------------------------------
    // ASSESSED HABITATIONS
    // --------------------------------------------------------

    for (
        const habitation of habitations
    ) {

        const coordinates =
            habitation.location
                ?.coordinates;


        if (
            !Array.isArray(coordinates) ||
            coordinates.length !== 2
        ) {

            continue;

        }


        features.push({

            type: "Feature",

            geometry: {

                type: "Point",

                coordinates

            },

            properties: {

                type:
                    "habitation",

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

                capacityRatio:
                    habitation.capacityRatio,

                capacityStatus:
                    habitation.capacityStatus,

                hazards:
                    habitation.hazards || {}

            }

        });

    }


    // --------------------------------------------------------
    // ACTIVE RISK ZONES
    // --------------------------------------------------------

    for (
        const zone of riskZones
    ) {

        const coordinates =
            zone.location
                ?.coordinates;


        if (
            !Array.isArray(coordinates) ||
            coordinates.length !== 2
        ) {

            continue;

        }


        features.push({

            type: "Feature",

            geometry: {

                type: "Point",

                coordinates

            },

            properties: {

                type:
                    "riskZone",

                id:
                    zone._id,

                name:
                    zone.areaName,

                riskLevel:
                    zone.riskLevel,

                disasterType:
                    zone.disasterType,

                description:
                    zone.description

            }

        });

    }


    // --------------------------------------------------------
    // RELOCATION SITES
    // --------------------------------------------------------

    for (
        const site of relocationSites
    ) {

        const coordinates =
            site.location
                ?.coordinates;


        if (
            !Array.isArray(coordinates) ||
            coordinates.length !== 2
        ) {

            continue;

        }


        features.push({

            type: "Feature",

            geometry: {

                type: "Point",

                coordinates

            },

            properties: {

                type:
                    "relocationSite",

                siteId:
                    site.siteId,

                name:
                    site.name,

                capacity:
                    site.capacity,

                suitabilityScore:
                    site.suitabilityScore,

                status:
                    site.status

            }

        });

    }


    // --------------------------------------------------------
    // HOSPITALS
    // --------------------------------------------------------

    for (
        const hospital of hospitals
    ) {

        if (
            hospital.longitude === undefined ||
            hospital.latitude === undefined
        ) {

            continue;

        }


        features.push({

            type: "Feature",

            geometry: {

                type: "Point",

                coordinates: [

                    hospital.longitude,

                    hospital.latitude

                ]

            },

            properties: {

                type:
                    "hospital",

                id:
                    hospital.id,

                name:
                    hospital.name,

                address:
                    hospital.address,

                contact:
                    hospital.contact

            }

        });

    }


    // --------------------------------------------------------
    // SHELTERS
    // --------------------------------------------------------

    for (
        const shelter of shelters
    ) {

        if (
            shelter.longitude === undefined ||
            shelter.latitude === undefined
        ) {

            continue;

        }


        features.push({

            type: "Feature",

            geometry: {

                type: "Point",

                coordinates: [

                    shelter.longitude,

                    shelter.latitude

                ]

            },

            properties: {

                type:
                    "shelter",

                id:
                    shelter.id,

                name:
                    shelter.name,

                address:
                    shelter.address,

                capacity:
                    shelter.capacity,

                currentOccupancy:
                    shelter.currentOccupancy

            }

        });

    }


    return {

        type:
            "FeatureCollection",

        features

    };

}


// ============================================================
// LIVE ML DISASTER PREDICTION
//
// Uses the SAME Flask ML service already used elsewhere.
// If ML is unavailable, MongoDB habitation assessment is used.
// ============================================================

async function getLiveDisasterRisk(
    lat,
    lng,
    habitation
) {

    try {

        const weather =
            await getCurrentWeather(
                lat,
                lng
            );


        /*
         * These two values already match the existing
         * disasterPrediction.js contract.
         *
         * Prefer habitation history if available.
         */

        const riverLevel =
            Number(
                habitation?.riverLevel
            );

        const previousFloods =
            Number(
                habitation?.floodHistory
            );


        const prediction =
            await predictDisaster({

                rainfall:
                    Number(
                        weather.rainfall
                    ) || 0,

                river_level:
                    Number.isFinite(
                        riverLevel
                    )
                        ? riverLevel
                        : 3,

                humidity:
                    Number(
                        weather.humidity
                    ) || 0,

                temperature:
                    Number(
                        weather.temperature
                    ) || 0,

                previous_floods:
                    Number.isFinite(
                        previousFloods
                    )
                        ? previousFloods
                        : 0

            });


        return {

            weather,

            prediction

        };

    } catch (error) {

        console.error(
            "Live disaster prediction failed:",
            error.message
        );


        return {

            weather: null,

            prediction: {

                success: false,

                prediction: {

                    risk:
                        "UNKNOWN",

                    probability:
                        null

                },

                probabilities: {}

            }

        };

    }

}


// ============================================================
// MAIN CITIZEN DASHBOARD SERVICE
// ============================================================

async function getCitizenDashboard(
    lat,
    lng
) {

    // ========================================================
    // 1. FIND HABITATION FIRST
    //
    // IMPORTANT:
    // We cannot use "habitation" inside Promise.all()
    // before it exists.
    // ========================================================

    const habitation =
        await getNearestHabitation(
            lat,
            lng
        );


    // ========================================================
    // 2. NOW WE KNOW POPULATION
    //
    // This fixes the previous requiredCapacity bug.
    // ========================================================

    const requiredCapacity =
        habitation
            ? Number(
                habitation.population
            ) || 0

            : 0;


    // ========================================================
    // 3. LOAD ALL EXISTING DATA IN PARALLEL
    // ========================================================

    const [

        hospitals,

        shelters,

        relocationData,

        alerts,

        resources,

        resourceRequests,

        liveRisk

    ] = await Promise.all([

        getNearbyFacilities(
            lat,
            lng,
            "hospital"
        ),

        getNearbyFacilities(
            lat,
            lng,
            "shelter"
        ),

        getRelocationCandidates(
            lat,
            lng,
            requiredCapacity
        ),

        getNearbyAlerts(
            lat,
            lng
        ),

        getNearbyResources(
            lat,
            lng
        ),

        getNearbyResourceRequests(
            lat,
            lng
        ),

        getLiveDisasterRisk(
            lat,
            lng,
            habitation
        )

    ]);


    // ========================================================
    // 4. RISK / SAFETY
    // ========================================================

    const storedRiskLevel =
        habitation?.riskLevel ||
        "UNKNOWN";


    const storedRiskScore =
        habitation
            ? Number(
                habitation.riskScore
            ) || 0

            : 0;


    const storedProbability =
        habitation?.riskProbability != null

            ? Number(
                habitation.riskProbability
            )

            : storedRiskScore > 0

                ? storedRiskScore / 100

                : null;


    const mlPrediction =
        liveRisk?.prediction;


    const mlRisk =
        mlPrediction?.prediction?.risk ||
        mlPrediction?.risk ||
        "UNKNOWN";


    const mlProbability =
        mlPrediction?.prediction?.probability != null

            ? Number(
                mlPrediction.prediction.probability
            )

            : mlPrediction?.probability != null

                ? Number(
                    mlPrediction.probability
                )

                : null;


    /*
     * Keep the dashboard's main risk level compatible with
     * the existing habitation assessment:
     *
     * GREEN / YELLOW / ORANGE / RED
     *
     * while also returning the raw ML prediction.
     */

    const disasterRisk = {

        success:
            Boolean(
                habitation ||
                mlPrediction?.success
            ),

        risk:
            storedRiskLevel,

        probability:
            storedProbability,

        source:
            habitation
                ? "HABITATION_ML_ASSESSMENT"
                : "LIVE_ML",

        liveML: {

            risk:
                mlRisk,

            probability:
                mlProbability,

            success:
                Boolean(
                    mlPrediction?.success
                )

        }

    };


    // ========================================================
    // 5. VULNERABLE HABITATION
    // ========================================================

    const vulnerableHabitations =
        habitation

            ? [

                {

                    id:
                        habitation._id,

                    habitationId:
                        habitation.habitationId,

                    name:
                        habitation.name,

                    population:
                        Number(
                            habitation.population
                        ) || 0,

                    riskLevel:
                        habitation.riskLevel,

                    riskScore:
                        Number(
                            habitation.riskScore
                        ) || 0,

                    relocationPriority:
                        habitation.relocationPriority,

                    vulnerabilityScore:
                        Number(
                            habitation.vulnerabilityScore
                        ) || 0,

                    hazards:
                        habitation.hazards || {},

                    capacityRatio:
                        habitation.capacityRatio,

                    capacityStatus:
                        habitation.capacityStatus,

                    assessmentStatus:
                        habitation.assessmentStatus,

                    lastAssessment:
                        habitation.lastAssessment

                }

            ]

            : [];


    // ========================================================
    // 6. RELOCATION
    // ========================================================

    const relocationSites =
        relocationData?.nearbySites || [];


    const relocationRecommendation =
        relocationData?.recommendedSite ||
        null;


    // ========================================================
    // 7. RISK ZONES / ALERTS
    // ========================================================

    const activeAlerts =
        alerts.length;


    // ========================================================
    // 8. EMERGENCY RESOURCES
    // ========================================================

    const emergencyResources =
        resources.length;


    // ========================================================
    // 9. MAP FEATURES
    //
    // Only load nearby map records to avoid sending the entire
    // authority dataset to every citizen.
    // ========================================================

    const [

        nearbyHabitations,

        nearbyRiskZones,

        nearbyRelocationSites

    ] = await Promise.all([

        Habitation.find({

            assessmentStatus:
                "ASSESSED",

            location: {

                $near: {

                    $geometry: {

                        type: "Point",

                        coordinates: [
                            lng,
                            lat
                        ]

                    },

                    $maxDistance:
                        RELOCATION_RADIUS_METERS

                }

            }

        }).limit(100).lean(),


        RiskZone.find({

            active: true,

            location: {

                $near: {

                    $geometry: {

                        type: "Point",

                        coordinates: [
                            lng,
                            lat
                        ]

                    },

                    $maxDistance:
                        ALERT_RADIUS_METERS

                }

            }

        }).limit(100).lean(),


        RelocationSite.find({

            status:
                "ACTIVE",

            location: {

                $near: {

                    $geometry: {

                        type: "Point",

                        coordinates: [
                            lng,
                            lat
                        ]

                    },

                    $maxDistance:
                        RELOCATION_RADIUS_METERS

                }

            }

        }).limit(50).lean()

    ]);


    const map =
        buildMapFeatures({

            habitations:
                nearbyHabitations,

            riskZones:
                nearbyRiskZones,

            relocationSites:
                nearbyRelocationSites,

            hospitals,

            shelters

        });


    // ========================================================
    // 10. FINAL RESPONSE
    // ========================================================

    return {

        success: true,


        // ----------------------------------------------------
        // LOCATION
        // ----------------------------------------------------

        location: {

            latitude:
                Number(lat),

            longitude:
                Number(lng)

        },


        // ----------------------------------------------------
        // MAIN RISK
        // ----------------------------------------------------

        riskLevel:
            storedRiskLevel,

        riskScore:
            storedRiskScore,

        disasterRisk,


        // ----------------------------------------------------
        // HABITATION
        // ----------------------------------------------------

        habitation:

            habitation

                ? {

                    id:
                        habitation._id,

                    habitationId:
                        habitation.habitationId,

                    name:
                        habitation.name,

                    population:
                        Number(
                            habitation.population
                        ) || 0,

                    riskLevel:
                        habitation.riskLevel,

                    riskScore:
                        storedRiskScore,

                    vulnerabilityScore:
                        habitation.vulnerabilityScore,

                    relocationPriority:
                        habitation.relocationPriority,

                    hazards:
                        habitation.hazards || {},

                    capacityRatio:
                        habitation.capacityRatio,

                    capacityStatus:
                        habitation.capacityStatus,

                    assessmentStatus:
                        habitation.assessmentStatus,

                    modelVersion:
                        habitation.modelVersion,

                    lastAssessment:
                        habitation.lastAssessment

                }

                : null,


        // ----------------------------------------------------
        // ALERTS
        // ----------------------------------------------------

        activeAlerts,

        alerts,


        // ----------------------------------------------------
        // HOSPITALS
        // ----------------------------------------------------

        nearbyHospitals:
            hospitals.length,

        hospitals,


        // ----------------------------------------------------
        // SHELTERS
        // ----------------------------------------------------

        nearbyShelters:
            shelters.length,

        shelters,


        // ----------------------------------------------------
        // HAZARDS
        // ----------------------------------------------------

        hazardZones:
            buildHazardZones(
                habitation
            ),


        vulnerableHabitations,


        // ----------------------------------------------------
        // RELOCATION
        // ----------------------------------------------------

        relocationSites,

        relocationRecommendation,


        // ----------------------------------------------------
        // RESOURCES
        // ----------------------------------------------------

        emergencyResources,

        resources,

        resourceRequests,

        resourceShortageAlerts:
            resourceRequests.filter(
                request =>
                    request.urgency === "critical" ||
                    request.urgency === "high" ||
                    request.shortageStatus === "CRITICAL" ||
                    request.shortageStatus === "WARNING"
            ),


        // ----------------------------------------------------
        // WEATHER
        // ----------------------------------------------------

        weather:
            liveRisk?.weather || null,


        // ----------------------------------------------------
        // MAP
        // ----------------------------------------------------

        map,

        features:
            map.features,


        // ----------------------------------------------------
        // DATA SOURCE
        // ----------------------------------------------------

        dataSource: {

            mongodb:
                true,

            habitationAssessment:
                Boolean(
                    habitation
                ),

            liveML:
                Boolean(
                    mlPrediction?.success
                ),

            riskZones:
                alerts.length,

            relocationSites:
                relocationSites.length,

            resources:
                resources.length

        }

    };

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    getCitizenDashboard

};