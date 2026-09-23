const Habitation = require("../models/Habitation");
const Shelter = require("../models/shelter");
const RelocationSite = require("../models/RelocationSite");

// ============================================================
// CONFIG
// ============================================================

const HABITATION_RADIUS_METERS = 50000;   // 50 km
const HOSPITAL_SHELTER_RADIUS_METERS = 20000; // 20 km
const RELOCATION_RADIUS_METERS = 50000;   // 50 km
const RELOCATION_CANDIDATES = 5;

// ============================================================
// HAVERSINE DISTANCE (km) — used for display, since plain
// find() + $near does not return distance the way aggregate
// $geoNear does.
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

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

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
                $geometry: { type: "Point", coordinates: [lng, lat] },
                $maxDistance: HABITATION_RADIUS_METERS
            }
        }
    });

    // Fallback: no assessed habitation within radius — try the
    // closest assessed one regardless of distance, so citizens
    // in sparsely-covered areas still get *something* rather
    // than nothing.
    if (!habitation) {
        habitation = await Habitation.findOne({
            assessmentStatus: "ASSESSED",
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [lng, lat] }
                }
            }
        });
    }

    return habitation;
}

// ============================================================
// NEARBY SHELTERS / HOSPITALS
// ============================================================

async function getNearbyFacilities(lat, lng, type) {

    const docs = await Shelter.find({
        type,
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: [lng, lat] },
                $maxDistance: HOSPITAL_SHELTER_RADIUS_METERS
            }
        }
    }).limit(20);

    return docs.map((doc) => {

        const [docLng, docLat] = doc.location?.coordinates || [];

        return {
            id: doc._id,
            name: doc.name,
            type: doc.type,
            address: doc.address,
            contact: doc.contact,
            capacity: doc.capacity,
            currentOccupancy: doc.currentOccupancy,
            facilities: doc.facilities,
            latitude: docLat,
            longitude: docLng,
            distance:
                docLat !== undefined && docLng !== undefined
                    ? Number(distanceKm(lat, lng, docLat, docLng).toFixed(1))
                    : null
        };

    });
}

// ============================================================
// RELOCATION SITE RECOMMENDATION
// ============================================================

async function getRelocationCandidates(lat, lng) {

    const sites = await RelocationSite.find({
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: [lng, lat] },
                $maxDistance: RELOCATION_RADIUS_METERS
            }
        },
        "capacity.available": { $gt: 0 }
    }).limit(RELOCATION_CANDIDATES);

    const withDistance = sites.map((site) => {

        const [siteLng, siteLat] = site.location?.coordinates || [];

        return {
            id: site._id,
            siteId: site.siteId,
            name: site.name,
            capacity: site.capacity,
            suitabilityScore: site.suitabilityScore,
            latitude: siteLat,
            longitude: siteLng,
            distance:
                siteLat !== undefined && siteLng !== undefined
                    ? Number(distanceKm(lat, lng, siteLat, siteLng).toFixed(1))
                    : null
        };

    });

    // Prefer higher suitability, then shorter distance.
    withDistance.sort((a, b) => {
        const scoreA = a.suitabilityScore ?? 0;
        const scoreB = b.suitabilityScore ?? 0;

        if (scoreB !== scoreA) return scoreB - scoreA;

        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    });

    return withDistance;
}

// ============================================================
// HAZARD ZONES (from nearest habitation's hazard breakdown)
// ============================================================

function buildHazardZones(habitation) {

    if (!habitation || !habitation.hazards) return [];

    const { flood, landslide, erosion, cloudburst } = habitation.hazards;

    return Object.entries({ flood, landslide, erosion, cloudburst })
        .filter(([, score]) => score !== null && score !== undefined)
        .map(([type, score]) => ({
            type,
            score,
            habitationName: habitation.name
        }));
}

// ============================================================
// MAIN SERVICE
// ============================================================

async function getCitizenDashboard(lat, lng) {

    const [habitation, hospitals, shelters, relocationCandidates] =
        await Promise.all([
            getNearestHabitation(lat, lng),
            getNearbyFacilities(lat, lng, "hospital"),
            getNearbyFacilities(lat, lng, "shelter"),
            getRelocationCandidates(lat, lng)
        ]);

    // --------------------------------------------------------
    // RISK / SAFETY STATUS
    // --------------------------------------------------------

    const disasterRisk = habitation
        ? {
            success: true,
            risk: habitation.riskLevel,
            probability:
                habitation.riskProbability ??
                (habitation.riskScore
                    ? habitation.riskScore / 100
                    : null)
        }
        : {
            success: false,
            message:
                "No assessed village found near your location yet."
        };

    const vulnerableHabitations = habitation
        ? [
            {
                id: habitation._id,
                name: habitation.name,
                population: habitation.population,
                riskLevel: habitation.riskLevel,
                riskScore: habitation.riskScore,
                relocationPriority: habitation.relocationPriority,
                vulnerabilityScore: habitation.vulnerabilityScore
            }
        ]
        : [];

    // --------------------------------------------------------
    // RELOCATION
    // --------------------------------------------------------

    const relocationRecommendation =
        relocationCandidates.length > 0
            ? relocationCandidates[0]
            : null;

    return {
        success: true,

        riskLevel: habitation?.riskLevel || "Unknown",
        disasterRisk,

        activeAlerts: 0,
        alerts: [],
        // NOTE: no alert/riskzone source wired in yet — this stays
        // empty until an alerts model/endpoint is connected here.

        nearbyHospitals: hospitals.length,
        hospitals,

        nearbyShelters: shelters.length,
        shelters,

        hazardZones: buildHazardZones(habitation),
        vulnerableHabitations,

        relocationSites: relocationCandidates,
        relocationRecommendation,

        weather: null,
        features: null
    };
}

module.exports = { getCitizenDashboard };