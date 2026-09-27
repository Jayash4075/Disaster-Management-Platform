const Habitation = require("../models/Habitation");
const RelocationSite = require("../models/RelocationSite");

// ============================================================
// CONFIGURATION
// ============================================================

// Maximum practical distance considered for nearby relocation.
// Keep this configurable because the final operational limit
// can be changed according to authority requirements.
const MAX_RELOCATION_DISTANCE_KM = 50;

// Minimum suitability score for a site to be considered
// a suitable relocation option.
const MIN_SUITABILITY_SCORE = 50;


// ============================================================
// 1. GET RECOMMENDED SITE FOR A HABITATION
// ============================================================

module.exports.getRecommendedSite = async (req, res) => {

    try {

        const habitation = await Habitation.findOne({
            habitationId: req.params.id
        }).lean();


        if (!habitation) {

            return res.status(404).json({
                success: false,
                message: "Habitation not found"
            });

        }


        const population =
            Number(habitation.population) || 0;


        // --------------------------------------------------------
        // Get habitation coordinates
        // GeoJSON format:
        // [longitude, latitude]
        // --------------------------------------------------------

        const coordinates =
            habitation.location?.coordinates;


        if (
            !Array.isArray(coordinates) ||
            coordinates.length !== 2
        ) {

            return res.status(200).json({

                success: true,

                habitationId:
                    habitation.habitationId,

                habitationName:
                    habitation.name,

                population,

                recommendations: [],

                message:
                    "Habitation does not have valid coordinates"

            });

        }


        const habitationLng =
            Number(coordinates[0]);

        const habitationLat =
            Number(coordinates[1]);


        if (
            !Number.isFinite(habitationLng) ||
            !Number.isFinite(habitationLat)
        ) {

            return res.status(200).json({

                success: true,

                habitationId:
                    habitation.habitationId,

                habitationName:
                    habitation.name,

                population,

                recommendations: [],

                message:
                    "Habitation coordinates are invalid"

            });

        }


        // --------------------------------------------------------
        // Find ACTIVE relocation sites
        // with enough available capacity
        // --------------------------------------------------------

        const sites =
            await RelocationSite.find({

                status: "ACTIVE",

                "capacity.available": {
                    $gte: population
                }

            })
                .lean();


        const recommendations = [];


        for (const site of sites) {

            const siteCoordinates =
                site.location?.coordinates;


            if (
                !Array.isArray(siteCoordinates) ||
                siteCoordinates.length !== 2
            ) {
                continue;
            }


            const siteLng =
                Number(siteCoordinates[0]);

            const siteLat =
                Number(siteCoordinates[1]);


            if (
                !Number.isFinite(siteLng) ||
                !Number.isFinite(siteLat)
            ) {
                continue;
            }


            // ----------------------------------------------------
            // Calculate actual geographical distance
            // ----------------------------------------------------

            const distanceKm =
                calculateDistance(
                    habitationLat,
                    habitationLng,
                    siteLat,
                    siteLng
                );


            // ----------------------------------------------------
            // Ignore extremely distant sites
            // ----------------------------------------------------

            if (
                distanceKm >
                MAX_RELOCATION_DISTANCE_KM
            ) {
                continue;
            }


            const availableCapacity =
                getAvailableCapacity(site);


            if (
                availableCapacity <
                population
            ) {
                continue;
            }


            const suitabilityScore =
                normalizeSuitability(
                    site.suitabilityScore
                );


            // Do not recommend a site that is explicitly
            // below the minimum suitability threshold.
            if (
                suitabilityScore <
                MIN_SUITABILITY_SCORE
            ) {
                continue;
            }


            recommendations.push({

                siteId:
                    site.siteId,

                name:
                    site.name,

                location:
                    site.location,

                distanceKm:
                    Number(
                        distanceKm.toFixed(2)
                    ),

                suitabilityScore,

                capacity: {

                    total:
                        Number(
                            site.capacity?.total || 0
                        ),

                    occupied:
                        Number(
                            site.capacity?.occupied || 0
                        ),

                    available:
                        availableCapacity

                },

                canAccommodate:
                    true

            });

        }


        // --------------------------------------------------------
        // Sort:
        //
        // 1. nearest site
        // 2. higher suitability
        // 3. more available capacity
        // --------------------------------------------------------

        recommendations.sort(
            (a, b) => {

                if (
                    a.distanceKm !==
                    b.distanceKm
                ) {

                    return (
                        a.distanceKm -
                        b.distanceKm
                    );

                }


                if (
                    a.suitabilityScore !==
                    b.suitabilityScore
                ) {

                    return (
                        b.suitabilityScore -
                        a.suitabilityScore
                    );

                }


                return (
                    b.capacity.available -
                    a.capacity.available
                );

            }
        );


        // Return maximum 5 recommendations
        const topRecommendations =
            recommendations.slice(0, 5);


        if (
            topRecommendations.length === 0
        ) {

            return res.status(200).json({

                success: true,

                habitationId:
                    habitation.habitationId,

                habitationName:
                    habitation.name,

                population,

                recommendations: [],

                message:
                    "No suitable relocation site with sufficient capacity found nearby"

            });

        }


        const best =
            topRecommendations[0];


        const reasons = [

            "Adequate available capacity",

            "Within the configured relocation distance",

            "Suitable relocation site"

        ];


        return res.status(200).json({

            success: true,

            habitationId:
                habitation.habitationId,

            habitationName:
                habitation.name,

            population,

            recommendedSite:
                best,

            recommendations:
                topRecommendations,

            reasons

        });


    } catch (error) {

        console.error(
            "Recommended site error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to recommend relocation site"

        });

    }

};


// ============================================================
// 2. GET PRIORITY VILLAGES
// ============================================================

module.exports.getPriorityVillages = async (
    req,
    res
) => {

    try {

        const villages =
            await Habitation.find({

                relocationPriority: {
                    $in: [
                        "IMMEDIATE",
                        "SHORT_TERM",
                        "MEDIUM_TERM"
                    ]
                }

            })
                .sort({
                    riskScore: -1
                })
                .lean();


        return res.status(200).json({

            success: true,

            total:
                villages.length,

            villages

        });


    } catch (error) {

        console.error(
            "Relocation priority error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to load relocation priorities"

        });

    }

};


// ============================================================
// 3. GET ALL RELOCATION SITES
// ============================================================

module.exports.getAllSites = async (
    req,
    res
) => {

    try {

        const sites =
            await RelocationSite.find({})
                .sort({
                    suitabilityScore: -1
                })
                .lean();


        return res.status(200).json({

            success: true,

            count:
                sites.length,

            data:
                sites

        });


    } catch (error) {

        console.error(
            "Get all sites error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to load relocation sites"

        });

    }

};


// ============================================================
// 4. GET ACTIVE SAFE / RELOCATION SITES
// ============================================================

module.exports.getSafeSites = async (
    req,
    res
) => {

    try {

        const sites =
            await RelocationSite.find({

                status: "ACTIVE",

                "capacity.available": {
                    $gt: 0
                }

            })
                .sort({

                    suitabilityScore: -1,

                    "capacity.available": -1

                })
                .lean();


        return res.status(200).json({

            success: true,

            count:
                sites.length,

            sites

        });


    } catch (error) {

        console.error(
            "Safe sites error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to load safe sites"

        });

    }

};


// ============================================================
// 5. CREATE RELOCATION / SAFE SITE
// ============================================================

module.exports.createSite = async (
    req,
    res
) => {

    try {

        const {
            siteId,
            name,
            location,
            capacity,
            suitabilityScore
        } = req.body;


        // --------------------------------------------------------
        // Required fields
        // --------------------------------------------------------

        if (
            !siteId ||
            !name ||
            !location?.coordinates ||
            capacity?.total == null
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "siteId, name, location, and capacity.total are required"

            });

        }


        // --------------------------------------------------------
        // Validate coordinates
        //
        // GeoJSON:
        // [longitude, latitude]
        // --------------------------------------------------------

        if (
            !Array.isArray(
                location.coordinates
            ) ||
            location.coordinates.length !== 2
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Location coordinates must be [longitude, latitude]"

            });

        }


        const longitude =
            Number(
                location.coordinates[0]
            );

        const latitude =
            Number(
                location.coordinates[1]
            );


        if (
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180 ||
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid longitude or latitude"

            });

        }


        // --------------------------------------------------------
        // Validate capacity
        // --------------------------------------------------------

        const totalCapacity =
            Number(capacity.total);


        const occupiedCapacity =
            Number(
                capacity.occupied || 0
            );


        if (
            !Number.isFinite(totalCapacity) ||
            totalCapacity <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Total capacity must be greater than 0"

            });

        }


        if (
            !Number.isFinite(
                occupiedCapacity
            ) ||
            occupiedCapacity < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Occupied capacity is invalid"

            });

        }


        if (
            occupiedCapacity >
            totalCapacity
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Occupied capacity cannot exceed total capacity"

            });

        }


        const availableCapacity =
            totalCapacity -
            occupiedCapacity;


        // --------------------------------------------------------
        // Validate suitability
        // --------------------------------------------------------

        let finalSuitability =
            Number(
                suitabilityScore
            );


        if (
            !Number.isFinite(
                finalSuitability
            )
        ) {

            finalSuitability = 70;

        }


        finalSuitability =
            Math.max(
                0,
                Math.min(
                    100,
                    finalSuitability
                )
            );


        // --------------------------------------------------------
        // Check duplicate site
        // --------------------------------------------------------

        const existing =
            await RelocationSite.findOne({
                siteId
            });


        if (existing) {

            return res.status(409).json({

                success: false,

                message:
                    "A site with this ID already exists"

            });

        }


        // --------------------------------------------------------
        // Determine initial status
        // --------------------------------------------------------

        const status =
            availableCapacity <= 0
                ? "FULL"
                : "ACTIVE";


        // --------------------------------------------------------
        // Create site
        // --------------------------------------------------------

        const site =
            await RelocationSite.create({

                siteId,

                name,

                location: {

                    type: "Point",

                    coordinates: [
                        longitude,
                        latitude
                    ]

                },

                capacity: {

                    total:
                        totalCapacity,

                    occupied:
                        occupiedCapacity,

                    available:
                        availableCapacity

                },

                suitabilityScore:
                    finalSuitability,

                status

            });


        return res.status(201).json({

            success: true,

            message:
                "Relocation site created successfully",

            site

        });


    } catch (error) {

        console.error(
            "Create site error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to create relocation site"

        });

    }

};


// ============================================================
// 6. FIND NEARBY RELOCATION SITES
// ============================================================

module.exports.findNearbyRelocationSites =
    async (
        req,
        res
    ) => {

        try {

            const {
                latitude,
                longitude,
                population = 0,
                limit = 5
            } = req.query;


            // ----------------------------------------------------
            // Validate coordinates
            // ----------------------------------------------------

            if (
                latitude === undefined ||
                longitude === undefined
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Latitude and longitude are required"

                });

            }


            const lat =
                Number(latitude);

            const lng =
                Number(longitude);

            const requiredPopulation =
                Number(population);

            const requestedLimit =
                Number(limit);


            if (
                !Number.isFinite(lat) ||
                lat < -90 ||
                lat > 90 ||
                !Number.isFinite(lng) ||
                lng < -180 ||
                lng > 180
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid latitude or longitude"

                });

            }


            if (
                !Number.isFinite(
                    requiredPopulation
                ) ||
                requiredPopulation < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid population"

                });

            }


            const resultLimit =
                Number.isInteger(
                    requestedLimit
                ) &&
                requestedLimit > 0

                    ? Math.min(
                        requestedLimit,
                        20
                    )

                    : 5;


            // ----------------------------------------------------
            // Only active sites with available capacity
            // ----------------------------------------------------

            const sites =
                await RelocationSite.find({

                    status: "ACTIVE",

                    "capacity.available": {
                        $gt: 0
                    },

                    "location.coordinates": {
                        $exists: true
                    }

                })
                    .lean();


            console.log(
                `Active relocation sites found in DB: ${sites.length}`
            );


            const results = [];


            // ----------------------------------------------------
            // Evaluate every site
            // ----------------------------------------------------

            for (
                const site of sites
            ) {

                const coordinates =
                    site.location?.coordinates;


                if (
                    !Array.isArray(
                        coordinates
                    ) ||
                    coordinates.length !== 2
                ) {

                    console.log(
                        `Skipping ${site.name}: invalid coordinates`
                    );

                    continue;

                }


                // GeoJSON:
                // [longitude, latitude]

                const siteLng =
                    Number(
                        coordinates[0]
                    );

                const siteLat =
                    Number(
                        coordinates[1]
                    );


                if (
                    !Number.isFinite(
                        siteLng
                    ) ||
                    !Number.isFinite(
                        siteLat
                    ) ||
                    siteLng < -180 ||
                    siteLng > 180 ||
                    siteLat < -90 ||
                    siteLat > 90
                ) {

                    console.log(
                        `Skipping ${site.name}: invalid coordinate values`
                    );

                    continue;

                }


                // ------------------------------------------------
                // Distance
                // ------------------------------------------------

                const distanceKm =
                    calculateDistance(

                        lat,
                        lng,

                        siteLat,
                        siteLng

                    );


                // ------------------------------------------------
                // Maximum relocation distance
                // ------------------------------------------------

                if (
                    distanceKm >
                    MAX_RELOCATION_DISTANCE_KM
                ) {

                    console.log(

                        `Skipping ${site.name}: ` +
                        `${distanceKm.toFixed(2)} km away`

                    );

                    continue;

                }


                // ------------------------------------------------
                // Capacity
                // ------------------------------------------------

                const totalCapacity =
                    Math.max(

                        0,

                        Number(
                            site.capacity?.total ||
                            0
                        )

                    );


                const occupiedCapacity =
                    Math.max(

                        0,

                        Number(
                            site.capacity?.occupied ||
                            0
                        )

                    );


                const availableCapacity =
                    getAvailableCapacity(
                        site
                    );


                // ------------------------------------------------
                // Hard capacity constraint
                // ------------------------------------------------

                if (
                    availableCapacity <
                    requiredPopulation
                ) {

                    console.log(

                        `Skipping ${site.name}: ` +

                        `available=${availableCapacity}, ` +

                        `required=${requiredPopulation}`

                    );

                    continue;

                }


                // ------------------------------------------------
                // Suitability
                // ------------------------------------------------

                const suitabilityScore =
                    normalizeSuitability(
                        site.suitabilityScore
                    );


                if (
                    suitabilityScore <
                    MIN_SUITABILITY_SCORE
                ) {

                    console.log(

                        `Skipping ${site.name}: ` +

                        `suitability=${suitabilityScore}`

                    );

                    continue;

                }


                // ------------------------------------------------
                // Add eligible site
                // ------------------------------------------------

                results.push({

                    siteId:
                        site.siteId,

                    name:
                        site.name,

                    location: {

                        type:
                            site.location?.type ||
                            "Point",

                        coordinates: [

                            siteLng,

                            siteLat

                        ]

                    },

                    distanceKm:
                        Number(
                            distanceKm.toFixed(2)
                        ),

                    suitabilityScore,

                    capacity: {

                        total:
                            totalCapacity,

                        occupied:
                            occupiedCapacity,

                        available:
                            availableCapacity

                    },

                    availableCapacity,

                    canAccommodate:
                        true

                });

            }


            // ----------------------------------------------------
            // SORT
            //
            // 1. Nearest site
            // 2. Suitability
            // 3. Available capacity
            // ----------------------------------------------------

            results.sort(
                (a, b) => {

                    if (
                        a.distanceKm !==
                        b.distanceKm
                    ) {

                        return (
                            a.distanceKm -
                            b.distanceKm
                        );

                    }


                    if (
                        a.suitabilityScore !==
                        b.suitabilityScore
                    ) {

                        return (
                            b.suitabilityScore -
                            a.suitabilityScore
                        );

                    }


                    return (
                        b.availableCapacity -
                        a.availableCapacity
                    );

                }
            );


            const finalResults =
                results.slice(
                    0,
                    resultLimit
                );


            return res.status(200).json({

                success: true,

                habitation: {

                    latitude:
                        lat,

                    longitude:
                        lng,

                    population:
                        requiredPopulation

                },

                count:
                    finalResults.length,

                sites:
                    finalResults

            });


        } catch (error) {

            console.error(
                "Find relocation sites error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to find relocation sites"

            });

        }

    };


// ============================================================
// HELPER: AVAILABLE CAPACITY
// ============================================================

function getAvailableCapacity(site) {

    const total =
        Math.max(
            0,
            Number(
                site.capacity?.total || 0
            )
        );


    const occupied =
        Math.max(
            0,
            Number(
                site.capacity?.occupied || 0
            )
        );


    const storedAvailable =
        Number(
            site.capacity?.available
        );


    // If stored available value is valid,
    // use it. Otherwise calculate it.
    if (
        Number.isFinite(
            storedAvailable
        )
    ) {

        return Math.max(
            0,
            Math.min(
                storedAvailable,
                total
            )
        );

    }


    return Math.max(
        0,
        total - occupied
    );

}


// ============================================================
// HELPER: SUITABILITY
// ============================================================

function normalizeSuitability(
    value
) {

    const score =
        Number(value);


    if (
        !Number.isFinite(score)
    ) {

        return 0;

    }


    return Math.max(
        0,
        Math.min(
            100,
            score
        )
    );

}


// ============================================================
// HAVERSINE DISTANCE
// ============================================================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;


    const dLat =
        (
            lat2 - lat1
        ) *
        Math.PI /
        180;


    const dLon =
        (
            lon2 - lon1
        ) *
        Math.PI /
        180;


    const a =

        Math.sin(
            dLat / 2
        ) ** 2

        +

        Math.cos(
            lat1 *
            Math.PI /
            180
        )

        *

        Math.cos(
            lat2 *
            Math.PI /
            180
        )

        *

        Math.sin(
            dLon / 2
        ) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;

}