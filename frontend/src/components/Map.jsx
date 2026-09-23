import { useEffect, useMemo, useState } from "react";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "./Map.css";


/* =========================================================
   CURRENT LOCATION ICON
   ========================================================= */

const currentLocationIcon = L.divIcon({

    className:
        "current-location-icon-wrapper",

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


    /* =====================================================
       USER LOCATION
       ===================================================== */

    const [userLocation, setUserLocation] =
        useState(null);

    const [locationStatus, setLocationStatus] =
        useState("requesting");

    const [locationError, setLocationError] =
        useState("");

    const [locationAccuracy, setLocationAccuracy] =
        useState(null);


    /* =====================================================
       GET ACTUAL USER LOCATION
       
       NOTE:
       The authority risk map itself does NOT automatically
       recenter to this location.
       
       We still keep the user's location marker available
       when browser geolocation is permitted.
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


        const watchId =
            navigator.geolocation.watchPosition(

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


                    setUserLocation(
                        actualLocation
                    );


                    setLocationAccuracy(
                        accuracy
                    );


                    setLocationStatus(
                        "success"
                    );


                    setLocationError("");

                },


                (error) => {

                    console.error(
                        "Geolocation error:",
                        error
                    );


                    setLocationStatus(
                        "error"
                    );


                    switch (error.code) {

                        case error.PERMISSION_DENIED:

                            setLocationError(
                                "Location permission was denied."
                            );

                            break;


                        case error.POSITION_UNAVAILABLE:

                            setLocationError(
                                "Your current location is unavailable."
                            );

                            break;


                        case error.TIMEOUT:

                            setLocationError(
                                "Location request timed out."
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


        return () => {

            navigator.geolocation.clearWatch(
                watchId
            );

        };

    }, []);


    /* =====================================================
       INITIAL MAP CENTER
       
       India center.
       
       The map will NOT automatically fly to the browser
       user's location.
       ===================================================== */

    const initialCenter = useMemo(
        () => [20.5937, 78.9629],
        []
    );


    /* =====================================================
       VALIDATE BACKEND DATA
       ===================================================== */

    const validRiskZones =
        Array.isArray(riskZones)
            ? riskZones
            : [];


    const validSOSRequests =
        Array.isArray(sosRequests)
            ? sosRequests
            : [];


    const validRescueTeams =
        Array.isArray(rescueTeams)
            ? rescueTeams
            : [];


    const validHospitals =
        Array.isArray(hospitals)
            ? hospitals
            : [];


    const validShelters =
        Array.isArray(shelters)
            ? shelters
            : [];


    const validResources =
        Array.isArray(resources)
            ? resources
            : [];


    /* =====================================================
       HELPER — SAFE COORDINATES
       ===================================================== */

    const getCoordinates = (item) => {

        if (!item) {
            return null;
        }


        /* -------------------------------------------------
           FORMAT 1

           {
               latitude: 25.4358,
               longitude: 81.8463
           }
        ------------------------------------------------- */

        if (

            Number.isFinite(
                Number(item.latitude)
            )

            &&

            Number.isFinite(
                Number(item.longitude)
            )

        ) {

            return [

                Number(item.latitude),

                Number(item.longitude),

            ];

        }


        /* -------------------------------------------------
           FORMAT 2

           {
               lat: 25.4358,
               lng: 81.8463
           }
        ------------------------------------------------- */

        if (

            Number.isFinite(
                Number(item.lat)
            )

            &&

            Number.isFinite(
                Number(item.lng)
            )

        ) {

            return [

                Number(item.lat),

                Number(item.lng),

            ];

        }


        /* -------------------------------------------------
           FORMAT 3

           MongoDB GeoJSON

           {
               location: {
                   coordinates: [
                       longitude,
                       latitude
                   ]
               }
           }
        ------------------------------------------------- */

        if (

            item.location &&

            Array.isArray(
                item.location.coordinates
            )

            &&

            item.location.coordinates.length >= 2

        ) {

            const longitude =
                Number(
                    item.location.coordinates[0]
                );


            const latitude =
                Number(
                    item.location.coordinates[1]
                );


            if (

                Number.isFinite(latitude)

                &&

                Number.isFinite(longitude)

            ) {

                return [

                    latitude,

                    longitude,

                ];

            }

        }


        /* -------------------------------------------------
           FORMAT 4

           {
               location: {
                   latitude: 25.4358,
                   longitude: 81.8463
               }
           }
        ------------------------------------------------- */

        if (

            item.location

            &&

            Number.isFinite(
                Number(
                    item.location.latitude
                )
            )

            &&

            Number.isFinite(
                Number(
                    item.location.longitude
                )
            )

        ) {

            return [

                Number(
                    item.location.latitude
                ),

                Number(
                    item.location.longitude
                ),

            ];

        }


        /* -------------------------------------------------
           FORMAT 5 — GEOJSON FEATURE

           {
               geometry: {
                   type: "Point",
                   coordinates: [
                       longitude,
                       latitude
                   ]
               }
           }

           IMPORTANT:
           GeoJSON uses [longitude, latitude]
           Leaflet uses [latitude, longitude].
        ------------------------------------------------- */

        if (

            item.geometry

            &&

            item.geometry.type === "Point"

            &&

            Array.isArray(
                item.geometry.coordinates
            )

            &&

            item.geometry.coordinates.length >= 2

        ) {

            const longitude =
                Number(
                    item.geometry.coordinates[0]
                );


            const latitude =
                Number(
                    item.geometry.coordinates[1]
                );


            if (

                Number.isFinite(latitude)

                &&

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
       RISK COLOR
       ===================================================== */

    const getRiskColor = (risk) => {

        const value =
            String(
                risk || ""
            ).toUpperCase();


        /* RED */

        if (

            value === "RED"

            ||

            value === "CRITICAL"

            ||

            value === "HIGH"

            ||

            value === "SEVERE"

        ) {

            return "#dc2626";

        }


        /* ORANGE */

        if (

            value === "ORANGE"

            ||

            value === "MEDIUM"

            ||

            value === "MODERATE"

        ) {

            return "#f59e0b";

        }


        /* YELLOW */

        if (
            value === "YELLOW"
        ) {

            return "#eab308";

        }


        /* GREEN / DEFAULT */

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
                            "Live location available"}


                        {locationStatus === "error" &&
                            "Location unavailable"}

                    </span>

                </div>


                {locationStatus === "success"
                    &&
                    locationAccuracy
                    && (

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

                        Location access unavailable

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
                   ACTUAL USER LOCATION
                   
                   We show the marker if available.
                   
                   We DO NOT recenter the authority map
                   automatically to this location.
                ============================================= */}

                {userLocation && (

                    <>

                        <Marker

                            position={[

                                userLocation.latitude,

                                userLocation.longitude,

                            ]}

                            icon={
                                currentLocationIcon
                            }

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

                                    color:
                                        "#2563eb",

                                    fillColor:
                                        "#2563eb",

                                    fillOpacity:
                                        0.08,

                                    weight:
                                        1,

                                }}

                            />

                        )}

                    </>

                )}


                {/* =================================================
                   BACKEND RISK ZONES / VILLAGE FEATURES
                   
                   Supports GeoJSON returned from:

                   /api/habitations/risk-map
                ================================================= */}

                {validRiskZones.map(
                    (zone, index) => {

                        const coordinates =
                            getCoordinates(
                                zone
                            );


                        if (!coordinates) {

                            console.warn(
                                "Risk zone has no valid coordinates:",
                                zone
                            );

                            return null;

                        }


                        /*
                           GeoJSON properties are stored here.
                        */

                        const properties =
                            zone.properties || {};


                        const risk =
                            zone.riskLevel ||

                            zone.risk ||

                            zone.level ||

                            properties.riskLevel ||

                            properties.risk ||

                            properties.level ||

                            "GREEN";


                        const name =
                            zone.name ||

                            properties.name ||

                            "Risk Zone";


                        const riskScore =
                            zone.riskScore ??

                            properties.riskScore;


                        const population =
                            zone.population ??

                            properties.population;


                        const vulnerabilityScore =
                            zone.vulnerabilityScore ??

                            properties.vulnerabilityScore;


                        const relocationPriority =
                            zone.relocationPriority ??

                            properties.relocationPriority;


                        return (

                            <Circle

                                key={

                                    zone._id ||

                                    zone.id ||

                                    zone.habitationId ||

                                    properties.habitationId ||

                                    `risk-${index}`

                                }

                                center={
                                    coordinates
                                }

                                /*
                                   Radius is only the visual
                                   representation of the
                                   habitation risk point.
                                */

                                radius={

                                    Number(

                                        zone.radius ||

                                        properties.radius

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

                                    fillOpacity:
                                        0.25,

                                    weight:
                                        2,

                                }}

                            >

                                <Popup>

                                    <div className="map-popup">

                                        <strong>

                                            {name}

                                        </strong>


                                        <span>

                                            Risk:
                                            {" "}
                                            {risk}

                                        </span>


                                        {riskScore !== undefined
                                            && (

                                            <span>

                                                Risk Score:
                                                {" "}
                                                {riskScore}

                                            </span>

                                        )}


                                        {population !== undefined
                                            && (

                                            <span>

                                                Population:
                                                {" "}
                                                {Number(
                                                    population
                                                ).toLocaleString()}

                                            </span>

                                        )}


                                        {vulnerabilityScore !== undefined
                                            && (

                                            <span>

                                                Vulnerability:
                                                {" "}
                                                {vulnerabilityScore}

                                            </span>

                                        )}


                                        {relocationPriority
                                            && (

                                            <span>

                                                Relocation:
                                                {" "}
                                                {
                                                    relocationPriority
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
                            getCoordinates(
                                request
                            );


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


                                        {request.description
                                            && (

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
                            getCoordinates(
                                team
                            );


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


                                        {hospital.address
                                            && (

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


                                        {shelter.capacity
                                            && (

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


                                        {resource.type
                                            && (

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

                        RED — Critical risk

                    </div>


                    <div className="map-legend-item">

                        <span className="legend-dot legend-medium"></span>

                        ORANGE — High risk

                    </div>


                    <div className="map-legend-item">

                        <span className="legend-dot legend-low"></span>

                        YELLOW / GREEN — Lower risk

                    </div>

                </div>

            </div>

        </div>

    );

}