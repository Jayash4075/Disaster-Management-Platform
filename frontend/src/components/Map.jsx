import { useEffect, useMemo, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "./Map.css";


/* =========================================================
   CURRENT LOCATION ICON
   ========================================================= */

const currentLocationIcon = L.divIcon({
    className: "current-location-icon-wrapper",
    html: `
        <div class="current-location-icon">
            <div class="current-location-pulse"></div>
            <div class="current-location-dot"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
});


/* =========================================================
   RELOCATION SITE ICON
   ========================================================= */

const relocationSiteIcon = L.divIcon({
    className: "relocation-site-icon-wrapper",
    html: `
        <div
            style="
                width: 34px;
                height: 34px;
                border-radius: 50%;
                background: #2563eb;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 17px;
                font-weight: bold;
            "
        >
            🏠
        </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
});


/* =========================================================
   MAP RECENTER COMPONENT
   ========================================================= */

function RecenterMap({ location }) {

    const map = useMap();

    useEffect(() => {

        if (!location) return;

        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return;
        }

        map.flyTo(
            [latitude, longitude],
            14,
            {
                animate: true,
                duration: 1.2,
            }
        );

    }, [location, map]);

    return null;
}


/* =========================================================
   MAP COMPONENT
   ========================================================= */

export default function Map({
    riskZones = [],
    sosRequests = [],
    rescueTeams = [],
    hospitals = [],
    shelters = [],
    resources = [],

    /*
       Relocation sites returned by AuthorityDashboard
       after calling:

       GET /api/relocation/find-nearby
    */
    relocationSites = [],

    /*
       Controls whether relocation sites should
       currently be displayed on the map.
    */
    showRelocationSites = false,

    /*
       Callback used by the risk-zone popup.

       Parent component can pass:

       onFindRelocationSites={(habitation) => {
           // call relocation API
       }}
    */
    onFindRelocationSites = null,
}) {


    /* -----------------------------------------------------
       USER LOCATION
       ----------------------------------------------------- */

    const [userLocation, setUserLocation] = useState(null);

    const [locationStatus, setLocationStatus] = useState(
        "requesting"
    );

    const [locationError, setLocationError] = useState("");

    const [locationAccuracy, setLocationAccuracy] = useState(null);


    /* =====================================================
       GET ACTUAL USER LOCATION
       ===================================================== */

    useEffect(() => {

        if (!navigator.geolocation) {

            setLocationStatus("error");

            setLocationError(
                "Geolocation is not supported by this browser."
            );

            return;
        }

        setLocationStatus("requesting");

        const watchId = navigator.geolocation.watchPosition(

            (position) => {

                const {
                    latitude,
                    longitude,
                    accuracy,
                } = position.coords;

                const actualLocation = {
                    latitude,
                    longitude,
                };

                console.log(
                    "Actual user location:",
                    actualLocation
                );

                setUserLocation(actualLocation);

                setLocationAccuracy(accuracy);

                setLocationStatus("success");

                setLocationError("");
            },

            (error) => {

                console.error(
                    "Geolocation error:",
                    error
                );

                setLocationStatus("error");

                switch (error.code) {

                    case error.PERMISSION_DENIED:

                        setLocationError(
                            "Location permission was denied. Please allow location access for this website."
                        );

                        break;

                    case error.POSITION_UNAVAILABLE:

                        setLocationError(
                            "Your current location is unavailable."
                        );

                        break;

                    case error.TIMEOUT:

                        setLocationError(
                            "Location request timed out. Trying again..."
                        );

                        break;

                    default:

                        setLocationError(
                            "Unable to determine your current location."
                        );
                }
            },

            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 20000,
            }
        );


        /* -------------------------------------------------
           CLEANUP
           ------------------------------------------------- */

        return () => {

            navigator.geolocation.clearWatch(
                watchId
            );

        };

    }, []);


    /* =====================================================
       MAP CENTER
       ===================================================== */

    const initialCenter = useMemo(
        () => [20.5937, 78.9629],
        []
    );


    /* =====================================================
       VALIDATE BACKEND DATA
       ===================================================== */

    const validRiskZones = Array.isArray(riskZones)
        ? riskZones
        : [];

    const validSOSRequests = Array.isArray(sosRequests)
        ? sosRequests
        : [];

    const validRescueTeams = Array.isArray(rescueTeams)
        ? rescueTeams
        : [];

    const validHospitals = Array.isArray(hospitals)
        ? hospitals
        : [];

    const validShelters = Array.isArray(shelters)
        ? shelters
        : [];

    const validResources = Array.isArray(resources)
        ? resources
        : [];

    const validRelocationSites =
        Array.isArray(relocationSites)
            ? relocationSites
            : [];


    /* =====================================================
       HELPER — SAFE COORDINATES
       ===================================================== */

    const getCoordinates = (item) => {

        if (!item) return null;


        /*
           Example 1:

           {
               latitude: 25.4358,
               longitude: 81.8463
           }
        */

        if (
            Number.isFinite(Number(item.latitude)) &&
            Number.isFinite(Number(item.longitude))
        ) {

            return [
                Number(item.latitude),
                Number(item.longitude),
            ];
        }


        /*
           Example 2:

           {
               lat: 25.4358,
               lng: 81.8463
           }
        */

        if (
            Number.isFinite(Number(item.lat)) &&
            Number.isFinite(Number(item.lng))
        ) {

            return [
                Number(item.lat),
                Number(item.lng),
            ];
        }


        /*
           Example 3:

           {
               location: {
                   coordinates: [81.8463, 25.4358]
               }
           }

           GeoJSON:
           [longitude, latitude]
        */

        if (
            item.location &&
            Array.isArray(item.location.coordinates) &&
            item.location.coordinates.length >= 2
        ) {

            const longitude =
                Number(item.location.coordinates[0]);

            const latitude =
                Number(item.location.coordinates[1]);

            if (
                Number.isFinite(latitude) &&
                Number.isFinite(longitude)
            ) {

                return [
                    latitude,
                    longitude,
                ];
            }
        }


        /*
           Example 4:

           {
               location: {
                   latitude: 25.4358,
                   longitude: 81.8463
               }
           }
        */

        if (
            item.location &&
            Number.isFinite(
                Number(item.location.latitude)
            ) &&
            Number.isFinite(
                Number(item.location.longitude)
            )
        ) {

            return [
                Number(item.location.latitude),
                Number(item.location.longitude),
            ];
        }


        /*
           Example 5:

           GeoJSON Feature

           {
               geometry: {
                   type: "Point",
                   coordinates: [81.8463, 25.4358]
               }
           }
        */

        if (
            item.geometry &&
            Array.isArray(item.geometry.coordinates) &&
            item.geometry.coordinates.length >= 2 &&
            item.geometry.type === "Point"
        ) {

            const longitude =
                Number(item.geometry.coordinates[0]);

            const latitude =
                Number(item.geometry.coordinates[1]);

            if (
                Number.isFinite(latitude) &&
                Number.isFinite(longitude)
            ) {

                return [
                    latitude,
                    longitude,
                ];
            }
        }


        return null;
    };


    /* =====================================================
       RISK ZONE COLOR
       ===================================================== */

    const getRiskColor = (risk) => {

        const value = String(
            risk || ""
        ).toLowerCase();


        /*
           RED / CRITICAL / HIGH
        */

        if (
            value.includes("high") ||
            value.includes("critical") ||
            value.includes("severe") ||
            value.includes("red")
        ) {

            return "#dc2626";
        }


        /*
           ORANGE / MEDIUM
        */

        if (
            value.includes("medium") ||
            value.includes("moderate") ||
            value.includes("orange")
        ) {

            return "#f59e0b";
        }


        /*
           YELLOW
        */

        if (
            value.includes("yellow")
        ) {

            return "#eab308";
        }


        /*
           GREEN / LOW
        */

        return "#16a34a";
    };


    /* =====================================================
       RELOCATION SITE SUITABILITY COLOR
       ===================================================== */

    const getSuitabilityColor = (score) => {

        const value = Number(score);

        if (!Number.isFinite(value)) {
            return "#2563eb";
        }

        if (value >= 80) {
            return "#16a34a";
        }

        if (value >= 60) {
            return "#f59e0b";
        }

        return "#dc2626";
    };


    /* =====================================================
       RENDER
       ===================================================== */

    return (

        <div className="terrashield-map-container">


            {/* =================================================
               MAP STATUS BAR
               ================================================= */}

            <div className="map-status-bar">

                <div className="map-status-left">

                    <span
                        className={`map-status-dot ${
                            locationStatus
                        }`}
                    ></span>

                    <span>

                        {locationStatus === "requesting" &&
                            "Getting your location..."}

                        {locationStatus === "success" &&
                            "Live location active"}

                        {locationStatus === "error" &&
                            "Location unavailable"}

                    </span>

                </div>


                {locationStatus === "success" &&
                    locationAccuracy && (

                    <span className="map-accuracy">

                        Accuracy:
                        {" "}
                        {Math.round(
                            locationAccuracy
                        )}
                        m

                    </span>

                )}

            </div>


            {/* =================================================
               LOCATION ERROR
               ================================================= */}

            {locationStatus === "error" && (

                <div className="map-location-error">

                    <div className="map-error-title">

                        Location access required

                    </div>

                    <div className="map-error-message">

                        {locationError}

                    </div>

                </div>

            )}


            {/* =================================================
               LEAFLET MAP
               ================================================= */}

            <MapContainer

                center={initialCenter}

                zoom={5}

                minZoom={3}

                maxZoom={19}

                scrollWheelZoom={true}

                className="terrashield-map"

            >


                {/* =============================================
                   MAP TILES
                   ============================================= */}

                <TileLayer

                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

                />


                {/* =============================================
                   RECENTER TO ACTUAL USER LOCATION
                   ============================================= */}

                <RecenterMap
                    location={userLocation}
                />


                {/* =============================================
                   ACTUAL USER LOCATION
                   ============================================= */}

                {userLocation && (

                    <>

                        <Marker

                            position={[
                                userLocation.latitude,
                                userLocation.longitude,
                            ]}

                            icon={currentLocationIcon}

                        >

                            <Popup>

                                <div className="location-popup">

                                    <strong>
                                        Your Current Location
                                    </strong>

                                    <span>
                                        Latitude:
                                        {" "}
                                        {userLocation.latitude.toFixed(
                                            6
                                        )}
                                    </span>

                                    <span>
                                        Longitude:
                                        {" "}
                                        {userLocation.longitude.toFixed(
                                            6
                                        )}
                                    </span>

                                </div>

                            </Popup>

                        </Marker>


                        {/* -------------------------------------
                           ACCURACY CIRCLE
                           ------------------------------------- */}

                        {locationAccuracy && (

                            <Circle

                                center={[
                                    userLocation.latitude,
                                    userLocation.longitude,
                                ]}

                                radius={
                                    locationAccuracy
                                }

                                pathOptions={{
                                    color: "#2563eb",
                                    fillColor: "#2563eb",
                                    fillOpacity: 0.08,
                                    weight: 1,
                                }}

                            />

                        )}

                    </>

                )}


                {/* =================================================
                   BACKEND RISK ZONES
                   ================================================= */}

                {validRiskZones.map(
                    (zone, index) => {

                        /*
                           Backend may return:

                           {
                               type: "Feature",
                               geometry: {...},
                               properties: {...}
                           }

                           OR a flattened object.

                           Support both.
                        */

                        const data =
                            zone?.properties || zone || {};


                        const coordinates =
                            getCoordinates(zone);


                        if (!coordinates) {
                            return null;
                        }


                        const risk =
                            data.riskLevel ||
                            data.risk ||
                            data.level ||
                            "UNKNOWN";


                        console.log(
                            "RISK ZONE DATA:",
                            data
                        );


                        return (

                            <Circle

                                key={
                                    zone?._id ||
                                    zone?.id ||
                                    data?._id ||
                                    data?.id ||
                                    `risk-${index}`
                                }

                                center={coordinates}

                                radius={
                                    Number(
                                        data.radius ||
                                        zone?.radius
                                    ) || 500
                                }

                                pathOptions={{
                                    color:
                                        getRiskColor(
                                            risk
                                        ),

                                    fillColor:
                                        getRiskColor(
                                            risk
                                        ),

                                    fillOpacity: 0.2,

                                    weight: 2,
                                }}

                            >

                                <Popup>

                                    <div
                                        className="map-popup"
                                        style={{
                                            minWidth: "280px",
                                            maxWidth: "340px",
                                            maxHeight: "500px",
                                            overflowY: "auto",
                                        }}
                                    >

                                        {/* =================================
                                           HABITATION HEADER
                                        ================================== */}

                                        <strong
                                            style={{
                                                fontSize: "17px",
                                                display: "block",
                                                marginBottom: "3px",
                                            }}
                                        >

                                            {
                                                data.name ||
                                                data.habitationName ||
                                                data.villageName ||
                                                "Risk Zone"
                                            }

                                        </strong>


                                        <span
                                            style={{
                                                display: "block",
                                                color: "#6b7280",
                                                marginBottom: "8px",
                                            }}
                                        >
                                            Habitation / Village
                                        </span>


                                        {/* =================================
                                           BASIC INFORMATION
                                        ================================== */}

                                        <span>
                                            <strong>
                                                Population:
                                            </strong>{" "}
                                            {
                                                data.population !==
                                                null &&
                                                data.population !==
                                                undefined
                                                    ? Number(
                                                        data.population
                                                    ).toLocaleString()
                                                    : "N/A"
                                            }
                                        </span>


                                        <span>
                                            <strong>
                                                Risk Score:
                                            </strong>{" "}
                                            {
                                                data.riskScore !==
                                                null &&
                                                data.riskScore !==
                                                undefined
                                                    ? Number(
                                                        data.riskScore
                                                    ).toFixed(1)
                                                    : "N/A"
                                            }
                                        </span>


                                        <span>
                                            <strong>
                                                Risk Level:
                                            </strong>{" "}
                                            {
                                                data.riskLevel ||
                                                "UNKNOWN"
                                            }
                                        </span>


                                        <span>
                                            <strong>
                                                Vulnerability:
                                            </strong>{" "}
                                            {
                                                data.vulnerabilityScore !==
                                                null &&
                                                data.vulnerabilityScore !==
                                                undefined
                                                    ? `${Number(
                                                        data.vulnerabilityScore
                                                    ).toFixed(1)}%`
                                                    : "N/A"
                                            }
                                        </span>


                                        <span>
                                            <strong>
                                                Relocation Priority:
                                            </strong>{" "}
                                            {
                                                data.relocationPriority ||
                                                "MONITOR"
                                            }
                                        </span>


                                        {/* =================================
                                           HAZARD SCORES
                                        ================================== */}

                                        <div
                                            style={{
                                                marginTop: "10px",
                                                paddingTop: "8px",
                                                borderTop:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >

                                            <strong>
                                                ⚠ Hazard Scores
                                            </strong>


                                            <span>
                                                Flood:{" "}
                                                {
                                                    data.hazards?.flood ??
                                                    "N/A"
                                                }
                                            </span>


                                            <span>
                                                Landslide:{" "}
                                                {
                                                    data.hazards?.landslide ??
                                                    "N/A"
                                                }
                                            </span>


                                            <span>
                                                Erosion:{" "}
                                                {
                                                    data.hazards?.erosion ??
                                                    "N/A"
                                                }
                                            </span>


                                            <span>
                                                Cloudburst:{" "}
                                                {
                                                    data.hazards?.cloudburst ??
                                                    "N/A"
                                                }
                                            </span>

                                        </div>


                                        {/* =================================
                                           CARRYING CAPACITY
                                        ================================== */}

                                        <div
                                            style={{
                                                marginTop: "10px",
                                                paddingTop: "8px",
                                                borderTop:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >

                                            <strong>
                                                🏠 Carrying Capacity
                                            </strong>


                                            <span>
                                                <strong>
                                                    Population:
                                                </strong>{" "}
                                                {
                                                    data.population !==
                                                    null &&
                                                    data.population !==
                                                    undefined
                                                        ? Number(
                                                            data.population
                                                        ).toLocaleString()
                                                        : "N/A"
                                                }
                                            </span>


                                            <span>
                                                <strong>
                                                    Safe Capacity:
                                                </strong>{" "}
                                                {
                                                    data.safeCapacity !==
                                                    null &&
                                                    data.safeCapacity !==
                                                    undefined
                                                        ? Number(
                                                            data.safeCapacity
                                                        ).toFixed(0)
                                                        : "N/A"
                                                }
                                            </span>


                                            <span>
                                                <strong>
                                                    Capacity Ratio:
                                                </strong>{" "}
                                                {
                                                    data.capacityRatio !==
                                                    null &&
                                                    data.capacityRatio !==
                                                    undefined
                                                        ? Number(
                                                            data.capacityRatio
                                                        ).toFixed(2)
                                                        : "N/A"
                                                }
                                            </span>


                                            <span>
                                                <strong>
                                                    Capacity Status:
                                                </strong>{" "}
                                                {
                                                    data.capacityStatus ||
                                                    "UNKNOWN"
                                                }
                                            </span>


                                            <span>
                                                <strong>
                                                    Shelter Capacity:
                                                </strong>{" "}
                                                {
                                                    data.shelterCapacity !==
                                                    null &&
                                                    data.shelterCapacity !==
                                                    undefined
                                                        ? Number(
                                                            data.shelterCapacity
                                                        ).toLocaleString()
                                                        : "N/A"
                                                }
                                            </span>


                                            <span>
                                                <strong>
                                                    Available Water:
                                                </strong>{" "}
                                                {
                                                    data.availableWater !==
                                                    null &&
                                                    data.availableWater !==
                                                    undefined
                                                        ? Number(
                                                            data.availableWater
                                                        ).toLocaleString()
                                                        : "N/A"
                                                }
                                            </span>


                                            <span>
                                                <strong>
                                                    Food Stock:
                                                </strong>{" "}
                                                {
                                                    data.foodStock !==
                                                    null &&
                                                    data.foodStock !==
                                                    undefined
                                                        ? Number(
                                                            data.foodStock
                                                        ).toLocaleString()
                                                        : "N/A"
                                                }
                                            </span>


                                            <span>
                                                <strong>
                                                    Medical Capacity:
                                                </strong>{" "}
                                                {
                                                    data.medicalCapacity !==
                                                    null &&
                                                    data.medicalCapacity !==
                                                    undefined
                                                        ? Number(
                                                            data.medicalCapacity
                                                        ).toLocaleString()
                                                        : "N/A"
                                                }
                                            </span>

                                        </div>


                                        {/* =================================
                                           ASSESSMENT INFORMATION
                                        ================================== */}

                                        <div
                                            style={{
                                                marginTop: "10px",
                                                paddingTop: "8px",
                                                borderTop:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >

                                            <strong>
                                                📋 Assessment
                                            </strong>


                                            <span>
                                                <strong>
                                                    Status:
                                                </strong>{" "}
                                                {
                                                    data.assessmentStatus ||
                                                    "UNKNOWN"
                                                }
                                            </span>


                                            {data.lastAssessment && (

                                                <span>
                                                    <strong>
                                                        Last Assessment:
                                                    </strong>{" "}
                                                    {
                                                        new Date(
                                                            data.lastAssessment
                                                        ).toLocaleDateString()
                                                    }
                                                </span>

                                            )}

                                        </div>


                                        {/* =================================
                                           FIND RELOCATION SITES
                                        ================================== */}

                                        <button

                                            type="button"

                                            onClick={() => {

                                                console.log(
                                                    "Finding relocation sites for:",
                                                    data
                                                );


                                                if (
                                                    typeof onFindRelocationSites ===
                                                    "function"
                                                ) {

                                                    onFindRelocationSites(
                                                        data
                                                    );

                                                } else {

                                                    console.warn(
                                                        "onFindRelocationSites callback is not connected yet."
                                                    );

                                                }

                                            }}

                                            style={{
                                                width: "100%",
                                                marginTop: "14px",
                                                padding: "10px 12px",
                                                border: "none",
                                                borderRadius: "7px",
                                                background:
                                                    "#2563eb",
                                                color: "#ffffff",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                fontSize: "13px",
                                            }}

                                        >

                                            📍 Find Relocation Sites

                                        </button>


                                    </div>

                                </Popup>

                            </Circle>

                        );

                    }
                )}


                {/* =================================================
                   RELOCATION SITES
                   ================================================= */}

                {showRelocationSites &&
                    validRelocationSites.map(
                        (site, index) => {

                            /*
                               Get coordinates from the relocation
                               site object.

                               Supports:
                               latitude / longitude
                               lat / lng
                               location.coordinates
                               location.latitude / longitude
                               GeoJSON geometry
                            */

                            const coordinates =
                                getCoordinates(site);


                            if (!coordinates) {

                                console.warn(
                                    "Relocation site has no valid coordinates:",
                                    site
                                );

                                return null;
                            }


                            const suitabilityScore =
                                site.suitabilityScore ??
                                site.score ??
                                site.suitability;


                            const suitabilityColor =
                                getSuitabilityColor(
                                    suitabilityScore
                                );


                            const availableCapacity =
                                site.availableCapacity ??
                                site.capacityAvailable ??
                                site.remainingCapacity;


                            const capacity =
                                site.capacity ??
                                site.shelterCapacity;


                            const capacityRatio =
                                site.capacityRatio;


                            const distanceKm =
                                site.distanceKm ??
                                site.distance;


                            const canAccommodate =
                                site.canAccommodate;


                            console.log(
                                "RELOCATION SITE:",
                                site
                            );


                            return (

                                <Marker

                                    key={
                                        site._id ||
                                        site.id ||
                                        `relocation-${index}`
                                    }

                                    position={
                                        coordinates
                                    }

                                    icon={
                                        relocationSiteIcon
                                    }

                                >

                                    <Popup>

                                        <div
                                            className="map-popup"
                                            style={{
                                                minWidth: "270px",
                                                maxWidth: "330px",
                                            }}
                                        >

                                            {/* =========================
                                               HEADER
                                            ========================== */}

                                            <strong
                                                style={{
                                                    display: "block",
                                                    fontSize: "17px",
                                                    marginBottom: "3px",
                                                }}
                                            >

                                                {
                                                    site.name ||
                                                    site.siteName ||
                                                    site.relocationSiteName ||
                                                    "Relocation Site"
                                                }

                                            </strong>


                                            <span
                                                style={{
                                                    display: "block",
                                                    color: "#6b7280",
                                                    marginBottom: "8px",
                                                }}
                                            >

                                                🏠 Recommended Relocation Site

                                            </span>


                                            {/* =========================
                                               SUITABILITY
                                            ========================== */}

                                            <div
                                                style={{
                                                    padding: "8px",
                                                    marginBottom: "10px",
                                                    borderRadius: "7px",
                                                    background:
                                                        `${suitabilityColor}15`,
                                                    border:
                                                        `1px solid ${suitabilityColor}40`,
                                                }}
                                            >

                                                <strong
                                                    style={{
                                                        color:
                                                            suitabilityColor,
                                                    }}
                                                >

                                                    Suitability Score

                                                </strong>


                                                <div
                                                    style={{
                                                        fontSize: "22px",
                                                        fontWeight: "700",
                                                        color:
                                                            suitabilityColor,
                                                        marginTop: "2px",
                                                    }}
                                                >

                                                    {
                                                        Number.isFinite(
                                                            Number(
                                                                suitabilityScore
                                                            )
                                                        )
                                                            ? `${Number(
                                                                suitabilityScore
                                                            ).toFixed(0)}/100`
                                                            : "N/A"
                                                    }

                                                </div>

                                            </div>


                                            {/* =========================
                                               DISTANCE
                                            ========================== */}

                                            <span>

                                                <strong>
                                                    Distance:
                                                </strong>{" "}

                                                {
                                                    distanceKm !==
                                                    undefined &&
                                                    distanceKm !==
                                                    null
                                                        ? `${Number(
                                                            distanceKm
                                                        ).toFixed(2)} km`
                                                        : "N/A"
                                                }

                                            </span>


                                            {/* =========================
                                               CAPACITY
                                            ========================== */}

                                            <div
                                                style={{
                                                    marginTop: "10px",
                                                    paddingTop: "8px",
                                                    borderTop:
                                                        "1px solid #e5e7eb",
                                                }}
                                            >

                                                <strong>
                                                    📊 Capacity
                                                </strong>


                                                <span>

                                                    <strong>
                                                        Total Capacity:
                                                    </strong>{" "}

                                                    {
                                                        capacity !==
                                                        undefined &&
                                                        capacity !==
                                                        null
                                                            ? Number(
                                                                capacity
                                                            ).toLocaleString()
                                                            : "N/A"
                                                    }

                                                </span>


                                                <span>

                                                    <strong>
                                                        Available Capacity:
                                                    </strong>{" "}

                                                    {
                                                        availableCapacity !==
                                                        undefined &&
                                                        availableCapacity !==
                                                        null
                                                            ? Number(
                                                                availableCapacity
                                                            ).toLocaleString()
                                                            : "N/A"
                                                    }

                                                </span>


                                                <span>

                                                    <strong>
                                                        Capacity Ratio:
                                                    </strong>{" "}

                                                    {
                                                        capacityRatio !==
                                                        undefined &&
                                                        capacityRatio !==
                                                        null
                                                            ? Number(
                                                                capacityRatio
                                                            ).toFixed(2)
                                                            : "N/A"
                                                    }

                                                </span>


                                                <span>

                                                    <strong>
                                                        Can Accommodate:
                                                    </strong>{" "}

                                                    <span
                                                        style={{
                                                            fontWeight: "600",
                                                            color:
                                                                canAccommodate
                                                                    ? "#16a34a"
                                                                    : "#dc2626",
                                                        }}
                                                    >

                                                        {
                                                            canAccommodate ===
                                                            true
                                                                ? "YES"
                                                                : canAccommodate ===
                                                                  false
                                                                    ? "NO"
                                                                    : "UNKNOWN"
                                                        }

                                                    </span>

                                                </span>

                                            </div>


                                            {/* =========================
                                               RESOURCE CAPACITY
                                            ========================== */}

                                            <div
                                                style={{
                                                    marginTop: "10px",
                                                    paddingTop: "8px",
                                                    borderTop:
                                                        "1px solid #e5e7eb",
                                                }}
                                            >

                                                <strong>
                                                    📦 Available Resources
                                                </strong>


                                                <span>

                                                    <strong>
                                                        Water Capacity:
                                                    </strong>{" "}

                                                    {
                                                        site.waterCapacity !==
                                                        undefined &&
                                                        site.waterCapacity !==
                                                        null
                                                            ? Number(
                                                                site.waterCapacity
                                                            ).toLocaleString()
                                                            : "N/A"
                                                    }

                                                </span>


                                                <span>

                                                    <strong>
                                                        Food Capacity:
                                                    </strong>{" "}

                                                    {
                                                        site.foodCapacity !==
                                                        undefined &&
                                                        site.foodCapacity !==
                                                        null
                                                            ? Number(
                                                                site.foodCapacity
                                                            ).toLocaleString()
                                                            : "N/A"
                                                    }

                                                </span>


                                                <span>

                                                    <strong>
                                                        Medical Capacity:
                                                    </strong>{" "}

                                                    {
                                                        site.medicalCapacity !==
                                                        undefined &&
                                                        site.medicalCapacity !==
                                                        null
                                                            ? Number(
                                                                site.medicalCapacity
                                                            ).toLocaleString()
                                                            : "N/A"
                                                    }

                                                </span>

                                            </div>


                                            {/* =========================
                                               STATUS
                                            ========================== */}

                                            <div
                                                style={{
                                                    marginTop: "10px",
                                                    paddingTop: "8px",
                                                    borderTop:
                                                        "1px solid #e5e7eb",
                                                }}
                                            >

                                                <span>

                                                    <strong>
                                                        Status:
                                                    </strong>{" "}

                                                    {
                                                        site.status ||
                                                        "Available"
                                                    }

                                                </span>


                                                {site.address && (

                                                    <span>

                                                        <strong>
                                                            Address:
                                                        </strong>{" "}

                                                        {
                                                            site.address
                                                        }

                                                    </span>

                                                )}

                                            </div>


                                            {/* =========================
                                               RECOMMENDATION MESSAGE
                                            ========================== */}

                                            {canAccommodate === true && (

                                                <div
                                                    style={{
                                                        marginTop: "12px",
                                                        padding: "9px",
                                                        borderRadius: "6px",
                                                        background:
                                                            "#dcfce7",
                                                        color:
                                                            "#166534",
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                    }}
                                                >

                                                    ✓ This site can
                                                    accommodate the
                                                    affected population.

                                                </div>

                                            )}

                                        </div>

                                    </Popup>

                                </Marker>

                            );

                        }
                    )
                }


                {/* =================================================
                   BACKEND SOS REQUESTS
                   ================================================= */}

                {validSOSRequests.map(
                    (request, index) => {

                        const coordinates =
                            getCoordinates(request);

                        if (!coordinates) {
                            return null;
                        }

                        return (

                            <Marker

                                key={
                                    request._id ||
                                    request.id ||
                                    `sos-${index}`
                                }

                                position={
                                    coordinates
                                }

                            >

                                <Popup>

                                    <div className="map-popup">

                                        <strong>
                                            Emergency SOS
                                        </strong>

                                        <span>
                                            Status:
                                            {" "}
                                            {
                                                request.status ||
                                                "Pending"
                                            }
                                        </span>

                                        {request.description && (

                                            <span>
                                                {
                                                    request.description
                                                }
                                            </span>

                                        )}

                                    </div>

                                </Popup>

                            </Marker>

                        );

                    }
                )}


                {/* =================================================
                   BACKEND RESCUE TEAMS
                   ================================================= */}

                {validRescueTeams.map(
                    (team, index) => {

                        const coordinates =
                            getCoordinates(team);

                        if (!coordinates) {
                            return null;
                        }

                        return (

                            <Marker

                                key={
                                    team._id ||
                                    team.id ||
                                    `team-${index}`
                                }

                                position={
                                    coordinates
                                }

                            >

                                <Popup>

                                    <div className="map-popup">

                                        <strong>
                                            {
                                                team.name ||
                                                "Rescue Team"
                                            }
                                        </strong>

                                        <span>
                                            Status:
                                            {" "}
                                            {
                                                team.status ||
                                                "Available"
                                            }
                                        </span>

                                    </div>

                                </Popup>

                            </Marker>

                        );

                    }
                )}


                {/* =================================================
                   BACKEND HOSPITALS
                   ================================================= */}

                {validHospitals.map(
                    (hospital, index) => {

                        const coordinates =
                            getCoordinates(
                                hospital
                            );

                        if (!coordinates) {
                            return null;
                        }

                        return (

                            <Marker

                                key={
                                    hospital._id ||
                                    hospital.id ||
                                    `hospital-${index}`
                                }

                                position={
                                    coordinates
                                }

                            >

                                <Popup>

                                    <div className="map-popup">

                                        <strong>
                                            {
                                                hospital.name ||
                                                "Hospital"
                                            }
                                        </strong>

                                        {hospital.address && (

                                            <span>
                                                {
                                                    hospital.address
                                                }
                                            </span>

                                        )}

                                    </div>

                                </Popup>

                            </Marker>

                        );

                    }
                )}


                {/* =================================================
                   BACKEND SHELTERS
                   ================================================= */}

                {validShelters.map(
                    (shelter, index) => {

                        const coordinates =
                            getCoordinates(
                                shelter
                            );

                        if (!coordinates) {
                            return null;
                        }

                        return (

                            <Marker

                                key={
                                    shelter._id ||
                                    shelter.id ||
                                    `shelter-${index}`
                                }

                                position={
                                    coordinates
                                }

                            >

                                <Popup>

                                    <div className="map-popup">

                                        <strong>
                                            {
                                                shelter.name ||
                                                "Shelter"
                                            }
                                        </strong>

                                        {shelter.capacity && (

                                            <span>
                                                Capacity:
                                                {" "}
                                                {
                                                    shelter.capacity
                                                }
                                            </span>

                                        )}

                                    </div>

                                </Popup>

                            </Marker>

                        );

                    }
                )}


                {/* =================================================
                   BACKEND RESOURCES
                   ================================================= */}

                {validResources.map(
                    (resource, index) => {

                        const coordinates =
                            getCoordinates(
                                resource
                            );

                        if (!coordinates) {
                            return null;
                        }

                        return (

                            <Marker

                                key={
                                    resource._id ||
                                    resource.id ||
                                    `resource-${index}`
                                }

                                position={
                                    coordinates
                                }

                            >

                                <Popup>

                                    <div className="map-popup">

                                        <strong>
                                            {
                                                resource.name ||
                                                "Resource"
                                            }
                                        </strong>

                                        {resource.type && (

                                            <span>
                                                Type:
                                                {" "}
                                                {
                                                    resource.type
                                                }
                                            </span>

                                        )}

                                    </div>

                                </Popup>

                            </Marker>

                        );

                    }
                )}

            </MapContainer>


            {/* =================================================
               MAP LEGEND
               ================================================= */}

            <div className="map-legend">

                <div className="map-legend-title">
                    Map Layers
                </div>


                <div className="map-legend-items">

                    <div className="map-legend-item">

                        <span className="legend-dot legend-user"></span>

                        Your location

                    </div>


                    <div className="map-legend-item">

                        <span className="legend-dot legend-high"></span>

                        High risk

                    </div>


                    <div className="map-legend-item">

                        <span className="legend-dot legend-medium"></span>

                        Medium risk

                    </div>


                    <div className="map-legend-item">

                        <span className="legend-dot legend-low"></span>

                        Low risk

                    </div>


                    {/* =========================================
                       RELOCATION SITE LEGEND
                    ========================================== */}

                    {showRelocationSites &&
                        validRelocationSites.length > 0 && (

                        <div className="map-legend-item">

                            <span
                                style={{
                                    width: "14px",
                                    height: "14px",
                                    borderRadius: "50%",
                                    background: "#2563eb",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "8px",
                                    marginRight: "6px",
                                }}
                            >
                                🏠
                            </span>

                            Relocation sites

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
}