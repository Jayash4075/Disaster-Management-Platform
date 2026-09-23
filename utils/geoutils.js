const proj4 = require("proj4");

// ============================================================
// EPSG:7755
// WGS 84 / India NSF LCC
// Dataset coordinates are projected coordinates in meters.
// We convert them to normal WGS84 longitude/latitude.
// ============================================================

const EPSG_7755 =
    "+proj=lcc " +
    "+lat_0=24 " +
    "+lon_0=80 " +
    "+lat_1=12.472955 " +
    "+lat_2=35.1728044444444 " +
    "+x_0=4000000 " +
    "+y_0=4000000 " +
    "+datum=WGS84 " +
    "+units=m " +
    "+no_defs " +
    "+type=crs";

const EPSG_4326 = "EPSG:4326";

// ============================================================
// Convert EPSG:7755 -> WGS84
// ============================================================

function projectedToWgs84(x, y) {
    const numericX = Number(x);
    const numericY = Number(y);

    if (
        !Number.isFinite(numericX) ||
        !Number.isFinite(numericY)
    ) {
        return null;
    }

    try {
        const result = proj4(
            EPSG_7755,
            EPSG_4326,
            [numericX, numericY]
        );

        const longitude = Number(result[0]);
        const latitude = Number(result[1]);

        if (
            !Number.isFinite(longitude) ||
            !Number.isFinite(latitude)
        ) {
            return null;
        }

        return {
            latitude,
            longitude
        };
    } catch (error) {
        console.error(
            "Coordinate conversion failed:",
            error.message
        );

        return null;
    }
}

// ============================================================
// Extract every [x,y] coordinate from any GeoJSON geometry
// ============================================================

function collectCoordinates(coordinates, output = []) {
    if (!Array.isArray(coordinates)) {
        return output;
    }

    // [x, y]
    if (
        coordinates.length >= 2 &&
        typeof coordinates[0] === "number" &&
        typeof coordinates[1] === "number"
    ) {
        output.push([
            Number(coordinates[0]),
            Number(coordinates[1])
        ]);

        return output;
    }

    for (const child of coordinates) {
        collectCoordinates(child, output);
    }

    return output;
}

// ============================================================
// Get representative point from GeoJSON geometry
//
// For village polygons we calculate the average of all
// geometry vertices. This gives us a stable point for the
// Leaflet marker / MongoDB Point.
// ============================================================

function getRepresentativePoint(geometry) {
    if (!geometry || !geometry.coordinates) {
        return null;
    }

    const coordinates = collectCoordinates(
        geometry.coordinates
    );

    if (!coordinates.length) {
        return null;
    }

    let totalX = 0;
    let totalY = 0;

    for (const [x, y] of coordinates) {
        totalX += x;
        totalY += y;
    }

    const averageX =
        totalX / coordinates.length;

    const averageY =
        totalY / coordinates.length;

    return projectedToWgs84(
        averageX,
        averageY
    );
}

// ============================================================
// Extract coordinates from a village object
//
// Supports:
// latitude / longitude
// lat / lng
// geometry
// location.coordinates
// ============================================================

function extractVillageCoordinates(village) {
    if (!village) {
        return null;
    }

    // --------------------------------------------------------
    // Already converted coordinates
    // --------------------------------------------------------

    const latitudeCandidates = [
        village.latitude,
        village.lat,
        village.location?.latitude,
        village.location?.lat
    ];

    const longitudeCandidates = [
        village.longitude,
        village.lng,
        village.lon,
        village.location?.longitude,
        village.location?.lng
    ];

    const latitude = latitudeCandidates.find(
        value => Number.isFinite(Number(value))
    );

    const longitude = longitudeCandidates.find(
        value => Number.isFinite(Number(value))
    );

    if (
        latitude !== undefined &&
        longitude !== undefined
    ) {
        return {
            latitude: Number(latitude),
            longitude: Number(longitude)
        };
    }

    // --------------------------------------------------------
    // GeoJSON geometry
    // --------------------------------------------------------

    if (village.geometry) {
        return getRepresentativePoint(
            village.geometry
        );
    }

    // --------------------------------------------------------
    // GeoJSON feature
    // --------------------------------------------------------

    if (village.type === "Feature" && village.geometry) {
        return getRepresentativePoint(
            village.geometry
        );
    }

    return null;
}

// ============================================================
// Create MongoDB GeoJSON Point
// Mongo expects [longitude, latitude]
// ============================================================

function createGeoJsonPoint(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {
        return null;
    }

    return {
        type: "Point",
        coordinates: [lng, lat]
    };
}

module.exports = {
    projectedToWgs84,
    collectCoordinates,
    getRepresentativePoint,
    extractVillageCoordinates,
    createGeoJsonPoint
};