const Habitation = require("../models/Habitation");
const RelocationSite = require("../models/RelocationSite");

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

        const sites = await RelocationSite.find({
            "capacity.available": {
                $gte: habitation.population || 0
            }
        })
            .sort({
                suitabilityScore: -1
            })
            .lean();


        if (sites.length === 0) {
            return res.status(200).json({
                success: true,
                habitationId: habitation.habitationId,
                habitationName: habitation.name,
                recommendations: [],
                message:
                    "No relocation site with sufficient capacity found"
            });
        }

        const best = sites[0];
        const reasons = [];
        if (
            best.capacity &&
            best.capacity.available >=
                (habitation.population || 0)
        ) {
            reasons.push(
                "Adequate available capacity"
            );
        }
        if (
            typeof best.suitabilityScore === "number"
        ) {
            reasons.push(
                "High suitability score"
            );
        }


        return res.status(200).json({

            success: true,
            habitationId: habitation.habitationId,

            habitationName: habitation.name,

            population: habitation.population || 0,

            recommendedSite: {
                siteId: best.siteId,

                name: best.name,

                location: best.location,

                suitabilityScore: best.suitabilityScore || 0,

                capacity: {
                    total: best.capacity?.total || 0,

                    occupied: best.capacity?.occupied || 0,

                    available: best.capacity?.available || 0
                }
            },

            reasons
        });


    } catch (error) {
        console.error(
            "Recommended site error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to recommend relocation site"
        });
    }
};

module.exports.getPriorityVillages = async (req, res) => {
    try {
        const villages = await Habitation.find({
            relocationPriority: { $in: ["IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM"] }
        }).sort({ riskScore: -1 }).lean();

        return res.status(200).json({
            success: true,
            total: villages.length,
            villages // FIXED typo
        });
    } catch (error) {
        console.error("Relocation priority error:", error);
        return res.status(500).json({ success: false, message: "Failed to load relocation priorities" });
    }
};

module.exports.getAllSites = async (req, res) => {
    try {
        const sites = await RelocationSite.find({}).lean();
        res.status(200).json({ success: true, data: sites });
    } catch (error) {
        console.error("Get all sites error:", error);
        res.status(500).json({ success: false, message: "Failed to load relocation sites" });
    }
};

module.exports.getSafeSites = async (req, res) => {
    try {
        const sites = await RelocationSite.find({
            "capacity.available": {
                $gt: 0
            }
        })
        .sort({
            suitabilityScore: -1
        })
        .lean();

        return res.status(200).json({
            success: true,
            count: sites.length,
            sites
        });

    } catch (error) {
        console.error(
            "Safe sites error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load safe sites"
        });
    }
};

// relocationController.js — add alongside getAllSites
module.exports.createSite = async (req, res) => {
    try {
        const { siteId, name, location, capacity, suitabilityScore } = req.body;
        if (!siteId || !name || !location?.coordinates || capacity?.total == null) {
            return res.status(400).json({ success: false, message: "siteId, name, location, and capacity.total are required" });
        }
        const existing = await RelocationSite.findOne({ siteId });
        if (existing) {
            return res.status(409).json({ success: false, message: "A site with this ID already exists" });
        }
        const site = await RelocationSite.create({
            siteId, name,
            location: { type: "Point", coordinates: location.coordinates },
            capacity: {
                total: capacity.total,
                occupied: capacity.occupied || 0,
                available: capacity.total - (capacity.occupied || 0)
            },
            suitabilityScore: suitabilityScore || 70
        });
        res.status(201).json({ success: true, site });
    } catch (error) {
        console.error("Create site error:", error);
        res.status(500).json({ success: false, message: "Failed to create site" });
    }
};

exports.findNearbyRelocationSites = async (req, res) => {
    try {
        const {
            latitude,
            longitude,
            population = 0,
            limit = 5
        } = req.query;

        // Validate required query parameters
        if (
            latitude === undefined ||
            longitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required"
            });
        }

        const lat = Number(latitude);
        const lng = Number(longitude);
        const requiredPopulation = Number(population);
        const requestedLimit = Number(limit);

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
                message: "Invalid latitude or longitude"
            });
        }

        if (
            !Number.isFinite(requiredPopulation) ||
            requiredPopulation < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid population"
            });
        }

        const resultLimit =
            Number.isInteger(requestedLimit) &&
            requestedLimit > 0
                ? Math.min(requestedLimit, 20)
                : 5;

        // Fetch relocation sites with coordinates
        const sites = await RelocationSite.find({
            "location.coordinates": {
                $exists: true
            }
        }).lean();

        console.log(
            `Relocation sites found in DB: ${sites.length}`
        );

        const results = [];

        for (const site of sites) {
            const coordinates = site.location?.coordinates;

            // Expected GeoJSON order: [longitude, latitude]
            if (
                !Array.isArray(coordinates) ||
                coordinates.length !== 2
            ) {
                console.log(
                    `Skipping ${site.name}: invalid coordinates`
                );
                continue;
            }

            const siteLng = Number(coordinates[0]);
            const siteLat = Number(coordinates[1]);

            if (
                !Number.isFinite(siteLng) ||
                !Number.isFinite(siteLat) ||
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

            // Calculate distance in kilometres
            const distanceKm = calculateDistance(
                lat,
                lng,
                siteLat,
                siteLng
            );

            // Read capacity from the nested capacity object
            const totalCapacity = Math.max(
                0,
                Number(site.capacity?.total || 0)
            );

            const occupiedCapacity = Math.max(
                0,
                Number(site.capacity?.occupied || 0)
            );

            const storedAvailable = site.capacity?.available;

            const availableCapacity =
                storedAvailable !== undefined &&
                storedAvailable !== null &&
                Number.isFinite(Number(storedAvailable))
                    ? Math.max(0, Number(storedAvailable))
                    : Math.max(
                        totalCapacity - occupiedCapacity,
                        0
                    );

            // Exclude sites that cannot accommodate this population
            const canAccommodate =
                availableCapacity >= requiredPopulation;

            if (!canAccommodate) {
                continue;
            }

            // Start with the site's existing suitability score
            let suitabilityScore = Number(
                site.suitabilityScore ?? 0
            );

            if (!Number.isFinite(suitabilityScore)) {
                suitabilityScore = 0;
            }

            // Distance penalty
            if (distanceKm > 20) {
                suitabilityScore -= 30;
            } else if (distanceKm > 10) {
                suitabilityScore -= 20;
            } else if (distanceKm > 5) {
                suitabilityScore -= 10;
            }

            // Capacity bonus
            suitabilityScore += 10;

            suitabilityScore = Math.max(
                0,
                Math.min(100, suitabilityScore)
            );

            console.log(
                `Site: ${site.name} | ` +
                `Distance: ${distanceKm.toFixed(2)} km | ` +
                `Available: ${availableCapacity} | ` +
                `Required: ${requiredPopulation} | ` +
                `Eligible: ${canAccommodate}`
            );

            // Return a predictable, frontend-friendly object
            results.push({
                siteId: site.siteId,
                name: site.name,

                location: {
                    type: site.location?.type || "Point",
                    coordinates: [
                        siteLng,
                        siteLat
                    ]
                },

                distanceKm: Number(
                    distanceKm.toFixed(2)
                ),

                suitabilityScore,

                capacity: {
                    total: totalCapacity,
                    occupied: occupiedCapacity,
                    available: availableCapacity
                },

                availableCapacity,
                canAccommodate
            });
        }

        // Higher suitability first; nearer site breaks ties
        results.sort((a, b) => {
            if (
                b.suitabilityScore !==
                a.suitabilityScore
            ) {
                return (
                    b.suitabilityScore -
                    a.suitabilityScore
                );
            }

            return a.distanceKm - b.distanceKm;
        });

        const finalResults = results.slice(
            0,
            resultLimit
        );

        return res.status(200).json({
            success: true,

            habitation: {
                latitude: lat,
                longitude: lng,
                population: requiredPopulation
            },

            count: finalResults.length,
            sites: finalResults
        });

    } catch (error) {
        console.error(
            "Find relocation sites error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to find relocation sites"
        });
    }
};


// Haversine distance in kilometres
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat =
        (lat2 - lat1) * Math.PI / 180;

    const dLon =
        (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}


// Haversine distance
function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) * Math.PI / 180;

    const dLon =
        (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}