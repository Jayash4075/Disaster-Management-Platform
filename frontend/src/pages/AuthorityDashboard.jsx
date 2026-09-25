import { useEffect, useMemo, useState } from "react";

import {
    AlertTriangle,
    ChevronRight,
    Hospital,
    MapPin,
    Package,
    Radio,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Users,
    XCircle,
} from "lucide-react";

import { useOutletContext } from "react-router-dom";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    CircleMarker,
    GeoJSON,
    useMap,
} from "react-leaflet";

import L from "leaflet";

import api from "../api/axios";

import "leaflet/dist/leaflet.css";
import "./AuthorityDashboard.css";


// =========================================================
// LEAFLET ICON
// =========================================================

const defaultMarkerIcon = new L.Icon({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",

    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});


// =========================================================
// GET COORDINATES
// Supports:
// latitude/longitude
// location.coordinates
// coordinates
// GeoJSON Point
// =========================================================

function getCoordinates(item) {

    if (!item) {
        return null;
    }


    const properties =
        item?.properties || item;


    // ---------------------------------------------
    // latitude / longitude
    // ---------------------------------------------

    const latitude =
        properties.latitude ??
        properties.lat ??
        properties.location?.latitude ??
        properties.location?.lat;

    const longitude =
        properties.longitude ??
        properties.lng ??
        properties.lon ??
        properties.location?.longitude ??
        properties.location?.lng;


    if (
        Number.isFinite(Number(latitude)) &&
        Number.isFinite(Number(longitude))
    ) {

        return [
            Number(latitude),
            Number(longitude),
        ];

    }


    // ---------------------------------------------
    // location.coordinates
    // [longitude, latitude]
    // ---------------------------------------------

    if (
        properties.location &&
        Array.isArray(
            properties.location.coordinates
        ) &&
        properties.location.coordinates.length >= 2
    ) {

        const lng =
            Number(
                properties.location.coordinates[0]
            );

        const lat =
            Number(
                properties.location.coordinates[1]
            );

        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
        ) {

            return [
                lat,
                lng,
            ];

        }

    }


    // ---------------------------------------------
    // direct coordinates
    // [longitude, latitude]
    // ---------------------------------------------

    if (
        Array.isArray(
            properties.coordinates
        ) &&
        properties.coordinates.length >= 2
    ) {

        const lng =
            Number(
                properties.coordinates[0]
            );

        const lat =
            Number(
                properties.coordinates[1]
            );

        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
        ) {

            return [
                lat,
                lng,
            ];

        }

    }


    // ---------------------------------------------
    // GeoJSON Point
    // ---------------------------------------------

    if (
        item.geometry?.type === "Point" &&
        Array.isArray(
            item.geometry.coordinates
        ) &&
        item.geometry.coordinates.length >= 2
    ) {

        const lng =
            Number(
                item.geometry.coordinates[0]
            );

        const lat =
            Number(
                item.geometry.coordinates[1]
            );

        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
        ) {

            return [
                lat,
                lng,
            ];

        }

    }


    return null;
}


// =========================================================
// RISK COLOR
// =========================================================

function getRiskColor(riskLevel) {

    const level =
        String(
            riskLevel || "GREEN"
        ).toUpperCase();


    if (level === "RED") {
        return "#dc2626";
    }

    if (level === "ORANGE") {
        return "#f97316";
    }

    if (level === "YELLOW") {
        return "#eab308";
    }

    return "#16a34a";
}


// =========================================================
// NORMALIZE RISK FEATURE
// =========================================================

function normalizeRiskFeature(feature) {

    const properties =
        feature?.properties || feature || {};


    return {
        ...properties,

        id:
            properties.habitationId ||
            properties.id ||
            properties._id ||
            `risk-${Math.random()}`,

        name:
            properties.name ||
            properties.habitationName ||
            properties.villageName ||
            properties.village_name ||
            "Unnamed Village",

        population:
            Number(
                properties.population
            ) || 0,

        riskLevel:
            String(
                properties.riskLevel ||
                properties.risk ||
                "GREEN"
            ).toUpperCase(),

        riskScore:
            Number(
                properties.riskScore ??
                properties.score
            ) || 0,

        vulnerabilityScore:
            Number(
                properties.vulnerabilityScore ??
                properties.vulnerability_score ??
                properties.vulnerability
            ) || 0,

        relocationPriority:
            properties.relocationPriority ||
            properties.priority ||
            "MONITOR",

        hazards:
            properties.hazards ||
            {},

        riskProbability:
            Number(
                properties.riskProbability
            ) || 0,

        capacityRatio:
            Number(
                properties.capacityRatio
            ) || 0,

        capacityStatus:
            properties.capacityStatus ||
            "UNKNOWN",

        geometry:
            feature?.geometry || null,
    };
}


// =========================================================
// MAP BOUNDS
// =========================================================

function RiskMapBounds({
    features,
    alerts,
    shelters,
    hospitals,
}) {

    const map = useMap();


    useEffect(() => {

        const bounds =
            L.latLngBounds([]);


        let hasBounds = false;


        // ---------------------------------------------
        // RISK FEATURES
        // ---------------------------------------------

        features.forEach(
            (feature) => {

                try {

                    if (
                        feature?.geometry
                    ) {

                        const geoLayer =
                            L.geoJSON(
                                feature
                            );

                        const featureBounds =
                            geoLayer.getBounds();

                        if (
                            featureBounds.isValid()
                        ) {

                            bounds.extend(
                                featureBounds
                            );

                            hasBounds = true;

                        }

                    } else {

                        const coords =
                            getCoordinates(
                                feature
                            );

                        if (coords) {

                            bounds.extend(
                                coords
                            );

                            hasBounds = true;

                        }

                    }

                } catch (error) {

                    console.warn(
                        "Unable to calculate risk feature bounds:",
                        error
                    );

                }

            }
        );


        // ---------------------------------------------
        // ALERTS
        // ---------------------------------------------

        alerts.forEach(
            (alert) => {

                const coords =
                    getCoordinates(
                        alert
                    );

                if (coords) {

                    bounds.extend(
                        coords
                    );

                    hasBounds = true;

                }

            }
        );


        // ---------------------------------------------
        // SHELTERS
        // ---------------------------------------------

        shelters.forEach(
            (shelter) => {

                const coords =
                    getCoordinates(
                        shelter
                    );

                if (coords) {

                    bounds.extend(
                        coords
                    );

                    hasBounds = true;

                }

            }
        );


        // ---------------------------------------------
        // HOSPITALS
        // ---------------------------------------------

        hospitals.forEach(
            (hospital) => {

                const coords =
                    getCoordinates(
                        hospital
                    );

                if (coords) {

                    bounds.extend(
                        coords
                    );

                    hasBounds = true;

                }

            }
        );


        // ---------------------------------------------
        // FIT MAP
        // ---------------------------------------------

        if (hasBounds) {

            map.fitBounds(
                bounds,
                {
                    padding: [
                        35,
                        35,
                    ],

                    maxZoom: 12,
                }
            );

        } else {

            map.setView(
                [
                    25.4358,
                    81.8463,
                ],
                6
            );

        }

    }, [
        features,
        alerts,
        shelters,
        hospitals,
        map,
    ]);


    return null;
}


// =========================================================
// RISK POPUP
// =========================================================

function RiskPopup({
    data,
}) {

    const riskLevel =
        String(
            data.riskLevel ||
            "GREEN"
        ).toUpperCase();


    const hazards =
        data.hazards || {};


    return (
        <div
            style={{
                minWidth: "220px",
                fontSize: "13px",
                lineHeight: "1.5",
            }}
        >

            <div
                style={{
                    fontWeight: 800,
                    fontSize: "15px",
                    marginBottom: "6px",
                }}
            >
                {data.name}
            </div>


            <div
                style={{
                    marginBottom: "8px",
                    color: "#64748b",
                }}
            >
                Habitation / Village
            </div>


            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "1fr 1fr",
                    gap: "6px",
                }}
            >

                <div>
                    <strong>
                        Population
                    </strong>

                    <br />

                    {Number(
                        data.population || 0
                    ).toLocaleString()}
                </div>


                <div>
                    <strong>
                        Risk Score
                    </strong>

                    <br />

                    {Number(
                        data.riskScore || 0
                    ).toFixed(1)}
                </div>


                <div>
                    <strong>
                        Risk Level
                    </strong>

                    <br />

                    <span
                        style={{
                            color:
                                getRiskColor(
                                    riskLevel
                                ),

                            fontWeight: 800,
                        }}
                    >
                        {riskLevel}
                    </span>
                </div>


                <div>
                    <strong>
                        Vulnerability
                    </strong>

                    <br />

                    {Number(
                        data.vulnerabilityScore ||
                        0
                    ).toFixed(1)}
                    %
                </div>

            </div>


            <div
                style={{
                    marginTop: "10px",
                    paddingTop: "8px",
                    borderTop:
                        "1px solid #e5e7eb",
                }}
            >

                <strong>
                    Relocation Priority
                </strong>

                <br />

                {data.relocationPriority ||
                    "MONITOR"}

            </div>


            {Object.keys(
                hazards
            ).length > 0 && (

                <div
                    style={{
                        marginTop: "10px",
                        paddingTop: "8px",
                        borderTop:
                            "1px solid #e5e7eb",
                    }}
                >

                    <strong>
                        Hazard Scores
                    </strong>


                    <div
                        style={{
                            marginTop: "4px",
                        }}
                    >

                        {Object.entries(
                            hazards
                        ).map(
                            (
                                [
                                    hazard,
                                    value,
                                ]
                            ) => (

                                <div
                                    key={
                                        hazard
                                    }
                                >

                                    {hazard
                                        .charAt(
                                            0
                                        )
                                        .toUpperCase() +
                                        hazard.slice(
                                            1
                                        )}
                                    :{" "}
                                    {Number(
                                        value
                                    ).toFixed(
                                        1
                                    )}

                                </div>

                            )
                        )}

                    </div>

                </div>

            )}


            {data.capacityStatus && (

                <div
                    style={{
                        marginTop: "8px",
                        color: "#64748b",
                    }}
                >

                    Capacity status:{" "}
                    <strong>
                        {
                            data.capacityStatus
                        }
                    </strong>

                </div>

            )}

        </div>
    );
}


// =========================================================
// RISK FEATURE COMPONENT
// =========================================================

function RiskFeature({
    feature,
}) {

    const data =
        normalizeRiskFeature(
            feature
        );


    const color =
        getRiskColor(
            data.riskLevel
        );


    // ---------------------------------------------
    // POLYGON / MULTIPOLYGON
    // ---------------------------------------------

    if (
        feature?.geometry &&
        (
            feature.geometry.type ===
                "Polygon" ||
            feature.geometry.type ===
                "MultiPolygon"
        )
    ) {

        const style = {
            color,
            weight:
                data.riskLevel ===
                "RED"
                    ? 3
                    : 2,

            fillColor:
                color,

            fillOpacity:
                data.riskLevel ===
                "RED"
                    ? 0.35
                    : 0.20,
        };


        return (
            <GeoJSON
                data={feature}
                style={style}
                onEachFeature={(
                    _feature,
                    layer
                ) => {

                    layer.bindPopup(
                        createRiskPopupHTML(
                            data
                        )
                    );

                    layer.on({
                        mouseover: () => {

                            layer.setStyle({
                                weight: 4,
                                fillOpacity: 0.45,
                            });

                        },

                        mouseout: () => {

                            layer.setStyle(
                                style
                            );

                        },
                    });

                }}
            />
        );

    }


    // ---------------------------------------------
    // POINT / MARKER
    // ---------------------------------------------

    const coords =
        getCoordinates(
            feature
        );


    if (!coords) {
        return null;
    }


    return (
        <CircleMarker
            center={coords}

            radius={
                data.riskLevel ===
                "RED"
                    ? 11
                    : data.riskLevel ===
                        "ORANGE"
                        ? 9
                        : 7
            }

            pathOptions={{
                color,
                fillColor:
                    color,
                fillOpacity:
                    0.78,
                weight:
                    data.riskLevel ===
                    "RED"
                        ? 3
                        : 2,
            }}
        >

            <Popup>
                <RiskPopup
                    data={data}
                />
            </Popup>

        </CircleMarker>
    );
}


// =========================================================
// CREATE POPUP HTML FOR POLYGONS
// =========================================================

function createRiskPopupHTML(
    data
) {

    const hazards =
        data.hazards || {};


    const hazardHTML =
        Object.keys(
            hazards
        ).length > 0
            ? Object.entries(
                hazards
            )
                .map(
                    (
                        [
                            key,
                            value,
                        ]
                    ) =>
                        `<div>${key}: ${Number(
                            value
                        ).toFixed(
                            1
                        )}</div>`
                )
                .join("")
            : "<div>No hazard scores available</div>";


    return `
        <div style="min-width:220px;font-size:13px;line-height:1.5">

            <div style="font-weight:800;font-size:15px;margin-bottom:6px">
                ${escapePopupHTML(
                    data.name
                )}
            </div>

            <div style="color:#64748b;margin-bottom:8px">
                Habitation / Village
            </div>

            <div>
                <strong>Population:</strong>
                ${Number(
                    data.population || 0
                ).toLocaleString()}
            </div>

            <div>
                <strong>Risk Score:</strong>
                ${Number(
                    data.riskScore || 0
                ).toFixed(1)}
            </div>

            <div>
                <strong>Risk Level:</strong>
                ${escapePopupHTML(
                    data.riskLevel
                )}
            </div>

            <div>
                <strong>Vulnerability:</strong>
                ${Number(
                    data.vulnerabilityScore || 0
                ).toFixed(1)}%
            </div>

            <div>
                <strong>Relocation:</strong>
                ${escapePopupHTML(
                    data.relocationPriority ||
                    "MONITOR"
                )}
            </div>

            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb">
                <strong>Hazard Scores</strong>
                ${hazardHTML}
            </div>

        </div>
    `;
}


// =========================================================
// ESCAPE POPUP HTML
// =========================================================

function escapePopupHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// =========================================================
// AUTHORITY RISK MAP
// =========================================================

function AuthorityRiskMap({
    riskFeatures = [],
    alerts = [],
    hospitals = [],
    shelters = [],
}) {

    const defaultCenter =
        [
            25.4358,
            81.8463,
        ];


    return (
        <MapContainer
            center={
                defaultCenter
            }

            zoom={6}

            style={{
                width: "100%",
                height: "100%",
                minHeight: "520px",
            }}

            zoomControl={true}

            scrollWheelZoom={true}
        >

            <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />


            {/* =========================================
                AUTOMATIC MAP FIT
            ========================================= */}

            <RiskMapBounds
                features={
                    riskFeatures
                }

                alerts={
                    alerts
                }

                shelters={
                    shelters
                }

                hospitals={
                    hospitals
                }
            />


            {/* =========================================
                RISK ZONES / HABITATIONS
            ========================================= */}

            {riskFeatures.map(
                (
                    feature,
                    index
                ) => (

                    <RiskFeature
                        key={
                            feature?.properties?.habitationId ||
                            feature?.properties?.village_code ||
                            feature?.properties?.id ||
                            feature?.id ||
                            `risk-${index}`
                        }

                        feature={
                            feature
                        }
                    />

                )
            )}


            {/* =========================================
                HOSPITALS
            ========================================= */}

            {hospitals.map(
                (
                    hospital,
                    index
                ) => {

                    const coords =
                        getCoordinates(
                            hospital
                        );


                    if (!coords) {
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
                                coords
                            }

                            icon={
                                defaultMarkerIcon
                            }
                        >

                            <Popup>

                                <strong>
                                    🏥{" "}
                                    {
                                        hospital.name ||
                                        hospital.title ||
                                        "Hospital"
                                    }
                                </strong>


                                {hospital.address && (
                                    <>
                                        <br />
                                        {
                                            hospital.address
                                        }
                                    </>
                                )}

                            </Popup>

                        </Marker>
                    );

                }
            )}


            {/* =========================================
                SAFE SITES / SHELTERS
            ========================================= */}

            {shelters.map(
                (
                    shelter,
                    index
                ) => {

                    const coords =
                        getCoordinates(
                            shelter
                        );


                    if (!coords) {
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
                                coords
                            }

                            icon={
                                defaultMarkerIcon
                            }
                        >

                            <Popup>

                                <strong>
                                    🏠{" "}
                                    {
                                        shelter.name ||
                                        shelter.title ||
                                        "Safe Site"
                                    }
                                </strong>


                                {shelter.address && (
                                    <>
                                        <br />
                                        {
                                            shelter.address
                                        }
                                    </>
                                )}


                                {shelter.totalCapacity && (
                                    <>
                                        <br />
                                        Capacity:{" "}
                                        {
                                            shelter.totalCapacity
                                        }
                                    </>
                                )}

                            </Popup>

                        </Marker>
                    );

                }
            )}


            {/* =========================================
                SOS / EMERGENCY INCIDENTS
            ========================================= */}

            {alerts.map(
                (
                    alert,
                    index
                ) => {

                    const coords =
                        getCoordinates(
                            alert
                        );


                    if (!coords) {
                        return null;
                    }


                    return (
                        <Marker
                            key={
                                alert._id ||
                                alert.id ||
                                `alert-${index}`
                            }

                            position={
                                coords
                            }

                            icon={
                                defaultMarkerIcon
                            }
                        >

                            <Popup>

                                <strong>
                                    🚨{" "}
                                    {
                                        alert.title ||
                                        alert.type ||
                                        alert.disasterType ||
                                        "Emergency Incident"
                                    }
                                </strong>


                                {alert.description && (
                                    <>
                                        <br />
                                        {
                                            alert.description
                                        }
                                    </>
                                )}


                                {alert.severity && (
                                    <>
                                        <br />
                                        Severity:{" "}
                                        {
                                            alert.severity
                                        }
                                    </>
                                )}


                                {alert.status && (
                                    <>
                                        <br />
                                        Status:{" "}
                                        {
                                            alert.status
                                        }
                                    </>
                                )}

                            </Popup>

                        </Marker>
                    );

                }
            )}

        </MapContainer>
    );
}


// =========================================================
// MAIN COMPONENT
// =========================================================

function AuthorityDashboard() {

    // =========================================================
    // SEARCH
    // Search state is controlled by AuthorityLayout
    // =========================================================

    const {
        search = "",
    } = useOutletContext();


    // =========================================================
    // DASHBOARD DATA
    // =========================================================

    const [
        dashboardData,
        setDashboardData,
    ] = useState(null);


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        refreshing,
        setRefreshing,
    ] = useState(false);


    const [
        error,
        setError,
    ] = useState("");


    // =========================================================
    // RISK MAP DATA
    // =========================================================

    const [
        riskMapFeatures,
        setRiskMapFeatures,
    ] = useState([]);


    // =========================================================
    // OPTIONAL INCIDENT / FACILITY DATA
    // =========================================================

    const [
        alerts,
        setAlerts,
    ] = useState([]);


    const [
        hospitals,
        setHospitals,
    ] = useState([]);


    const [
        shelters,
        setShelters,
    ] = useState([]);


    // =========================================================
    // SELECTED INCIDENT
    // =========================================================

    const [
        selectedAlert,
        setSelectedAlert,
    ] = useState(null);


    // =========================================================
    // EXTRACT ARRAY FROM BACKEND RESPONSE
    // =========================================================

    const extractArray = (
        response
    ) => {

        const data =
            response?.data;


        if (
            Array.isArray(
                data
            )
        ) {
            return data;
        }


        if (
            Array.isArray(
                data?.data
            )
        ) {
            return data.data;
        }


        if (
            Array.isArray(
                data?.items
            )
        ) {
            return data.items;
        }


        if (
            Array.isArray(
                data?.alerts
            )
        ) {
            return data.alerts;
        }


        if (
            Array.isArray(
                data?.hospitals
            )
        ) {
            return data.hospitals;
        }


        if (
            Array.isArray(
                data?.shelters
            )
        ) {
            return data.shelters;
        }


        return [];

    };


    // =========================================================
    // FETCH AUTHORITY DASHBOARD
    // =========================================================

    const fetchAuthorityDashboard =
        async () => {

            try {

                setError("");


                const response =
                    await api.get(
                        "/api/dashboard/authority"
                    );


                if (
                    !response.data
                ) {

                    throw new Error(
                        "Empty authority dashboard response."
                    );

                }


                console.log(
                    "Authority dashboard response:",
                    response.data
                );


                setDashboardData(
                    response.data
                );

            } catch (
                err
            ) {

                console.error(
                    "Authority dashboard error:",
                    err.response?.data ||
                    err
                );


                setError(
                    err.response?.data?.message ||
                    err.response?.data?.error ||
                    err.message ||
                    "Unable to load authority dashboard."
                );


                setDashboardData(
                    null
                );

            }

        };


    // =========================================================
    // FETCH RISK MAP
    // =========================================================

    const fetchRiskMap =
        async () => {

            try {

                const response =
                    await api.get(
                        "/api/habitations/risk-map"
                    );


                console.log(
                    "Risk map response:",
                    response.data
                );


                // ---------------------------------------------
                // PRIMARY FORMAT
                // {
                //   success: true,
                //   map: {
                //      type: "FeatureCollection",
                //      features: [...]
                //   }
                // }
                // ---------------------------------------------

                let features =
                    response.data?.map?.features;


                // ---------------------------------------------
                // FALLBACK FORMATS
                // ---------------------------------------------

                if (
                    !Array.isArray(
                        features
                    )
                ) {

                    features =
                        response.data?.features;

                }


                if (
                    !Array.isArray(
                        features
                    )
                ) {

                    features =
                        response.data?.data;

                }


                if (
                    !Array.isArray(
                        features
                    )
                ) {

                    features = [];

                }


                // ---------------------------------------------
                // NORMALIZE ONLY VALID MAP FEATURES
                // ---------------------------------------------

                const normalized =
                    features
                        .filter(
                            (
                                feature
                            ) =>
                                feature &&
                                (
                                    feature.geometry ||
                                    getCoordinates(
                                        feature
                                    )
                                )
                        )
                        .map(
                            (
                                feature
                            ) => {

                                // Keep GeoJSON intact.
                                // Add normalized properties
                                // without destroying geometry.

                                if (
                                    feature.geometry
                                ) {

                                    return {
                                        ...feature,

                                        properties: {
                                            ...(
                                                feature.properties ||
                                                {}
                                            ),

                                            ...normalizeRiskFeature(
                                                feature
                                            ),
                                        },
                                    };

                                }


                                return {
                                    type: "Feature",

                                    geometry: {
                                        type: "Point",

                                        coordinates: [
                                            getCoordinates(
                                                feature
                                            )[1],

                                            getCoordinates(
                                                feature
                                            )[0],
                                        ],
                                    },

                                    properties:
                                        normalizeRiskFeature(
                                            feature
                                        ),
                                };

                            }
                        );


                setRiskMapFeatures(
                    normalized
                );


            } catch (
                err
            ) {

                console.error(
                    "Risk map error:",
                    err.response?.data ||
                    err
                );


                setRiskMapFeatures(
                    []
                );

            }

        };


    // =========================================================
    // FETCH INCIDENTS / FACILITIES
    //
    // These are supplementary APIs.
    // =========================================================

    const fetchSupplementaryData =
        async () => {

            const results =
                await Promise.allSettled([

                    api.get(
                        "/api/sos"
                    ),

                    api.get(
                        "/api/shelters"
                    ),

                ]);


            // ---------------------------------------------
            // SOS
            // ---------------------------------------------

            if (
                results[0].status ===
                "fulfilled"
            ) {

                const sosData =
                    extractArray(
                        results[0].value
                    );


                setAlerts(
                    sosData
                );

            } else {

                console.warn(
                    "SOS data unavailable:",
                    results[0].reason
                );


                setAlerts(
                    []
                );

            }


            // ---------------------------------------------
            // SHELTERS
            // ---------------------------------------------

            if (
                results[1].status ===
                "fulfilled"
            ) {

                const shelterData =
                    extractArray(
                        results[1].value
                    );


                setShelters(
                    shelterData
                );

            } else {

                console.warn(
                    "Shelter data unavailable:",
                    results[1].reason
                );


                setShelters(
                    []
                );

            }


            // ---------------------------------------------
            // HOSPITALS
            // ---------------------------------------------

            setHospitals(
                []
            );

        };


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(
        () => {

            const loadDashboard =
                async () => {

                    setLoading(
                        true
                    );


                    await Promise.all([

                        fetchAuthorityDashboard(),

                        fetchSupplementaryData(),

                        fetchRiskMap(),

                    ]);


                    setLoading(
                        false
                    );

                };


            loadDashboard();

        },
        []
    );


    // =========================================================
    // REFRESH
    // =========================================================

    const refreshDashboard =
        async () => {

            setRefreshing(
                true
            );


            await Promise.all([

                fetchAuthorityDashboard(),

                fetchSupplementaryData(),

                fetchRiskMap(),

            ]);


            setRefreshing(
                false
            );

        };


    // =========================================================
    // BACKEND DATA
    // =========================================================

    const summary =
        dashboardData?.summary ||
        {};


    const riskOverview =
        dashboardData?.riskOverview ||
        {};


    const distribution =
        riskOverview?.distribution ||
        {};


    const dataSource =
        dashboardData?.dataSource ||
        {};


    // =========================================================
    // MAP DATA
    // =========================================================

    const mapFeatures =
        riskMapFeatures.length > 0
            ? riskMapFeatures
            : (
                Array.isArray(
                    dashboardData?.map?.features
                )
                    ? dashboardData.map.features
                    : []
            );


    // =========================================================
    // FILTER INCIDENTS
    // =========================================================

    const filteredAlerts =
        useMemo(
            () => {

                if (
                    !search.trim()
                ) {

                    return alerts;

                }


                const query =
                    search.toLowerCase();


                return alerts.filter(
                    (
                        alert
                    ) =>
                        JSON.stringify(
                            alert
                        )
                            .toLowerCase()
                            .includes(
                                query
                            )
                );

            },
            [
                alerts,
                search,
            ]
        );


    // =========================================================
    // RISK LEVEL
    // =========================================================

    const riskLevel =
        riskOverview?.riskLevel ||
        "GREEN";


    const overallRiskScore =
        Number(
            riskOverview?.overallRiskScore
        ) || 0;


    // =========================================================
    // SYSTEM STATUS
    // =========================================================

    const systemOperational =
        dashboardData?.systemStatus ===
        "operational";


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <main className="authority-page">


            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="authority-header">

                <div className="authority-header-left">

                    <div className="authority-status">

                        <span></span>

                        AUTHORITY COMMAND CENTER

                    </div>


                    <h1>
                        Disaster Response Overview
                    </h1>


                    <p>
                        Monitor incidents, vulnerable
                        habitations, relocation priorities
                        and ML-powered risk intelligence.
                    </p>

                </div>


                <div className="authority-header-actions">


                    <div className="system-status">

                        <ShieldCheck
                            size={17}
                        />

                        <div>

                            <span>
                                System status
                            </span>

                            <strong>

                                {loading
                                    ? "Checking..."
                                    : systemOperational
                                        ? "Operational"
                                        : "Degraded"}

                            </strong>

                        </div>

                    </div>


                    <button
                        className="refresh-button"
                        onClick={
                            refreshDashboard
                        }
                        disabled={
                            refreshing
                        }
                    >

                        <RefreshCw
                            size={16}
                            className={
                                refreshing
                                    ? "spin"
                                    : ""
                            }
                        />

                        {refreshing
                            ? "Refreshing"
                            : "Refresh"}

                    </button>

                </div>

            </section>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

                <div className="authority-error">

                    <XCircle
                        size={18}
                    />

                    <div>

                        <strong>
                            Dashboard data unavailable
                        </strong>

                        <span>
                            {error}
                        </span>

                    </div>


                    <button
                        onClick={
                            refreshDashboard
                        }
                    >
                        Retry
                    </button>

                </div>

            )}


            {/* =================================================
                MAIN STATISTICS
            ================================================= */}

            <section className="authority-stat-grid">


                {/* RED ZONES */}

                <article className="authority-stat-card emergency">

                    <div className="stat-card-icon">

                        <ShieldAlert
                            size={21}
                        />

                    </div>

                    <div>

                        <span>
                            Critical Red Zones
                        </span>

                        <strong>

                            {loading
                                ? "—"
                                : summary.criticalRedZones ??
                                  0}

                        </strong>

                        <small>
                            Assessed high-risk areas
                        </small>

                    </div>

                </article>


                {/* PEOPLE AT RISK */}

                <article className="authority-stat-card">

                    <div className="stat-card-icon">

                        <Users
                            size={21}
                        />

                    </div>

                    <div>

                        <span>
                            People At Risk
                        </span>

                        <strong>

                            {loading
                                ? "—"
                                : Number(
                                    summary.peopleAtRisk ||
                                    0
                                ).toLocaleString()}

                        </strong>

                        <small>
                            RED + ORANGE habitation population
                        </small>

                    </div>

                </article>


                {/* RELOCATION */}

                <article className="authority-stat-card">

                    <div className="stat-card-icon">

                        <MapPin
                            size={21}
                        />

                    </div>

                    <div>

                        <span>
                            Immediate Relocation
                        </span>

                        <strong>

                            {loading
                                ? "—"
                                : summary.immediateRelocation ??
                                  0}

                        </strong>

                        <small>
                            Villages requiring priority action
                        </small>

                    </div>

                </article>


                {/* SAFE SITES */}

                <article className="authority-stat-card risk-card">

                    <div className="stat-card-icon">

                        <ShieldCheck
                            size={21}
                        />

                    </div>

                    <div>

                        <span>
                            Safe Sites
                        </span>

                        <strong>

                            {loading
                                ? "—"
                                : summary.safeSites ??
                                  0}

                        </strong>

                        <small>
                            Relocation sites with available capacity
                        </small>

                    </div>

                </article>

            </section>


            {/* =================================================
                RISK OVERVIEW
            ================================================= */}

            <section className="authority-secondary-grid">


                <section className="authority-panel">

                    <div className="panel-header">

                        <div>

                            <div className="panel-title">

                                <AlertTriangle
                                    size={18}
                                />

                                ML Risk Intelligence

                            </div>

                            <p>
                                Risk assessment stored by
                                the backend after ML processing.
                            </p>

                        </div>

                    </div>


                    <div className="risk-intelligence">

                        <div className="risk-main">

                            <span>
                                Overall assessed risk
                            </span>

                            <strong>
                                {loading
                                    ? "Loading..."
                                    : riskLevel}
                            </strong>


                            <div className="risk-meter">

                                <div
                                    style={{
                                        width:
                                            `${Math.min(
                                                100,
                                                overallRiskScore
                                            )}%`,
                                    }}
                                />

                            </div>


                            <small>
                                Average risk score:{" "}
                                {overallRiskScore}
                            </small>

                        </div>


                        <div className="risk-source">

                            <ShieldCheck
                                size={19}
                            />

                            <div>

                                <strong>
                                    ML service
                                </strong>

                                <span>

                                    {dataSource.mlService
                                        ? "Connected"
                                        : "Unavailable"}

                                </span>

                            </div>

                        </div>

                    </div>


                    {/* RISK DISTRIBUTION */}

                    <div className="environment-grid">

                        <div>

                            <span>
                                RED
                            </span>

                            <strong>
                                {distribution.red ??
                                    0}
                            </strong>

                        </div>


                        <div>

                            <span>
                                ORANGE
                            </span>

                            <strong>
                                {distribution.orange ??
                                    0}
                            </strong>

                        </div>


                        <div>

                            <span>
                                YELLOW
                            </span>

                            <strong>
                                {distribution.yellow ??
                                    0}
                            </strong>

                        </div>


                        <div>

                            <span>
                                GREEN
                            </span>

                            <strong>
                                {distribution.green ??
                                    0}
                            </strong>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    DATA SOURCE
                ================================================= */}

                <section className="authority-panel">

                    <div className="panel-header">

                        <div>

                            <div className="panel-title">

                                <Hospital
                                    size={18}
                                />

                                Data Coverage

                            </div>

                            <p>
                                Current backend and ML
                                assessment coverage.
                            </p>

                        </div>

                    </div>


                    <div className="facility-summary">


                        <div className="facility-summary-item">

                            <Users
                                size={20}
                            />

                            <div>

                                <span>
                                    Total Villages
                                </span>

                                <strong>
                                    {dataSource.villages ??
                                        0}
                                </strong>

                            </div>

                        </div>


                        <div className="facility-summary-item">

                            <ShieldCheck
                                size={20}
                            />

                            <div>

                                <span>
                                    Assessed Villages
                                </span>

                                <strong>
                                    {dataSource.assessedVillages ??
                                        0}
                                </strong>

                            </div>

                        </div>


                        <div className="facility-summary-item">

                            <Package
                                size={20}
                            />

                            <div>

                                <span>
                                    Map Features
                                </span>

                                <strong>
                                    {mapFeatures.length}
                                </strong>

                            </div>

                        </div>

                    </div>

                </section>

            </section>


            {/* =================================================
                MAP
            ================================================= */}

            <section className="authority-panel map-panel">


                <div className="panel-header">

                    <div>

                        <div className="panel-title">

                            <MapPin
                                size={18}
                            />

                            Village Risk Map

                        </div>

                        <p>
                            Geographic view of assessed
                            habitation risk, red zones
                            and relocation intelligence.
                        </p>

                    </div>


                    <span className="live-badge">
                        BACKEND
                    </span>

                </div>


                <div className="authority-map-container">

                    {loading ? (

                        <div className="map-loading">

                            <RefreshCw
                                size={22}
                                className="spin"
                            />

                            <span>
                                Loading risk map...
                            </span>

                        </div>

                    ) : mapFeatures.length === 0 ? (

                        <div className="map-loading">

                            <MapPin
                                size={22}
                            />

                            <span>
                                No mapped villages are
                                currently available.
                            </span>

                        </div>

                    ) : (

                        <AuthorityRiskMap

                            riskFeatures={
                                mapFeatures
                            }

                            alerts={
                                alerts
                            }

                            hospitals={
                                hospitals
                            }

                            shelters={
                                shelters
                            }

                        />

                    )}

                </div>

            </section>


            {/* =================================================
                EMERGENCY QUEUE
            ================================================= */}

            <section className="authority-panel incident-panel">


                <div className="panel-header">

                    <div>

                        <div className="panel-title">

                            <Radio
                                size={18}
                            />

                            Emergency Queue

                        </div>

                        <p>
                            Emergency reports returned
                            by the backend.
                        </p>

                    </div>


                    <span className="queue-count">
                        {filteredAlerts.length}
                    </span>

                </div>


                <div className="incident-list">


                    {loading ? (

                        <div className="panel-empty">

                            <RefreshCw
                                size={20}
                                className="spin"
                            />

                            Loading incidents...

                        </div>

                    ) : filteredAlerts.length === 0 ? (

                        <div className="panel-empty">

                            <ShieldCheck
                                size={25}
                            />

                            <strong>
                                No active incidents
                            </strong>

                            <span>
                                No SOS incident records
                                were returned.
                            </span>

                        </div>

                    ) : (

                        filteredAlerts.map(
                            (
                                alert,
                                index
                            ) => (

                                <button
                                    className="incident-row"
                                    key={
                                        alert._id ||
                                        alert.id ||
                                        index
                                    }
                                    onClick={() =>
                                        setSelectedAlert(
                                            alert
                                        )
                                    }
                                >

                                    <div className="incident-icon">

                                        <AlertTriangle
                                            size={17}
                                        />

                                    </div>


                                    <div className="incident-content">

                                        <strong>

                                            {alert.type ||
                                                alert.title ||
                                                alert.disasterType ||
                                                "Emergency incident"}

                                        </strong>


                                        <span>

                                            <MapPin
                                                size={12}
                                            />

                                            {alert.location?.address ||
                                                alert.address ||
                                                alert.location?.name ||
                                                "Location supplied by backend"}

                                        </span>


                                        <small>

                                            {alert.status ||
                                                alert.severity ||
                                                "Active"}

                                        </small>

                                    </div>


                                    <ChevronRight
                                        size={17}
                                    />

                                </button>

                            )
                        )

                    )}

                </div>

            </section>


            {/* =================================================
                RESPONSE OPERATIONS
            ================================================= */}

            <section className="authority-panel operations-panel">

                <div className="panel-header">

                    <div>

                        <div className="panel-title">

                            <Users
                                size={18}
                            />

                            Response Operations

                        </div>

                        <p>
                            Authority operational modules
                            connected through backend APIs.
                        </p>

                    </div>

                </div>


                <div className="operations-placeholder">


                    <div>

                        <Users
                            size={21}
                        />

                        <strong>
                            Response teams
                        </strong>

                        <span>
                            Use the Response Teams module
                            to manage rescue personnel.
                        </span>

                    </div>


                    <div>

                        <Package
                            size={21}
                        />

                        <strong>
                            Resources
                        </strong>

                        <span>
                            Use the Resources module
                            for inventory and allocation.
                        </span>

                    </div>


                    <div>

                        <Radio
                            size={21}
                        />

                        <strong>
                            Dispatch
                        </strong>

                        <span>
                            Emergency reports are loaded
                            from the SOS backend.
                        </span>

                    </div>

                </div>

            </section>


            {selectedAlert && (

                <div
                    className="authority-modal-backdrop"
                    onClick={() =>
                        setSelectedAlert(null)
                    }
                >

                    <div
                        className="authority-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="modal-close"
                            onClick={() =>
                                setSelectedAlert(null)
                            }
                        >

                            <XCircle
                                size={20}
                            />

                        </button>

                        <div className="modal-icon">

                            <AlertTriangle
                                size={23}
                            />

                        </div>

                        <span className="modal-kicker">
                            INCIDENT DETAILS
                        </span>

                        <h2>

                            {selectedAlert.type ||
                                selectedAlert.title ||
                                selectedAlert.disasterType ||
                                "Emergency incident"}

                        </h2>

                        <div className="modal-location">

                            <MapPin
                                size={15}
                            />

                            {selectedAlert.location?.address ||
                                selectedAlert.address ||
                                selectedAlert.location?.name ||
                                "Location supplied by backend"}

                        </div>

                        <div className="modal-data">

                            <div>

                                <span>
                                    Severity
                                </span>

                                <strong>
                                    {selectedAlert.severity ||
                                        "Not supplied"}
                                </strong>

                            </div>

                            <div>

                                <span>
                                    Status
                                </span>

                                <strong>
                                    {selectedAlert.status ||
                                        "Not supplied"}
                                </strong>

                            </div>

                            <div>

                                <span>
                                    ID
                                </span>

                                <strong>
                                    {selectedAlert._id ||
                                        selectedAlert.id ||
                                        "Not supplied"}
                                </strong>

                            </div>

                        </div>

                        <p className="modal-description">

                            {selectedAlert.description ||
                                selectedAlert.message ||
                                "No additional incident description was returned by the backend."}

                        </p>

                        <div className="modal-note">

                            <ShieldCheck
                                size={17}
                            />

                            <span>
                                This dashboard displays
                                backend data only.
                            </span>

                        </div>

                    </div>

                </div>

            )}

        </main>
    );
}

export default AuthorityDashboard;