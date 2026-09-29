import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Bell,
    Building2,
    CloudRain,
    Hospital,
    MapPin,
    Package,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Siren
} from "lucide-react";

import CitizenLayout from "../components/CitizenLayout";
import SOSCard from "../components/SOSCard";
import Map from "../components/Map";

import api from "../api/axios";

import "./CitizenDashboard.css";


function CitizenDashboard() {

    // The shared Map component is also used by AuthorityDashboard.
    // CitizenDashboard therefore handles the risk-zone popup only here.
    // Map.jsx is NOT changed, so the Authority map remains untouched.

    const userName =
        localStorage.getItem("userName") ||
        "Citizen";


    // =========================================================
    // STATE
    // =========================================================

    const [location, setLocation] =
        useState(null);

    const [locationAccuracy, setLocationAccuracy] =
        useState(null);

    const [locationLoading, setLocationLoading] =
        useState(true);

    const [locationError, setLocationError] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    const [dashboard, setDashboard] =
        useState(null);

    // Citizen-only selected risk-zone popup.
    const [selectedCitizenZone, setSelectedCitizenZone] =
        useState(null);

    // Citizen-only selected safer-site popup.
    // This is handled here instead of changing the shared Map.jsx,
    // so AuthorityDashboard remains completely untouched.
    const [selectedCitizenSite, setSelectedCitizenSite] =
        useState(null);


    // =========================================================
    // NORMALIZE RESPONSE
    // =========================================================

    const normalizeDashboard = (data) => {

        const disasterRisk =
            data?.disasterRisk || {};

        const probability =
            Number(
                disasterRisk?.probability ??
                data?.riskScore ??
                0
            );

        let riskScore =
            Number(data?.riskScore);

        if (!Number.isFinite(riskScore)) {

            riskScore =
                probability <= 1
                    ? probability * 100
                    : probability;

        }

        return {

            activeAlerts:
                Number(data?.activeAlerts) || 0,

            nearbyHospitals:
                Number(data?.nearbyHospitals) || 0,

            nearbyShelters:
                Number(data?.nearbyShelters) || 0,

            riskLevel:
                String(
                    disasterRisk?.risk ||
                    data?.riskLevel ||
                    "UNKNOWN"
                ).toUpperCase(),

            riskScore:
                Math.round(
                    Math.max(
                        0,
                        Math.min(
                            100,
                            riskScore
                        )
                    )
                ),

            disasterRisk,

            alerts:
                Array.isArray(data?.alerts)
                    ? data.alerts
                    : [],

            hospitals:
                Array.isArray(data?.hospitals)
                    ? data.hospitals
                    : [],

            shelters:
                Array.isArray(data?.shelters)
                    ? data.shelters
                    : [],

            hazardZones:
                Array.isArray(data?.hazardZones)
                    ? data.hazardZones
                    : [],

            vulnerableHabitations:
                Array.isArray(
                    data?.vulnerableHabitations
                )
                    ? data.vulnerableHabitations
                    : [],

            relocationSites:
                Array.isArray(
                    data?.relocationSites
                )
                    ? data.relocationSites
                    : [],

            relocationRecommendation:
                data?.relocationRecommendation ||
                data?.recommendedRelocationSite ||
                null,

            weather:
                data?.weather || null,

            resources:
                Array.isArray(data?.resources)
                    ? data.resources
                    : [],

            map:
                data?.map ||
                data?.features ||
                null
        };
    };


    // =========================================================
    // FETCH DASHBOARD
    // =========================================================

    const fetchDashboard = async (
        latitude,
        longitude
    ) => {

        try {

            setError("");

            setLoading(true);

            const response =
                await api.get(
                    "/api/dashboard",
                    {
                        params: {
                            lat: latitude,
                            lng: longitude
                        }
                    }
                );

            console.log(
                "Citizen dashboard:",
                response.data
            );

            setDashboard(
                normalizeDashboard(
                    response.data
                )
            );

        } catch (err) {

            console.error(
                "Citizen dashboard error:",
                err.response?.data ||
                err
            );

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Unable to load safety information."
            );

        } finally {

            setLoading(false);

        }
    };


    // =========================================================
    // LOCATION
    // =========================================================

    const getCurrentLocation = () => {

        setLocationLoading(true);

        setLocationError("");

        if (!navigator.geolocation) {

            setLocationError(
                "Geolocation is not supported by this browser."
            );

            setLocationLoading(false);

            return;
        }

        navigator.geolocation.getCurrentPosition(

            (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                setLocation({
                    latitude,
                    longitude
                });

                setLocationAccuracy(
                    position.coords.accuracy
                );

                setLocationLoading(false);

            },

            (err) => {

                console.error(
                    "Location error:",
                    err
                );

                setLocationLoading(false);

                if (
                    err.code ===
                    err.PERMISSION_DENIED
                ) {

                    setLocationError(
                        "Location permission denied. Allow location access and try again."
                    );

                } else if (
                    err.code ===
                    err.POSITION_UNAVAILABLE
                ) {

                    setLocationError(
                        "Your current location is unavailable."
                    );

                } else {

                    setLocationError(
                        "Unable to determine your location."
                    );
                }

            },

            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            }
        );
    };


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(() => {

        getCurrentLocation();

    }, []);


    // =========================================================
    // FETCH WHEN LOCATION AVAILABLE
    // =========================================================

    useEffect(() => {

        if (!location) {
            return;
        }

        fetchDashboard(
            location.latitude,
            location.longitude
        );

    }, [location]);


    // =========================================================
    // REFRESH
    // =========================================================

    const refreshDashboard = async () => {

        if (!location) {
            getCurrentLocation();
            return;
        }

        setRefreshing(true);

        await fetchDashboard(
            location.latitude,
            location.longitude
        );

        setRefreshing(false);
    };


    // =========================================================
    // DERIVED DATA
    // =========================================================

    const riskLevel =
        dashboard?.riskLevel ||
        "UNKNOWN";

    const riskScore =
        Number(
            dashboard?.riskScore
        ) || 0;

    const habitation =
        dashboard?.vulnerableHabitations?.[0] ||
        null;

    const recommendedSite =
        dashboard?.relocationRecommendation ||
        dashboard?.relocationSites?.[0] ||
        null;


    const riskClass =
        riskLevel === "RED" ||
        riskLevel === "CRITICAL"
            ? "red"
            : riskLevel === "ORANGE" ||
              riskLevel === "HIGH"
                ? "orange"
                : riskLevel === "YELLOW" ||
                  riskLevel === "MEDIUM"
                    ? "yellow"
                    : "green";


    const priority =
        habitation?.relocationPriority ||
        habitation?.priority ||
        "MONITOR";


    const safetyMessage =
        riskClass === "red"
            ? "Your area requires immediate attention. Follow official evacuation instructions."
            : riskClass === "orange"
                ? "Your area has elevated disaster risk. Stay prepared for possible relocation."
                : riskClass === "yellow"
                    ? "Your area requires monitoring. Keep emergency supplies and stay alert."
                    : "Your current area is comparatively safer according to the latest assessment.";


    // =========================================================
    // MAP DATA - CITIZEN ONLY
    //
    // IMPORTANT:
    // We are NOT changing Map.jsx. The same shared Map component
    // is used by AuthorityDashboard. We only prepare and pass
    // citizen-specific data from this page.
    // =========================================================

    const mapFeatures = useMemo(() => {

        const features =
            dashboard?.map?.features;

        if (Array.isArray(features)) {
            return features;
        }

        if (Array.isArray(dashboard?.vulnerableHabitations)) {
            return dashboard.vulnerableHabitations;
        }

        return [];

    }, [
        dashboard?.map?.features,
        dashboard?.vulnerableHabitations
    ]);


    const citizenRiskZones = useMemo(() => {

        if (mapFeatures.length > 0) {
            return mapFeatures;
        }

        return Array.isArray(
            dashboard?.vulnerableHabitations
        )
            ? dashboard.vulnerableHabitations
            : [];

    }, [
        mapFeatures,
        dashboard?.vulnerableHabitations
    ]);


    const citizenHazardZones = useMemo(() => {

        return Array.isArray(
            dashboard?.hazardZones
        )
            ? dashboard.hazardZones
            : [];

    }, [dashboard?.hazardZones]);


    const citizenRelocationSites = useMemo(() => {

        return Array.isArray(
            dashboard?.relocationSites
        )
            ? dashboard.relocationSites
            : [];

    }, [dashboard?.relocationSites]);


    // =========================================================
    // CITIZEN-ONLY RISK ZONE POPUP
    //
    // The shared Map.jsx already renders the circles. We intercept
    // only the risk-circle click on this page and show a clean
    // citizen popup containing ONLY information that actually exists.
    // This does not change Map.jsx or AuthorityDashboard.
    // =========================================================

    useEffect(() => {

        if (!citizenRiskZones.length) {
            setSelectedCitizenZone(null);
            return;
        }

        let cleanup = () => {};
        let timer = null;

        const attachCitizenZoneHandlers = () => {

            const mapElement = document.querySelector(
                ".citizen-map-panel .terrashield-map"
            );

            if (!mapElement) {
                return false;
            }

            const paths = Array.from(
                mapElement.querySelectorAll(".leaflet-interactive")
            );

            if (!paths.length) {
                return false;
            }

            // Map.jsx creates one accuracy circle before the risk circles
            // when live location accuracy is available.
            const accuracyOffset = locationAccuracy ? 1 : 0;
            const handlers = [];

            citizenRiskZones.forEach((zone, index) => {

                const path = paths[index + accuracyOffset];

                if (!path) return;

                const handler = (event) => {

                    // Prevent only the shared Map.jsx risk popup from
                    // opening. Other map popups are not modified.
                    event.preventDefault();
                    event.stopPropagation();

                    setSelectedCitizenSite(null);
                    setSelectedCitizenZone(zone);
                };

                path.addEventListener("click", handler, true);

                handlers.push(() => {
                    path.removeEventListener("click", handler, true);
                });
            });

            cleanup = () => {
                handlers.forEach((remove) => remove());
            };

            return true;
        };

        // Leaflet renders its SVG paths after React renders Map.jsx.
        timer = setTimeout(() => {
            attachCitizenZoneHandlers();
        }, 250);

        return () => {
            if (timer) clearTimeout(timer);
            cleanup();
        };

    }, [
        citizenRiskZones,
        locationAccuracy,
        location,
        dashboard
    ]);


    // =========================================================
    // CITIZEN-ONLY SAFER SITE POPUP
    //
    // Map.jsx is shared with AuthorityDashboard and its relocation
    // popup currently expects several flat fields that are not part
    // of the actual relocation-site response.
    //
    // The backend actually returns:
    // siteId, name, location.coordinates, distanceKm,
    // suitabilityScore, capacity.total, capacity.occupied,
    // capacity.available, availableCapacity, canAccommodate.
    //
    // Therefore this citizen page replaces ONLY the safer-site
    // popup with a clean card using those real fields.
    // =========================================================

    useEffect(() => {

        if (!citizenRelocationSites.length) {
            setSelectedCitizenSite(null);
            return;
        }

        let cleanup = () => {};
        let timer = null;

        const attachCitizenSiteHandlers = () => {

            const mapElement = document.querySelector(
                ".citizen-map-panel .terrashield-map"
            );

            if (!mapElement) {
                return false;
            }

            // Map.jsx gives every relocation-site divIcon this class.
            // The order is the same as validRelocationSites.map(...),
            // so the marker index maps to citizenRelocationSites.
            const markers = Array.from(
                mapElement.querySelectorAll(
                    ".relocation-site-icon-wrapper"
                )
            );

            if (!markers.length) {
                return false;
            }

            const handlers = [];

            markers.forEach((marker, index) => {

                const site =
                    citizenRelocationSites[index];

                if (!site) return;

                const handler = (event) => {

                    // Stop the shared Map.jsx popup from opening.
                    event.preventDefault();
                    event.stopPropagation();

                    setSelectedCitizenZone(null);
                    setSelectedCitizenSite(site);
                };

                marker.addEventListener(
                    "click",
                    handler,
                    true
                );

                handlers.push(() => {

                    marker.removeEventListener(
                        "click",
                        handler,
                        true
                    );

                });
            });

            cleanup = () => {
                handlers.forEach((remove) => remove());
            };

            return true;
        };

        // Leaflet creates the marker DOM after Map.jsx renders.
        timer = setTimeout(() => {

            attachCitizenSiteHandlers();

        }, 300);

        return () => {

            if (timer) {
                clearTimeout(timer);
            }

            cleanup();

        };

    }, [
        citizenRelocationSites,
        location,
        dashboard
    ]);


    // Close both citizen-only map cards when location changes.
    useEffect(() => {

        setSelectedCitizenZone(null);
        setSelectedCitizenSite(null);

    }, [location]);


    const selectedCitizenZoneData =
        selectedCitizenZone?.properties ||
        selectedCitizenZone ||
        null;

    const selectedCitizenName =
        selectedCitizenZoneData?.name ||
        selectedCitizenZoneData?.habitationName ||
        selectedCitizenZoneData?.villageName ||
        "Risk Zone";

    const selectedCitizenHasHazards =
        selectedCitizenZoneData &&
        (selectedCitizenZoneData.hazards?.flood != null ||
         selectedCitizenZoneData.hazards?.landslide != null ||
         selectedCitizenZoneData.hazards?.erosion != null ||
         selectedCitizenZoneData.hazards?.cloudburst != null);

    const selectedCitizenHasCapacity =
        selectedCitizenZoneData &&
        (selectedCitizenZoneData.safeCapacity != null ||
         selectedCitizenZoneData.capacityRatio != null ||
         selectedCitizenZoneData.capacityStatus != null ||
         selectedCitizenZoneData.shelterCapacity != null ||
         selectedCitizenZoneData.availableWater != null ||
         selectedCitizenZoneData.foodStock != null ||
         selectedCitizenZoneData.medicalCapacity != null);

    const selectedCitizenHasAssessment =
        selectedCitizenZoneData &&
        (selectedCitizenZoneData.assessmentStatus != null ||
         selectedCitizenZoneData.lastAssessment != null);


    // =========================================================
    // RESOURCE COUNT
    // =========================================================

    const resourceCount =
        dashboard?.resources?.length ||
        0;


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <CitizenLayout>

            <div className="citizen-dashboard">

                {/* =================================================
                    HEADER
                ================================================= */}

                <section className="citizen-page-header">

                    <div>

                        <div className="citizen-eyebrow">
                            <span></span>
                            CITIZEN SAFETY CENTER
                        </div>

                        <h1>
                            Welcome, {userName}
                        </h1>

                        <p>
                            Monitor your local disaster risk,
                            alerts and safer relocation options.
                        </p>

                    </div>

                    <button
                        className="citizen-refresh"
                        onClick={refreshDashboard}
                        disabled={
                            refreshing ||
                            locationLoading
                        }
                    >

                        <RefreshCw
                            size={16}
                            className={
                                refreshing
                                    ? "citizen-spin"
                                    : ""
                            }
                        />

                        {refreshing
                            ? "Refreshing"
                            : "Refresh safety data"}

                    </button>

                </section>


                {/* =================================================
                    LOCATION
                ================================================= */}

                <section className="citizen-location-card">

                    <div className="citizen-location-main">

                        <div className="citizen-location-icon">
                            <MapPin size={19} />
                        </div>

                        <div>

                            <strong>
                                Your current location
                            </strong>

                            <span>

                                {locationLoading
                                    ? "Detecting your location..."
                                    : location
                                        ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                                        : "Location unavailable"}

                            </span>

                        </div>

                    </div>

                    <div>

                        {locationAccuracy && (
                            <span className="accuracy">
                                ±{Math.round(
                                    locationAccuracy
                                )}m accuracy
                            </span>
                        )}

                        <button
                            onClick={
                                getCurrentLocation
                            }
                        >
                            Update location
                        </button>

                    </div>

                </section>


                {/* =================================================
                    ERROR
                ================================================= */}

                {(locationError || error) && (

                    <div className="citizen-error">

                        <AlertTriangle size={18} />

                        <div>

                            <strong>
                                Safety data unavailable
                            </strong>

                            <span>
                                {locationError || error}
                            </span>

                        </div>

                    </div>

                )}


                {/* =================================================
                    MAIN RISK HERO
                ================================================= */}

                <section
                    className={`citizen-risk-hero risk-${riskClass}`}
                >

                    <div className="citizen-risk-main">

                        <div className="citizen-risk-icon">

                            {riskClass === "red"
                                ? <ShieldAlert size={28} />
                                : riskClass === "orange"
                                    ? <AlertTriangle size={28} />
                                    : <ShieldCheck size={28} />
                            }

                        </div>

                        <div>

                            <span>
                                CURRENT AREA RISK
                            </span>

                            <h2>
                                {loading
                                    ? "Assessing..."
                                    : `${riskLevel} RISK`}
                            </h2>

                            <p>
                                {loading
                                    ? "Analysing current environmental and disaster conditions."
                                    : safetyMessage}
                            </p>

                        </div>

                    </div>

                    <div className="citizen-risk-score">

                        <strong>
                            {loading
                                ? "--"
                                : riskScore}
                        </strong>

                        <span>
                            / 100
                        </span>

                        <small>
                            Risk score
                        </small>

                    </div>

                </section>


                {/* =================================================
                    STATISTICS
                ================================================= */}

                <section className="citizen-stat-grid">

                    <article className="citizen-stat-card danger">

                        <div className="citizen-stat-icon">
                            <Bell size={20} />
                        </div>

                        <div>

                            <span>
                                Active alerts
                            </span>

                            <strong>
                                {loading
                                    ? "—"
                                    : dashboard?.activeAlerts || 0}
                            </strong>

                        </div>

                    </article>


                    <article className="citizen-stat-card">

                        <div className="citizen-stat-icon">
                            <Hospital size={20} />
                        </div>

                        <div>

                            <span>
                                Nearby hospitals
                            </span>

                            <strong>
                                {loading
                                    ? "—"
                                    : dashboard?.nearbyHospitals || 0}
                            </strong>

                        </div>

                    </article>


                    <article className="citizen-stat-card">

                        <div className="citizen-stat-icon">
                            <Building2 size={20} />
                        </div>

                        <div>

                            <span>
                                Safer sites
                            </span>

                            <strong>
                                {loading
                                    ? "—"
                                    : dashboard?.nearbyShelters || 0}
                            </strong>

                        </div>

                    </article>


                    <article className="citizen-stat-card">

                        <div className="citizen-stat-icon">
                            <Package size={20} />
                        </div>

                        <div>

                            <span>
                                Emergency resources
                            </span>

                            <strong>
                                {loading
                                    ? "—"
                                    : resourceCount}
                            </strong>

                        </div>

                    </article>

                </section>


                {/* =================================================
                    SAFETY + RELOCATION
                ================================================= */}

                <section className="citizen-two-column">

                    {/* AREA PROFILE */}

                    <article className="citizen-panel">

                        <div className="citizen-panel-header">

                            <div>

                                <span>
                                    YOUR AREA
                                </span>

                                <h2>
                                    Risk & vulnerability
                                </h2>

                            </div>

                            <ShieldCheck size={20} />

                        </div>

                        {habitation ? (

                            <>

                                <div className="citizen-habitation-name">

                                    <MapPin size={17} />

                                    <strong>
                                        {habitation.name ||
                                         habitation.village ||
                                         habitation.habitation ||
                                         "Assessed habitation"}
                                    </strong>

                                </div>

                                <div className="citizen-data-grid">

                                    <div>
                                        <span>Risk</span>
                                        <strong>
                                            {habitation.riskLevel ||
                                             riskLevel}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Risk score</span>
                                        <strong>
                                            {habitation.riskScore ?? "--"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Vulnerability</span>
                                        <strong>
                                            {habitation.vulnerabilityScore != null
                                                ? `${habitation.vulnerabilityScore}%`
                                                : "--"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Population</span>
                                        <strong>
                                            {habitation.population ?? "--"}
                                        </strong>
                                    </div>

                                </div>

                                <div className="citizen-priority">

                                    <span>
                                        Relocation priority
                                    </span>

                                    <strong
                                        className={`priority-${String(
                                            priority
                                        ).toLowerCase()}`}
                                    >
                                        {priority}
                                    </strong>

                                </div>

                            </>

                        ) : (

                            <div className="citizen-empty">

                                No assessed habitation was found
                                near your current location.

                            </div>

                        )}

                    </article>


                    {/* RELOCATION */}

                    <article className="citizen-panel">

                        <div className="citizen-panel-header">

                            <div>

                                <span>
                                    SAFER RELOCATION
                                </span>

                                <h2>
                                    Recommended site
                                </h2>

                            </div>

                            <Building2 size={20} />

                        </div>


                        {recommendedSite ? (

                            <>

                                <h3 className="site-name">
                                    {recommendedSite.name ||
                                     recommendedSite.siteName ||
                                     "Safer relocation site"}
                                </h3>

                                <div className="citizen-data-grid">

                                    <div>
                                        <span>Distance</span>
                                        <strong>
                                            {recommendedSite.distance != null
                                                ? `${recommendedSite.distance} km`
                                                : "--"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Total capacity</span>
                                        <strong>
                                            {recommendedSite.capacity?.total ??
                                             recommendedSite.totalCapacity ??
                                             "--"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Available</span>
                                        <strong>
                                            {recommendedSite.capacity?.available ??
                                             recommendedSite.availableCapacity ??
                                             "--"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Suitability</span>
                                        <strong>
                                            {recommendedSite.suitabilityScore != null
                                                ? `${recommendedSite.suitabilityScore}%`
                                                : "--"}
                                        </strong>
                                    </div>

                                </div>


                            </>

                        ) : (

                            <div className="citizen-empty">

                                No suitable relocation site is
                                currently available for the assessed
                                population.


                            </div>

                        )}

                    </article>

                </section>


                {/* =================================================
                    MAP
                ================================================= */}

                <section className="citizen-panel citizen-map-panel">

                    <div className="citizen-panel-header">

                        <div>

                            <span>
                                GIS SAFETY INTELLIGENCE
                            </span>

                            <h2>
                                Live risk & relocation map
                            </h2>

                            <p>
                                Hazard zones, vulnerable habitations,
                                safer sites and emergency resources.
                            </p>

                        </div>

                        <MapPin size={21} />

                    </div>

                    <div
                        className="citizen-map-container"
                        style={{ position: "relative" }}
                    >

                        <Map
                            location={location}

                            /*
                             * Citizen-only data.
                             * We are only passing props here; Map.jsx is
                             * NOT being modified, so AuthorityDashboard
                             * remains untouched.
                             */
                            features={mapFeatures}

                            riskZones={citizenRiskZones}

                            hazardZones={citizenHazardZones}

                            alerts={
                                dashboard?.alerts || []
                            }

                            hospitals={
                                dashboard?.hospitals || []
                            }

                            shelters={
                                dashboard?.shelters || []
                            }

                            relocationSites={
                                citizenRelocationSites
                            }

                            showRelocationSites={true}
                        />

                        {selectedCitizenSite && (

                            <div
                                className="citizen-site-popup"
                                style={{
                                    position: "absolute",
                                    top: "16px",
                                    right: "16px",
                                    zIndex: 1000,
                                    width: "320px",
                                    maxWidth: "calc(100% - 32px)",
                                    maxHeight: "calc(100% - 32px)",
                                    overflowY: "auto",
                                    background: "#ffffff",
                                    border: "1px solid #dbe3ef",
                                    borderRadius: "12px",
                                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
                                    padding: "16px",
                                }}
                            >

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        marginBottom: "12px",
                                    }}
                                >

                                    <div>

                                        <div
                                            style={{
                                                fontSize: "17px",
                                                fontWeight: "700",
                                                color: "#172033",
                                                lineHeight: "1.3",
                                            }}
                                        >
                                            {selectedCitizenSite.name ||
                                                selectedCitizenSite.siteName ||
                                                "Safer Site"}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: "12px",
                                                color: "#64748b",
                                                marginTop: "3px",
                                            }}
                                        >
                                            🏠 Recommended Relocation Site
                                        </div>

                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedCitizenSite(null)
                                        }
                                        aria-label="Close safer site information"
                                        style={{
                                            border: "none",
                                            background: "transparent",
                                            color: "#64748b",
                                            fontSize: "20px",
                                            lineHeight: "1",
                                            cursor: "pointer",
                                            padding: "0 2px",
                                        }}
                                    >
                                        ×
                                    </button>

                                </div>


                                <div
                                    style={{
                                        padding: "10px",
                                        marginBottom: "12px",
                                        borderRadius: "8px",
                                        background: "#eef8f1",
                                        border: "1px solid #b9e4c7",
                                    }}
                                >

                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: "#15803d",
                                            fontWeight: "600",
                                            marginBottom: "2px",
                                        }}
                                    >
                                        Suitability Score
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "24px",
                                            fontWeight: "700",
                                            color: "#16a34a",
                                        }}
                                    >
                                        {Number.isFinite(
                                            Number(
                                                selectedCitizenSite.suitabilityScore
                                            )
                                        )
                                            ? `${Number(
                                                selectedCitizenSite.suitabilityScore
                                            ).toFixed(0)}/100`
                                            : "--"}
                                    </div>

                                </div>


                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "10px",
                                        fontSize: "13px",
                                    }}
                                >

                                    <div>
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b",
                                                marginBottom: "3px",
                                            }}
                                        >
                                            Distance
                                        </div>

                                        <strong>
                                            {selectedCitizenSite.distanceKm != null
                                                ? `${Number(
                                                    selectedCitizenSite.distanceKm
                                                ).toFixed(2)} km`
                                                : "--"}
                                        </strong>
                                    </div>


                                    <div>
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b",
                                                marginBottom: "3px",
                                            }}
                                        >
                                            Site ID
                                        </div>

                                        <strong>
                                            {selectedCitizenSite.siteId ||
                                                "--"}
                                        </strong>
                                    </div>


                                    <div>
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b",
                                                marginBottom: "3px",
                                            }}
                                        >
                                            Total Capacity
                                        </div>

                                        <strong>
                                            {selectedCitizenSite.capacity?.total != null
                                                ? Number(
                                                    selectedCitizenSite.capacity.total
                                                ).toLocaleString()
                                                : "--"}
                                        </strong>
                                    </div>


                                    <div>
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b",
                                                marginBottom: "3px",
                                            }}
                                        >
                                            Occupied
                                        </div>

                                        <strong>
                                            {selectedCitizenSite.capacity?.occupied != null
                                                ? Number(
                                                    selectedCitizenSite.capacity.occupied
                                                ).toLocaleString()
                                                : "--"}
                                        </strong>
                                    </div>


                                    <div>
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b",
                                                marginBottom: "3px",
                                            }}
                                        >
                                            Available
                                        </div>

                                        <strong>
                                            {selectedCitizenSite.capacity?.available != null
                                                ? Number(
                                                    selectedCitizenSite.capacity.available
                                                ).toLocaleString()
                                                : selectedCitizenSite.availableCapacity != null
                                                    ? Number(
                                                        selectedCitizenSite.availableCapacity
                                                    ).toLocaleString()
                                                    : "--"}
                                        </strong>
                                    </div>


                                    <div>
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b",
                                                marginBottom: "3px",
                                            }}
                                        >
                                            Can Accommodate
                                        </div>

                                        <strong
                                            style={{
                                                color:
                                                    selectedCitizenSite.canAccommodate === true
                                                        ? "#16a34a"
                                                        : selectedCitizenSite.canAccommodate === false
                                                            ? "#dc2626"
                                                            : "#64748b",
                                            }}
                                        >
                                            {selectedCitizenSite.canAccommodate === true
                                                ? "YES"
                                                : selectedCitizenSite.canAccommodate === false
                                                    ? "NO"
                                                    : "--"}
                                        </strong>
                                    </div>

                                </div>


                                {Array.isArray(
                                    selectedCitizenSite.location?.coordinates
                                ) &&
                                    selectedCitizenSite.location.coordinates.length === 2 && (

                                    <div
                                        style={{
                                            marginTop: "14px",
                                            paddingTop: "12px",
                                            borderTop: "1px solid #e5e7eb",
                                            fontSize: "12px",
                                            color: "#64748b",
                                        }}
                                    >

                                        <strong
                                            style={{
                                                color: "#334155",
                                            }}
                                        >
                                            Location
                                        </strong>

                                        <div style={{ marginTop: "4px" }}>
                                            Latitude:{" "}
                                            {Number(
                                                selectedCitizenSite.location.coordinates[1]
                                            ).toFixed(6)}
                                        </div>

                                        <div>
                                            Longitude:{" "}
                                            {Number(
                                                selectedCitizenSite.location.coordinates[0]
                                            ).toFixed(6)}
                                        </div>

                                    </div>

                                )}

                            </div>

                        )}

                        {selectedCitizenZoneData && (

                            <div
                                className="citizen-zone-popup"
                                style={{
                                    position: "absolute",
                                    top: "16px",
                                    right: "16px",
                                    zIndex: 1000,
                                    width: "320px",
                                    maxWidth: "calc(100% - 32px)",
                                    maxHeight: "calc(100% - 32px)",
                                    overflowY: "auto",
                                    background: "#ffffff",
                                    border: "1px solid #dbe3ef",
                                    borderRadius: "12px",
                                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
                                    padding: "16px",
                                }}
                            >

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        marginBottom: "12px",
                                    }}
                                >

                                    <div>
                                        <div
                                            style={{
                                                fontSize: "17px",
                                                fontWeight: "700",
                                                color: "#172033",
                                                lineHeight: "1.3",
                                            }}
                                        >
                                            {selectedCitizenName}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: "12px",
                                                color: "#64748b",
                                                marginTop: "3px",
                                            }}
                                        >
                                            Habitation / Village
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedCitizenZone(null)
                                        }
                                        aria-label="Close habitation information"
                                        style={{
                                            border: "none",
                                            background: "transparent",
                                            color: "#64748b",
                                            fontSize: "20px",
                                            lineHeight: "1",
                                            cursor: "pointer",
                                            padding: "0 2px",
                                        }}
                                    >
                                        ×
                                    </button>

                                </div>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "10px",
                                    }}
                                >

                                    {selectedCitizenZoneData.population != null && (
                                        <div>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>Population</div>
                                            <strong>{Number(selectedCitizenZoneData.population).toLocaleString()}</strong>
                                        </div>
                                    )}

                                    {selectedCitizenZoneData.riskScore != null && (
                                        <div>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>Risk Score</div>
                                            <strong>{Number(selectedCitizenZoneData.riskScore).toFixed(1)}</strong>
                                        </div>
                                    )}

                                    {selectedCitizenZoneData.riskLevel != null && (
                                        <div>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>Risk Level</div>
                                            <strong>{selectedCitizenZoneData.riskLevel}</strong>
                                        </div>
                                    )}

                                    {selectedCitizenZoneData.vulnerabilityScore != null && (
                                        <div>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>Vulnerability</div>
                                            <strong>{Number(selectedCitizenZoneData.vulnerabilityScore).toFixed(1)}%</strong>
                                        </div>
                                    )}

                                    {selectedCitizenZoneData.relocationPriority != null && (
                                        <div style={{ gridColumn: "1 / -1" }}>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>Relocation Priority</div>
                                            <strong>{selectedCitizenZoneData.relocationPriority}</strong>
                                        </div>
                                    )}

                                </div>

                                {selectedCitizenHasHazards && (
                                    <div
                                        style={{
                                            marginTop: "14px",
                                            paddingTop: "12px",
                                            borderTop: "1px solid #e5e7eb",
                                        }}
                                    >
                                        <div style={{ fontWeight: "700", marginBottom: "8px" }}>⚠ Hazard Scores</div>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px", fontSize: "13px" }}>
                                            {selectedCitizenZoneData.hazards?.flood != null && <span>Flood: <strong>{selectedCitizenZoneData.hazards.flood}</strong></span>}
                                            {selectedCitizenZoneData.hazards?.landslide != null && <span>Landslide: <strong>{selectedCitizenZoneData.hazards.landslide}</strong></span>}
                                            {selectedCitizenZoneData.hazards?.erosion != null && <span>Erosion: <strong>{selectedCitizenZoneData.hazards.erosion}</strong></span>}
                                            {selectedCitizenZoneData.hazards?.cloudburst != null && <span>Cloudburst: <strong>{selectedCitizenZoneData.hazards.cloudburst}</strong></span>}
                                        </div>
                                    </div>
                                )}

                                {selectedCitizenHasCapacity && (
                                    <div
                                        style={{
                                            marginTop: "14px",
                                            paddingTop: "12px",
                                            borderTop: "1px solid #e5e7eb",
                                        }}
                                    >
                                        <div style={{ fontWeight: "700", marginBottom: "8px" }}>🏠 Carrying Capacity</div>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px", fontSize: "13px" }}>
                                            {selectedCitizenZoneData.safeCapacity != null && <span>Safe Capacity: <strong>{Number(selectedCitizenZoneData.safeCapacity).toFixed(0)}</strong></span>}
                                            {selectedCitizenZoneData.capacityRatio != null && <span>Capacity Ratio: <strong>{Number(selectedCitizenZoneData.capacityRatio).toFixed(2)}</strong></span>}
                                            {selectedCitizenZoneData.capacityStatus != null && <span>Capacity Status: <strong>{selectedCitizenZoneData.capacityStatus}</strong></span>}
                                            {selectedCitizenZoneData.shelterCapacity != null && <span>Shelter Capacity: <strong>{Number(selectedCitizenZoneData.shelterCapacity).toLocaleString()}</strong></span>}
                                            {selectedCitizenZoneData.availableWater != null && <span>Available Water: <strong>{Number(selectedCitizenZoneData.availableWater).toLocaleString()}</strong></span>}
                                            {selectedCitizenZoneData.foodStock != null && <span>Food Stock: <strong>{Number(selectedCitizenZoneData.foodStock).toLocaleString()}</strong></span>}
                                            {selectedCitizenZoneData.medicalCapacity != null && <span>Medical Capacity: <strong>{Number(selectedCitizenZoneData.medicalCapacity).toLocaleString()}</strong></span>}
                                        </div>
                                    </div>
                                )}

                                {selectedCitizenHasAssessment && (
                                    <div
                                        style={{
                                            marginTop: "14px",
                                            paddingTop: "12px",
                                            borderTop: "1px solid #e5e7eb",
                                        }}
                                    >
                                        <div style={{ fontWeight: "700", marginBottom: "8px" }}>📋 Assessment</div>

                                        {selectedCitizenZoneData.assessmentStatus != null && (
                                            <div style={{ fontSize: "13px", marginBottom: "5px" }}>
                                                Status: <strong>{selectedCitizenZoneData.assessmentStatus}</strong>
                                            </div>
                                        )}

                                        {selectedCitizenZoneData.lastAssessment != null && (
                                            <div style={{ fontSize: "13px" }}>
                                                Last Assessment: <strong>{new Date(selectedCitizenZoneData.lastAssessment).toLocaleDateString()}</strong>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        )}

                    </div>

                </section>


                {/* =================================================
                    WEATHER
                ================================================= */}

                {dashboard?.weather && (

                    <section className="citizen-panel">

                        <div className="citizen-panel-header">

                            <div>

                                <span>
                                    ENVIRONMENT
                                </span>

                                <h2>
                                    Current conditions
                                </h2>

                            </div>

                            <CloudRain size={21} />

                        </div>

                        <div className="citizen-weather-grid">

                            <div>
                                <span>Rainfall</span>
                                <strong>
                                    {dashboard.weather.rainfall ?? "--"} mm
                                </strong>
                            </div>

                            <div>
                                <span>Temperature</span>
                                <strong>
                                    {dashboard.weather.temperature ?? "--"} °C
                                </strong>
                            </div>

                            <div>
                                <span>Humidity</span>
                                <strong>
                                    {dashboard.weather.humidity ?? "--"}%
                                </strong>
                            </div>

                            <div>
                                <span>River level</span>
                                <strong>
                                    {dashboard.weather.riverLevel ??
                                     dashboard.weather.river_level ??
                                     "--"}
                                </strong>
                            </div>

                        </div>

                    </section>

                )}


                {/* =================================================
                    ALERTS
                ================================================= */}

                <section className="citizen-panel">

                    <div className="citizen-panel-header">

                        <div>

                            <span>
                                LIVE NOTIFICATIONS
                            </span>

                            <h2>
                                Disaster alerts
                            </h2>

                        </div>

                        <Bell size={20} />

                    </div>


                    {dashboard?.alerts?.length > 0 ? (

                        <div className="citizen-alert-list">

                            {dashboard.alerts
                                .slice(0, 5)
                                .map((alert, index) => (

                                    <div
                                        className="citizen-alert-row"
                                        key={
                                            alert._id ||
                                            alert.id ||
                                            index
                                        }
                                    >

                                        <div className="alert-icon">
                                            <AlertTriangle size={17} />
                                        </div>

                                        <div>

                                            <strong>
                                                {alert.title ||
                                                 alert.type ||
                                                 "Disaster alert"}
                                            </strong>

                                            <span>
                                                {alert.message ||
                                                 alert.description ||
                                                 "Emergency information affecting your area."}
                                            </span>

                                        </div>

                                    </div>

                                ))}

                        </div>

                    ) : (

                        <div className="citizen-empty">
                            No active disaster alerts near your location.
                        </div>

                    )}

                </section>


                {/* =================================================
                    SOS
                ================================================= */}

                <section className="citizen-sos-section">

                    <div>

                        <div className="citizen-sos-icon">
                            <Siren size={22} />
                        </div>

                        <div>

                            <span>
                                EMERGENCY
                            </span>

                            <h2>
                                Need immediate assistance?
                            </h2>

                            <p>
                                Send your GPS location and emergency
                                details to the response system.
                            </p>

                        </div>

                    </div>

                    <SOSCard
                        location={location}
                    />

                </section>


                {/* =================================================
                    QUICK ACTIONS REMOVED
                    =================================================
                    Dead routes such as /sos-form, /emergency and
                    /resources are intentionally not rendered here.
                    The real SOS component is already available above.
                */}

            </div>

        </CitizenLayout>
    );
}

export default CitizenDashboard;