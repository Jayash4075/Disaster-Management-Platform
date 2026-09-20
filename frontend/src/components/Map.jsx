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

    /*
       This is ONLY the initial map position.

       It is NOT treated as the user's location.

       As soon as GPS is available, RecenterMap moves
       the map to the actual user location.
    */

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


    /* =====================================================
       HELPER — SAFE COORDINATES
       ===================================================== */

    const getCoordinates = (item) => {

        if (!item) return null;


        /*
           Supports multiple backend structures.

           Example 1:
           {
               latitude: 25.4358,
               longitude: 81.8463
           }

           Example 2:
           {
               lat: 25.4358,
               lng: 81.8463
           }

           Example 3:
           {
               location: {
                   coordinates: [81.8463, 25.4358]
               }
           }

           Example 4:
           {
               location: {
                   latitude: 25.4358,
                   longitude: 81.8463
               }
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


        if (
            Number.isFinite(Number(item.lat)) &&
            Number.isFinite(Number(item.lng))
        ) {

            return [
                Number(item.lat),
                Number(item.lng),
            ];
        }


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


        return null;
    };


    /* =====================================================
       RISK ZONE COLOR
       ===================================================== */

    const getRiskColor = (risk) => {

        const value = String(
            risk || ""
        ).toLowerCase();


        if (
            value.includes("high") ||
            value.includes("critical") ||
            value.includes("severe")
        ) {

            return "#dc2626";
        }


        if (
            value.includes("medium") ||
            value.includes("moderate")
        ) {

            return "#f59e0b";
        }


        return "#16a34a";
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

                        const coordinates =
                            getCoordinates(zone);


                        if (!coordinates) {
                            return null;
                        }


                        const risk =
                            zone.riskLevel ||
                            zone.risk ||
                            zone.level;


                        return (

                            <Circle

                                key={
                                    zone._id ||
                                    zone.id ||
                                    `risk-${index}`
                                }

                                center={coordinates}

                                radius={
                                    Number(
                                        zone.radius
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

                                    <div className="map-popup">

                                        <strong>

                                            {zone.name ||
                                                "Risk Zone"}

                                        </strong>


                                        <span>

                                            Risk:
                                            {" "}
                                            {risk ||
                                                "Unknown"}

                                        </span>


                                        {zone.description && (

                                            <span>

                                                {
                                                    zone.description
                                                }

                                            </span>

                                        )}

                                    </div>

                                </Popup>

                            </Circle>

                        );

                    }
                )}


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

                                            {team.name ||
                                                "Rescue Team"}

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

                                            {hospital.name ||
                                                "Hospital"}

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

                                            {shelter.name ||
                                                "Shelter"}

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

                                            {resource.name ||
                                                "Resource"}

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

                </div>

            </div>

        </div>
    );
}