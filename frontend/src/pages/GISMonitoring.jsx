import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    Building2,
    Hospital,
    Layers,
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    Users,
    X,
} from "lucide-react";

import {
    MapContainer,
    TileLayer,
    Circle,
    Marker,
    Popup,
    useMap,
} from "react-leaflet";

import L from "leaflet";

import AuthoritySidebar from "../components/AuthoritySidebar";
import AuthorityTopbar from "../components/AuthorityTopbar";

import "leaflet/dist/leaflet.css";
import "./GISMonitoring.css";


/* =========================================================
   API
========================================================= */

const GIS_API = "/api/gis/monitoring";


/* =========================================================
   LEAFLET ICON
========================================================= */

const defaultMarkerIcon = new L.Icon({
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",

    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});


/* =========================================================
   NORMALIZE BACKEND DATA
========================================================= */

function normalizeLocation(item, index) {
    return {
        id:
            item._id ||
            item.id ||
            `location-${index}`,

        name:
            item.name ||
            item.habitationName ||
            item.villageName ||
            "Unnamed Location",

        type:
            item.type ||
            item.locationType ||
            "habitation",

        latitude:
            item.latitude ??
            item.location?.latitude ??
            null,

        longitude:
            item.longitude ??
            item.location?.longitude ??
            null,

        riskLevel:
            item.riskLevel ||
            item.risk ||
            "Unknown",

        hazard:
            item.hazard ||
            item.primaryHazard ||
            "Unknown",

        population:
            Number(item.population) || 0,

        affectedPopulation:
            Number(
                item.affectedPopulation ??
                item.populationAtRisk
            ) || 0,

        vulnerability:
            Number(
                item.vulnerability ??
                item.vulnerabilityScore
            ) || 0,

        relocationPriority:
            item.relocationPriority ||
            item.priority ||
            "Not assessed",

        description:
            item.description ||
            "",

        district:
            item.district ||
            item.location?.district ||
            "",

        status:
            item.status ||
            "active",

        riskFactors:
            Array.isArray(item.riskFactors)
                ? item.riskFactors
                : [],
    };
}


/* =========================================================
   MAP AUTO FIT
========================================================= */

function MapBounds({ locations }) {
    const map = useMap();

    useEffect(() => {
        const validLocations = locations.filter(
            (location) =>
                Number.isFinite(
                    Number(location.latitude)
                ) &&
                Number.isFinite(
                    Number(location.longitude)
                )
        );

        if (!validLocations.length) {
            return;
        }

        const bounds = L.latLngBounds(
            validLocations.map((location) => [
                Number(location.latitude),
                Number(location.longitude),
            ])
        );

        map.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: 13,
        });
    }, [locations, map]);

    return null;
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

function GISMonitoring() {
    const [sidebarCollapsed, setSidebarCollapsed] =
        useState(false);

    const [locations, setLocations] = useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [selectedLocation, setSelectedLocation] =
        useState(null);

    const [searchTerm, setSearchTerm] =
        useState("");

    const [riskFilter, setRiskFilter] =
        useState("All");

    const [hazardFilter, setHazardFilter] =
        useState("All");

    const [visibleLayers, setVisibleLayers] =
        useState({
            habitations: true,
            riskZones: true,
            hospitals: true,
            shelters: true,
            emergencies: true,
        });


    /* =====================================================
       FETCH GIS DATA
    ===================================================== */

    const fetchGISData = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                GIS_API,
                {
                    method: "GET",
                    headers: {
                        Accept:
                            "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Backend returned ${response.status}`
                );
            }

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            if (
                !contentType.includes(
                    "application/json"
                )
            ) {
                throw new Error(
                    "GIS API did not return JSON."
                );
            }

            const result =
                await response.json();


            /*
             * Expected backend structure:
             *
             * {
             *   success: true,
             *   data: {
             *      habitations: [],
             *      riskZones: [],
             *      hospitals: [],
             *      shelters: [],
             *      emergencies: []
             *   }
             * }
             */

            const data =
                result.data || result;


            const habitations = Array.isArray(
                data.habitations
            )
                ? data.habitations.map(
                      normalizeLocation
                  )
                : [];


            const hospitals = Array.isArray(
                data.hospitals
            )
                ? data.hospitals.map(
                      (item, index) =>
                          normalizeLocation(
                              {
                                  ...item,
                                  type: "hospital",
                              },
                              index
                          )
                  )
                : [];


            const shelters = Array.isArray(
                data.shelters
            )
                ? data.shelters.map(
                      (item, index) =>
                          normalizeLocation(
                              {
                                  ...item,
                                  type: "shelter",
                              },
                              index
                          )
                  )
                : [];


            const emergencies =
                Array.isArray(
                    data.emergencies
                )
                    ? data.emergencies.map(
                          (item, index) =>
                              normalizeLocation(
                                  {
                                      ...item,
                                      type: "emergency",
                                  },
                                  index
                              )
                      )
                    : [];


            const riskZones =
                Array.isArray(
                    data.riskZones
                )
                    ? data.riskZones
                    : [];


            setLocations([
                ...habitations,
                ...hospitals,
                ...shelters,
                ...emergencies,
            ]);


            /*
             * Store risk zones separately
             * because they are geographic
             * polygons/circles rather than
             * individual locations.
             */

            setRiskZones(riskZones);

        } catch (err) {
            console.error(
                "GIS Monitoring API error:",
                err
            );

            setLocations([]);

            setRiskZones([]);

            setError(
                err.message ||
                    "Unable to load GIS monitoring data."
            );
        } finally {
            setLoading(false);
        }
    };


    const [riskZones, setRiskZones] =
        useState([]);


    useEffect(() => {
        fetchGISData();
    }, []);


    /* =====================================================
       FILTER OPTIONS
    ===================================================== */

    const riskOptions = useMemo(() => {
        const values = locations
            .filter(
                (item) =>
                    item.type ===
                    "habitation"
            )
            .map(
                (item) =>
                    item.riskLevel
            )
            .filter(
                (value) =>
                    value &&
                    value !==
                        "Unknown"
            );

        return [
            "All",
            ...new Set(values),
        ];
    }, [locations]);


    const hazardOptions = useMemo(() => {
        const values = locations
            .filter(
                (item) =>
                    item.type ===
                    "habitation"
            )
            .map(
                (item) =>
                    item.hazard
            )
            .filter(
                (value) =>
                    value &&
                    value !==
                        "Unknown"
            );

        return [
            "All",
            ...new Set(values),
        ];
    }, [locations]);


    /* =====================================================
       FILTER LOCATIONS
    ===================================================== */

    const filteredLocations =
        useMemo(() => {
            const search =
                searchTerm
                    .trim()
                    .toLowerCase();

            return locations.filter(
                (location) => {

                    if (
                        location.type ===
                        "habitation"
                    ) {
                        if (
                            riskFilter !==
                            "All" &&
                            location.riskLevel.toLowerCase() !==
                                riskFilter.toLowerCase()
                        ) {
                            return false;
                        }

                        if (
                            hazardFilter !==
                            "All" &&
                            location.hazard !==
                                hazardFilter
                        ) {
                            return false;
                        }
                    }

                    if (!search) {
                        return true;
                    }

                    return [
                        location.name,
                        location.district,
                        location.hazard,
                        location.riskLevel,
                        location.type,
                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(
                            search
                        );
                }
            );
        }, [
            locations,
            searchTerm,
            riskFilter,
            hazardFilter,
        ]);


    /* =====================================================
       MAP COUNTS
    ===================================================== */

    const counts = useMemo(() => {
        return {
            habitations:
                locations.filter(
                    (item) =>
                        item.type ===
                        "habitation"
                ).length,

            hospitals:
                locations.filter(
                    (item) =>
                        item.type ===
                        "hospital"
                ).length,

            shelters:
                locations.filter(
                    (item) =>
                        item.type ===
                        "shelter"
                ).length,

            emergencies:
                locations.filter(
                    (item) =>
                        item.type ===
                        "emergency"
                ).length,

            riskZones:
                riskZones.length,
        };
    }, [locations, riskZones]);


    /* =====================================================
       TOGGLE LAYER
    ===================================================== */

    const toggleLayer = (layer) => {
        setVisibleLayers(
            (previous) => ({
                ...previous,
                [layer]:
                    !previous[layer],
            })
        );
    };


    /* =====================================================
       LOCATION CLICK
    ===================================================== */

    const handleLocationClick = (
        location
    ) => {
        setSelectedLocation(
            location
        );
    };


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div
            className={`authority-layout ${
                sidebarCollapsed
                    ? "sidebar-collapsed"
                    : ""
            }`}
        >

            <AuthoritySidebar
                collapsed={
                    sidebarCollapsed
                }
                onToggle={() =>
                    setSidebarCollapsed(
                        (previous) =>
                            !previous
                    )
                }
            />


            <div className="authority-main">

                <AuthorityTopbar />


                <main className="gis-page">

                    {/* =================================
                        HEADER
                    ================================= */}

                    <section className="gis-header">

                        <div>
                            <span className="gis-eyebrow">
                                SPATIAL INTELLIGENCE
                            </span>

                            <h1>
                                GIS Monitoring
                            </h1>

                            <p>
                                Monitor disaster
                                risk, vulnerable
                                habitations and
                                emergency resources
                                through a unified
                                geographic view.
                            </p>
                        </div>


                        <button
                            className="refresh-button"
                            onClick={
                                fetchGISData
                            }
                            disabled={
                                loading
                            }
                        >
                            <RefreshCw
                                size={17}
                                className={
                                    loading
                                        ? "refresh-spin"
                                        : ""
                                }
                            />

                            {loading
                                ? "Updating..."
                                : "Refresh Data"}
                        </button>

                    </section>


                    {/* =================================
                        ERROR
                    ================================= */}

                    {error && (
                        <div className="gis-error">

                            <AlertTriangle
                                size={20}
                            />

                            <div>
                                <strong>
                                    GIS data unavailable
                                </strong>

                                <span>
                                    {error}
                                </span>
                            </div>

                        </div>
                    )}


                    {/* =================================
                        SUMMARY
                    ================================= */}

                    <section className="gis-summary">

                        <SummaryCard
                            icon={
                                <Building2
                                    size={21}
                                />
                            }
                            label="Habitations"
                            value={
                                loading
                                    ? "—"
                                    : counts.habitations
                            }
                        />

                        <SummaryCard
                            icon={
                                <AlertTriangle
                                    size={21}
                                />
                            }
                            label="Risk Zones"
                            value={
                                loading
                                    ? "—"
                                    : counts.riskZones
                            }
                        />

                        <SummaryCard
                            icon={
                                <Hospital
                                    size={21}
                                />
                            }
                            label="Hospitals"
                            value={
                                loading
                                    ? "—"
                                    : counts.hospitals
                            }
                        />

                        <SummaryCard
                            icon={
                                <ShieldCheck
                                    size={21}
                                />
                            }
                            label="Safe Sites"
                            value={
                                loading
                                    ? "—"
                                    : counts.shelters
                            }
                        />

                        <SummaryCard
                            icon={
                                <AlertTriangle
                                    size={21}
                                />
                            }
                            label="Emergencies"
                            value={
                                loading
                                    ? "—"
                                    : counts.emergencies
                            }
                        />

                    </section>


                    {/* =================================
                        MAP AREA
                    ================================= */}

                    <section className="gis-workspace">


                        {/* =============================
                            LEFT PANEL
                        ============================= */}

                        <aside className="gis-control-panel">

                            <div className="panel-title">

                                <div>
                                    <span>
                                        MAP CONTROLS
                                    </span>

                                    <h2>
                                        Monitoring Layers
                                    </h2>
                                </div>

                                <Layers
                                    size={20}
                                />

                            </div>


                            {/* SEARCH */}

                            <div className="gis-search">

                                <Search
                                    size={17}
                                />

                                <input
                                    value={
                                        searchTerm
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSearchTerm(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Search locations..."
                                />

                            </div>


                            {/* FILTERS */}

                            <div className="gis-filter-group">

                                <label>
                                    Risk Level
                                </label>

                                <select
                                    value={
                                        riskFilter
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setRiskFilter(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >
                                    {riskOptions.map(
                                        (
                                            option
                                        ) => (
                                            <option
                                                key={
                                                    option
                                                }
                                            >
                                                {
                                                    option
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                            </div>


                            <div className="gis-filter-group">

                                <label>
                                    Hazard
                                </label>

                                <select
                                    value={
                                        hazardFilter
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setHazardFilter(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >
                                    {hazardOptions.map(
                                        (
                                            option
                                        ) => (
                                            <option
                                                key={
                                                    option
                                                }
                                            >
                                                {
                                                    option
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                            </div>


                            {/* LAYERS */}

                            <div className="layers-section">

                                <h3>
                                    Data Layers
                                </h3>


                                <LayerToggle
                                    label="Vulnerable Habitations"
                                    icon={
                                        <Building2
                                            size={18}
                                        />
                                    }
                                    count={
                                        counts.habitations
                                    }
                                    active={
                                        visibleLayers.habitations
                                    }
                                    onClick={() =>
                                        toggleLayer(
                                            "habitations"
                                        )
                                    }
                                />


                                <LayerToggle
                                    label="Risk Zones"
                                    icon={
                                        <AlertTriangle
                                            size={18}
                                        />
                                    }
                                    count={
                                        counts.riskZones
                                    }
                                    active={
                                        visibleLayers.riskZones
                                    }
                                    onClick={() =>
                                        toggleLayer(
                                            "riskZones"
                                        )
                                    }
                                />


                                <LayerToggle
                                    label="Hospitals"
                                    icon={
                                        <Hospital
                                            size={18}
                                        />
                                    }
                                    count={
                                        counts.hospitals
                                    }
                                    active={
                                        visibleLayers.hospitals
                                    }
                                    onClick={() =>
                                        toggleLayer(
                                            "hospitals"
                                        )
                                    }
                                />


                                <LayerToggle
                                    label="Safe Sites"
                                    icon={
                                        <ShieldCheck
                                            size={18}
                                        />
                                    }
                                    count={
                                        counts.shelters
                                    }
                                    active={
                                        visibleLayers.shelters
                                    }
                                    onClick={() =>
                                        toggleLayer(
                                            "shelters"
                                        )
                                    }
                                />


                                <LayerToggle
                                    label="Emergencies"
                                    icon={
                                        <AlertTriangle
                                            size={18}
                                        />
                                    }
                                    count={
                                        counts.emergencies
                                    }
                                    active={
                                        visibleLayers.emergencies
                                    }
                                    onClick={() =>
                                        toggleLayer(
                                            "emergencies"
                                        )
                                    }
                                />

                            </div>


                            {/* LEGEND */}

                            <div className="map-legend">

                                <h3>
                                    Risk Legend
                                </h3>

                                <LegendItem
                                    className="critical"
                                    label="Critical"
                                />

                                <LegendItem
                                    className="high"
                                    label="High"
                                />

                                <LegendItem
                                    className="medium"
                                    label="Medium"
                                />

                                <LegendItem
                                    className="low"
                                    label="Low"
                                />

                            </div>

                        </aside>


                        {/* =============================
                            MAP
                        ============================= */}

                        <div className="gis-map-container">

                            {loading && (
                                <div className="map-loading">
                                    <div className="loading-spinner" />

                                    <strong>
                                        Loading GIS intelligence
                                    </strong>

                                    <span>
                                        Fetching geographic
                                        data from the
                                        backend...
                                    </span>
                                </div>
                            )}


                            <MapContainer
                                center={[
                                    20,
                                    78,
                                ]}
                                zoom={5}
                                className="gis-map"
                                zoomControl={true}
                            >

                                <TileLayer
                                    attribution="&copy; OpenStreetMap contributors"
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />


                                <MapBounds
                                    locations={
                                        filteredLocations
                                    }
                                />


                                {/* =====================
                                    RISK ZONES
                                ===================== */}

                                {visibleLayers.riskZones &&
                                    riskZones.map(
                                        (
                                            zone,
                                            index
                                        ) => (
                                            <RiskZone
                                                key={
                                                    zone._id ||
                                                    zone.id ||
                                                    `zone-${index}`
                                                }
                                                zone={
                                                    zone
                                                }
                                            />
                                        )
                                    )}


                                {/* =====================
                                    LOCATIONS
                                ===================== */}

                                {filteredLocations.map(
                                    (
                                        location
                                    ) => {

                                        if (
                                            location.latitude ===
                                                null ||
                                            location.longitude ===
                                                null
                                        ) {
                                            return null;
                                        }


                                        const shouldShow =
                                            (location.type ===
                                                "habitation" &&
                                                visibleLayers.habitations) ||

                                            (location.type ===
                                                "hospital" &&
                                                visibleLayers.hospitals) ||

                                            (location.type ===
                                                "shelter" &&
                                                visibleLayers.shelters) ||

                                            (location.type ===
                                                "emergency" &&
                                                visibleLayers.emergencies);


                                        if (
                                            !shouldShow
                                        ) {
                                            return null;
                                        }


                                        return (
                                            <Marker
                                                key={
                                                    location.id
                                                }
                                                position={[
                                                    Number(
                                                        location.latitude
                                                    ),
                                                    Number(
                                                        location.longitude
                                                    ),
                                                ]}
                                                icon={
                                                    defaultMarkerIcon
                                                }
                                                eventHandlers={{
                                                    click: () =>
                                                        handleLocationClick(
                                                            location
                                                        ),
                                                }}
                                            >

                                                <Popup>

                                                    <strong>
                                                        {
                                                            location.name
                                                        }
                                                    </strong>

                                                    <br />

                                                    {
                                                        location.type
                                                    }

                                                    {location.riskLevel !==
                                                        "Unknown" && (
                                                        <>
                                                            <br />
                                                            Risk:{" "}
                                                            {
                                                                location.riskLevel
                                                            }
                                                        </>
                                                    )}

                                                </Popup>

                                            </Marker>
                                        );
                                    }
                                )}

                            </MapContainer>


                            {/* MAP STATUS */}

                            <div className="map-status">

                                <span className="live-dot" />

                                <strong>
                                    GIS data connected
                                </strong>

                                <span>
                                    {
                                        filteredLocations.length
                                    }{" "}
                                    mapped locations
                                </span>

                            </div>

                        </div>

                    </section>

                </main>

            </div>


            {/* =========================================
                LOCATION DETAIL PANEL
            ========================================= */}

            {selectedLocation && (
                <>

                    <div
                        className="gis-overlay"
                        onClick={() =>
                            setSelectedLocation(
                                null
                            )
                        }
                    />


                    <aside className="gis-detail-panel">

                        <div className="detail-panel-header">

                            <div>

                                <span>
                                    LOCATION DETAILS
                                </span>

                                <h2>
                                    {
                                        selectedLocation.name
                                    }
                                </h2>

                                {selectedLocation.district && (
                                    <p>
                                        <MapPin
                                            size={15}
                                        />

                                        {
                                            selectedLocation.district
                                        }
                                    </p>
                                )}

                            </div>


                            <button
                                onClick={() =>
                                    setSelectedLocation(
                                        null
                                    )
                                }
                            >
                                <X
                                    size={20}
                                />
                            </button>

                        </div>


                        <div className="detail-panel-body">

                            <div className="location-type">
                                {
                                    selectedLocation.type
                                }
                            </div>


                            {selectedLocation.type ===
                                "habitation" && (
                                <>

                                    <div className="selected-risk-card">

                                        <span>
                                            Current Risk
                                        </span>

                                        <strong
                                            className={`risk-label ${String(
                                                selectedLocation.riskLevel
                                            ).toLowerCase()}`}
                                        >
                                            {
                                                selectedLocation.riskLevel
                                            }
                                        </strong>

                                    </div>


                                    <div className="detail-stat-grid">

                                        <DetailStat
                                            label="Population"
                                            value={
                                                selectedLocation.population
                                            }
                                        />

                                        <DetailStat
                                            label="Population at Risk"
                                            value={
                                                selectedLocation.affectedPopulation
                                            }
                                        />

                                        <DetailStat
                                            label="Vulnerability"
                                            value={`${Math.round(
                                                selectedLocation.vulnerability
                                            )}%`}
                                        />

                                        <DetailStat
                                            label="Hazard"
                                            value={
                                                selectedLocation.hazard
                                            }
                                        />

                                    </div>


                                    <div className="detail-priority">

                                        <span>
                                            Relocation Priority
                                        </span>

                                        <strong>
                                            {
                                                selectedLocation.relocationPriority
                                            }
                                        </strong>

                                    </div>


                                    {selectedLocation
                                        .riskFactors
                                        .length >
                                        0 && (
                                        <div className="detail-risk-factors">

                                            <h3>
                                                Risk Factors
                                            </h3>

                                            <ul>
                                                {selectedLocation.riskFactors.map(
                                                    (
                                                        factor,
                                                        index
                                                    ) => (
                                                        <li
                                                            key={
                                                                index
                                                            }
                                                        >
                                                            {
                                                                factor
                                                            }
                                                        </li>
                                                    )
                                                )}
                                            </ul>

                                        </div>
                                    )}

                                </>
                            )}


                            {selectedLocation.latitude !==
                                null &&
                                selectedLocation.longitude !==
                                    null && (
                                    <div className="coordinates">

                                        <MapPin
                                            size={18}
                                        />

                                        <div>

                                            <span>
                                                Coordinates
                                            </span>

                                            <strong>
                                                {
                                                    selectedLocation.latitude
                                                }
                                                ,{" "}
                                                {
                                                    selectedLocation.longitude
                                                }
                                            </strong>

                                        </div>

                                    </div>
                                )}

                        </div>

                    </aside>

                </>
            )}

        </div>
    );
}


/* =========================================================
   COMPONENTS
========================================================= */

function SummaryCard({
    icon,
    label,
    value,
}) {
    return (
        <div className="gis-summary-card">

            <div className="summary-icon">
                {icon}
            </div>

            <div>
                <span>
                    {label}
                </span>

                <strong>
                    {value}
                </strong>
            </div>

        </div>
    );
}


function LayerToggle({
    label,
    icon,
    count,
    active,
    onClick,
}) {
    return (
        <button
            className={`layer-toggle ${
                active
                    ? "active"
                    : ""
            }`}
            onClick={onClick}
        >

            <div className="layer-left">

                <div className="layer-icon">
                    {icon}
                </div>

                <span>
                    {label}
                </span>

            </div>

            <div className="layer-right">

                <small>
                    {count}
                </small>

                <div
                    className={`toggle ${
                        active
                            ? "on"
                            : ""
                    }`}
                >
                    <span />
                </div>

            </div>

        </button>
    );
}


function LegendItem({
    className,
    label,
}) {
    return (
        <div className="legend-item">

            <span
                className={`legend-dot ${className}`}
            />

            <span>
                {label}
            </span>

        </div>
    );
}


function DetailStat({
    label,
    value,
}) {
    return (
        <div className="detail-stat">

            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>

        </div>
    );
}


function RiskZone({ zone }) {
    const latitude =
        zone.latitude ??
        zone.center?.latitude;

    const longitude =
        zone.longitude ??
        zone.center?.longitude;

    const radius =
        Number(
            zone.radius
        ) || 1000;

    if (
        latitude ===
            undefined ||
        longitude ===
            undefined
    ) {
        return null;
    }

    return (
        <Circle
            center={[
                Number(latitude),
                Number(longitude),
            ]}
            radius={radius}
            pathOptions={{
                color: "#dc2626",
                fillColor: "#ef4444",
                fillOpacity: 0.16,
                weight: 2,
            }}
        />
    );
}


export default GISMonitoring;