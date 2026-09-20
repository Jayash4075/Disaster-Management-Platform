import { useEffect, useMemo, useState } from "react";

import {
    MapContainer,
    TileLayer,
    Circle,
    Popup,
    useMap,
} from "react-leaflet";

import {
    Search,
    Layers,
    MapPin,
    AlertTriangle,
    Activity,
    ShieldCheck,
    RefreshCw,
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./RiskMap.css";

import api from "../api/axios";
import AuthorityLayout from "../components/AuthorityLayout";


function MapController({
    selectedZone
}) {

    const map =
        useMap();


    useEffect(() => {

        if (
            selectedZone?.latitude != null &&
            selectedZone?.longitude != null
        ) {

            map.flyTo(
                [
                    Number(
                        selectedZone.latitude
                    ),
                    Number(
                        selectedZone.longitude
                    )
                ],
                13,
                {
                    duration: 1
                }
            );

        }

    }, [
        selectedZone,
        map
    ]);


    return null;

}


function RiskMap() {

    // =====================================================
    // DATA
    // =====================================================

    const [zones, setZones] =
        useState([]);

    const [selectedZone, setSelectedZone] =
        useState(null);


    // =====================================================
    // FILTERS
    // =====================================================

    const [riskFilter, setRiskFilter] =
        useState("All");

    const [hazardFilter, setHazardFilter] =
        useState("All");

    const [search, setSearch] =
        useState("");


    // =====================================================
    // STATUS
    // =====================================================

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    // =====================================================
    // CONVERT GEOJSON FEATURE
    // =====================================================

    const convertFeature =
        (feature, index) => {

            const coordinates =
                feature?.geometry?.coordinates;


            if (
                !Array.isArray(
                    coordinates
                ) ||
                coordinates.length < 2
            ) {

                return null;

            }


            const longitude =
                Number(
                    coordinates[0]
                );

            const latitude =
                Number(
                    coordinates[1]
                );


            if (
                !Number.isFinite(
                    latitude
                ) ||
                !Number.isFinite(
                    longitude
                )
            ) {

                return null;

            }


            const properties =
                feature.properties ||
                {};


            // ---------------------------------------------
            // Extract hazard names
            // ---------------------------------------------

            const hazards =
                properties.hazards ||
                {};


            const hazardNames =
                Object.entries(
                    hazards
                )
                    .filter(
                        ([, value]) =>
                            Number(value) > 0
                    )
                    .map(
                        ([key]) => key
                    );


            return {

                id:
                    feature.id ||
                    properties.habitationId ||
                    index,

                _id:
                    feature.id ||
                    properties.habitationId ||
                    index,

                habitationId:
                    properties.habitationId ||
                    properties.id ||
                    feature.id,

                name:
                    properties.name ||
                    properties.villageName ||
                    "Habitation",

                latitude,

                longitude,

                risk:
                    properties.riskLevel ||
                    properties.risk ||
                    "GREEN",

                riskScore:
                    Number(
                        properties.riskScore
                    ) || 0,

                type:
                    properties.hazardType ||
                    hazardNames[0] ||
                    "Multiple hazards",

                hazards,

                hazardNames,

                affectedPopulation:
                    Number(
                        properties.population
                    ) || 0,

                population:
                    Number(
                        properties.population
                    ) || 0,

                relocationPriority:
                    properties.relocationPriority,

                vulnerabilityScore:
                    properties.vulnerabilityScore,

                description:
                    properties.description ||
                    ""

            };

        };


    // =====================================================
    // FETCH AUTHORITY MAP
    // =====================================================

    const fetchRiskData =
        async () => {

            try {

                setLoading(true);

                setError("");


                const response =
                    await api.get(
                        "/api/dashboard/authority"
                    );


                const featureCollection =
                    response.data?.map;


                const features =
                    Array.isArray(
                        featureCollection?.features
                    )
                        ? featureCollection.features
                        : [];


                const converted =
                    features
                        .map(
                            convertFeature
                        )
                        .filter(Boolean);


                setZones(
                    converted
                );


                // Clear selected zone
                // if it no longer exists.

                setSelectedZone(
                    null
                );

            } catch (err) {

                console.error(
                    "Risk map error:",
                    err.response?.data ||
                    err
                );


                setError(
                    err.response?.data?.message ||
                    err.response?.data?.error ||
                    err.message ||
                    "Unable to fetch risk intelligence."
                );


                setZones([]);

            } finally {

                setLoading(false);

            }

        };


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {

        fetchRiskData();

    }, []);


    // =====================================================
    // HAZARD TYPES
    // =====================================================

    const hazardTypes =
        useMemo(() => {

            const types =
                zones.flatMap(
                    (zone) =>
                        zone.hazardNames?.length
                            ? zone.hazardNames
                            : [
                                zone.type
                            ]
                );


            return [
                ...new Set(
                    types.filter(
                        Boolean
                    )
                )
            ];

        }, [zones]);


    // =====================================================
    // FILTER ZONES
    // =====================================================

    const filteredZones =
        useMemo(() => {

            const searchText =
                search
                    .toLowerCase()
                    .trim();


            return zones.filter(
                (zone) => {

                    const matchesRisk =
                        riskFilter ===
                            "All" ||
                        zone.risk ===
                            riskFilter;


                    const matchesHazard =
                        hazardFilter ===
                            "All" ||
                        zone.type ===
                            hazardFilter ||
                        zone.hazardNames?.includes(
                            hazardFilter
                        );


                    const matchesSearch =
                        !searchText ||
                        zone.name
                            ?.toLowerCase()
                            .includes(
                                searchText
                            ) ||
                        zone.type
                            ?.toLowerCase()
                            .includes(
                                searchText
                            ) ||
                        zone.habitationId
                            ?.toString()
                            .toLowerCase()
                            .includes(
                                searchText
                            );


                    return (
                        matchesRisk &&
                        matchesHazard &&
                        matchesSearch
                    );

                }
            );

        }, [
            zones,
            riskFilter,
            hazardFilter,
            search
        ]);


    // =====================================================
    // RISK COUNTS
    // =====================================================

    const redCount =
        zones.filter(
            (zone) =>
                zone.risk ===
                    "RED"
        ).length;


    const orangeCount =
        zones.filter(
            (zone) =>
                zone.risk ===
                    "ORANGE"
        ).length;


    const yellowCount =
        zones.filter(
            (zone) =>
                zone.risk ===
                    "YELLOW"
        ).length;


    const greenCount =
        zones.filter(
            (zone) =>
                zone.risk ===
                    "GREEN"
        ).length;


    // =====================================================
    // RISK COLOR
    // =====================================================

    const getRiskColor =
        (risk) => {

            switch (
                String(
                    risk
                ).toUpperCase()
            ) {

                case "RED":
                    return "#ef4444";

                case "ORANGE":
                    return "#f59e0b";

                case "YELLOW":
                    return "#eab308";

                case "GREEN":
                    return "#22c55e";

                default:
                    return "#2563eb";

            }

        };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <AuthorityLayout>

            <div className="risk-page">


                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="risk-header">

                    <div>

                        <div className="page-label">
                            GIS INTELLIGENCE
                        </div>

                        <h1>
                            Risk & Hazard Map
                        </h1>

                        <p>
                            Monitor assessed habitation
                            risk and hazard intelligence
                            across the region.
                        </p>

                    </div>


                    <button
                        className="refresh-button"
                        onClick={
                            fetchRiskData
                        }
                        disabled={
                            loading
                        }
                    >

                        <RefreshCw
                            size={15}
                            className={
                                loading
                                    ? "spin"
                                    : ""
                            }
                        />

                        {loading
                            ? "Loading..."
                            : "Refresh Data"}

                    </button>

                </div>


                {/* =================================================
                    STAT CARDS
                ================================================= */}

                <div className="risk-stats">


                    <div className="risk-stat-card">

                        <div className="stat-icon blue">

                            <Layers
                                size={19}
                            />

                        </div>

                        <div>

                            <span>
                                Mapped Villages
                            </span>

                            <strong>
                                {loading
                                    ? "—"
                                    : zones.length}
                            </strong>

                        </div>

                    </div>


                    <div className="risk-stat-card">

                        <div className="stat-icon red">

                            <AlertTriangle
                                size={19}
                            />

                        </div>

                        <div>

                            <span>
                                RED Risk
                            </span>

                            <strong>
                                {loading
                                    ? "—"
                                    : redCount}
                            </strong>

                        </div>

                    </div>


                    <div className="risk-stat-card">

                        <div className="stat-icon orange">

                            <Activity
                                size={19}
                            />

                        </div>

                        <div>

                            <span>
                                ORANGE Risk
                            </span>

                            <strong>
                                {loading
                                    ? "—"
                                    : orangeCount}
                            </strong>

                        </div>

                    </div>


                    <div className="risk-stat-card">

                        <div className="stat-icon green">

                            <ShieldCheck
                                size={19}
                            />

                        </div>

                        <div>

                            <span>
                                GREEN Risk
                            </span>

                            <strong>
                                {loading
                                    ? "—"
                                    : greenCount}
                            </strong>

                        </div>

                    </div>

                </div>


                {/* =================================================
                    MAIN CONTENT
                ================================================= */}

                <div className="risk-content">


                    {/* =================================================
                        MAP
                    ================================================= */}

                    <div className="map-card">


                        <div className="map-toolbar">


                            <div className="search-box">

                                <Search
                                    size={17}
                                />

                                <input
                                    type="text"
                                    placeholder="Search villages..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <select
                                value={
                                    riskFilter
                                }
                                onChange={(event) =>
                                    setRiskFilter(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="All">
                                    All Risk Levels
                                </option>

                                <option value="RED">
                                    RED
                                </option>

                                <option value="ORANGE">
                                    ORANGE
                                </option>

                                <option value="YELLOW">
                                    YELLOW
                                </option>

                                <option value="GREEN">
                                    GREEN
                                </option>

                            </select>


                            <select
                                value={
                                    hazardFilter
                                }
                                onChange={(event) =>
                                    setHazardFilter(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="All">
                                    All Hazards
                                </option>


                                {hazardTypes.map(
                                    (type) => (

                                        <option
                                            key={type}
                                            value={type}
                                        >
                                            {type}
                                        </option>

                                    )
                                )}

                            </select>

                        </div>


                        {/* =================================================
                            MAP
                        ================================================= */}

                        <div className="map-wrapper">

                            <MapContainer
                                center={[
                                    25.4358,
                                    81.8463
                                ]}
                                zoom={8}
                                scrollWheelZoom={
                                    true
                                }
                                className="risk-map"
                            >

                                <TileLayer
                                    attribution="&copy; OpenStreetMap contributors"
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />


                                <MapController
                                    selectedZone={
                                        selectedZone
                                    }
                                />


                                {filteredZones.map(
                                    (
                                        zone,
                                        index
                                    ) => (

                                        <Circle
                                            key={
                                                zone.id ||
                                                zone._id ||
                                                index
                                            }
                                            center={[
                                                Number(
                                                    zone.latitude
                                                ),
                                                Number(
                                                    zone.longitude
                                                )
                                            ]}
                                            radius={
                                                Number(
                                                    zone.radius
                                                ) ||
                                                1500
                                            }
                                            pathOptions={{
                                                color:
                                                    getRiskColor(
                                                        zone.risk
                                                    ),

                                                fillColor:
                                                    getRiskColor(
                                                        zone.risk
                                                    ),

                                                fillOpacity:
                                                    0.22,

                                                weight:
                                                    2
                                            }}
                                            eventHandlers={{
                                                click:
                                                    () =>
                                                        setSelectedZone(
                                                            zone
                                                        )
                                            }}
                                        >

                                            <Popup>

                                                <div className="popup-content">

                                                    <strong>
                                                        {
                                                            zone.name
                                                        }
                                                    </strong>

                                                    <span>
                                                        Risk:{" "}
                                                        {
                                                            zone.risk
                                                        }
                                                    </span>

                                                    <span>
                                                        Score:{" "}
                                                        {
                                                            zone.riskScore
                                                        }
                                                    </span>

                                                    <span>
                                                        Population:{" "}
                                                        {
                                                            Number(
                                                                zone.population ||
                                                                0
                                                            ).toLocaleString()
                                                        }
                                                    </span>

                                                </div>

                                            </Popup>

                                        </Circle>

                                    )
                                )}

                            </MapContainer>


                            {/* =================================================
                                EMPTY
                            ================================================= */}

                            {!loading &&
                                !error &&
                                zones.length ===
                                    0 && (

                                    <div className="map-empty-message">

                                        <Activity
                                            size={24}
                                        />

                                        <strong>
                                            No mapped
                                            assessments
                                        </strong>

                                        <span>
                                            Risk map features
                                            will appear when
                                            assessed villages
                                            have real coordinates.
                                        </span>

                                    </div>

                                )}


                            {/* =================================================
                                ERROR
                            ================================================= */}

                            {!loading &&
                                error && (

                                    <div className="map-error-message">

                                        <AlertTriangle
                                            size={22}
                                        />

                                        <strong>
                                            Risk data unavailable
                                        </strong>

                                        <span>
                                            {error}
                                        </span>

                                        <button
                                            onClick={
                                                fetchRiskData
                                            }
                                        >
                                            Try Again
                                        </button>

                                    </div>

                                )}


                            {/* =================================================
                                LEGEND
                            ================================================= */}

                            <div className="map-legend">

                                <div className="legend-title">
                                    RISK LEVEL
                                </div>


                                <div>
                                    <span className="legend-dot high"></span>
                                    RED
                                </div>


                                <div>
                                    <span className="legend-dot medium"></span>
                                    ORANGE
                                </div>


                                <div>
                                    <span className="legend-dot low"></span>
                                    YELLOW
                                </div>


                                <div>
                                    <span className="legend-dot"></span>
                                    GREEN
                                </div>

                            </div>

                        </div>

                    </div>


                    {/* =================================================
                        SIDE PANEL
                    ================================================= */}

                    <div className="zone-panel">


                        <div className="panel-heading">

                            <div>

                                <span>
                                    AREA INTELLIGENCE
                                </span>

                                <h2>

                                    {selectedZone?.name ||
                                        "Select a Village"}

                                </h2>

                            </div>


                            <MapPin
                                size={20}
                            />

                        </div>


                        {selectedZone ? (

                            <div className="zone-details">


                                <div className="detail-row">

                                    <span>
                                        Risk Level
                                    </span>

                                    <strong
                                        style={{
                                            color:
                                                getRiskColor(
                                                    selectedZone.risk
                                                )
                                        }}
                                    >
                                        {
                                            selectedZone.risk
                                        }
                                    </strong>

                                </div>


                                <div className="detail-row">

                                    <span>
                                        Risk Score
                                    </span>

                                    <strong>
                                        {
                                            selectedZone.riskScore
                                        }
                                    </strong>

                                </div>


                                <div className="detail-row">

                                    <span>
                                        Population
                                    </span>

                                    <strong>
                                        {Number(
                                            selectedZone.population ||
                                            0
                                        ).toLocaleString()}
                                    </strong>

                                </div>


                                <div className="detail-row">

                                    <span>
                                        Habitation ID
                                    </span>

                                    <strong>
                                        {
                                            selectedZone.habitationId ||
                                            "—"
                                        }
                                    </strong>

                                </div>


                                <div className="detail-row">

                                    <span>
                                        Relocation Priority
                                    </span>

                                    <strong>
                                        {
                                            selectedZone.relocationPriority ||
                                            "—"
                                        }
                                    </strong>

                                </div>


                                <div className="detail-row">

                                    <span>
                                        Vulnerability Score
                                    </span>

                                    <strong>
                                        {
                                            selectedZone.vulnerabilityScore ??
                                            "—"
                                        }
                                    </strong>

                                </div>


                                {selectedZone.hazardNames?.length >
                                    0 && (

                                    <div className="detail-description">

                                        <strong>
                                            Detected Hazards
                                        </strong>

                                        <br />

                                        {
                                            selectedZone.hazardNames.join(
                                                ", "
                                            )
                                        }

                                    </div>

                                )}


                                {selectedZone.description && (

                                    <div className="detail-description">

                                        {
                                            selectedZone.description
                                        }

                                    </div>

                                )}

                            </div>

                        ) : (

                            <div className="empty-zone">

                                <div className="empty-icon">

                                    <MapPin
                                        size={22}
                                    />

                                </div>

                                <strong>
                                    No Area Selected
                                </strong>

                                <p>
                                    Select a village on
                                    the map to view its
                                    risk intelligence.
                                </p>

                            </div>

                        )}

                    </div>

                </div>

            </div>

        </AuthorityLayout>

    );

}


export default RiskMap;