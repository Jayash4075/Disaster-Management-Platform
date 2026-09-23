import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import AlertCard from "../components/AlertCard";
import SOSCard from "../components/SOSCard";
import RiskCard from "../components/RiskCard";
import QuickActionCard from "../components/QuickActionCard";
import DisasterAlert from "../components/DisasterAlert";
import Map from "../components/Map";

import api from "../api/axios";

import "./CitizenDashboard.css";


function CitizenDashboard() {

    const navigate = useNavigate();


    // =====================================================
    // USER
    // =====================================================

    const userName =
        localStorage.getItem("userName") ||
        "Citizen";


    // =====================================================
    // LOCATION
    // =====================================================

    const [location, setLocation] =
        useState(null);

    const [locationLoading, setLocationLoading] =
        useState(true);

    const [locationError, setLocationError] =
        useState("");

    const [locationAccuracy, setLocationAccuracy] =
        useState(null);


    // =====================================================
    // DASHBOARD DATA
    // =====================================================

    const [dashboardData, setDashboardData] =
        useState({
            activeAlerts: 0,
            nearbyHospitals: 0,
            nearbyShelters: 0,
            riskLevel: "Unknown",
            riskScore: 0,

            alerts: [],
            hospitals: [],
            shelters: [],

            hazardZones: [],
            vulnerableHabitations: [],
            relocationSites: [],

            relocationRecommendation: null,

            disasterRisk: null,
            weather: null,
            features: null
        });


    const [dataLoading, setDataLoading] =
        useState(false);

    const [disasterError, setDisasterError] =
        useState("");


    // =====================================================
    // EXTRACT ML RISK
    // =====================================================

    const extractRiskData = (
        disasterRisk
    ) => {

        if (!disasterRisk) {

            return {
                risk: null,
                probability: null
            };

        }


        const risk =
            disasterRisk.risk ??
            disasterRisk.prediction?.risk ??
            null;


        const probability =
            disasterRisk.probability ??
            disasterRisk.prediction?.probability ??
            null;


        return {
            risk,
            probability
        };

    };


    // =====================================================
    // NORMALIZE ARRAY
    // =====================================================

    const normalizeArray = (
        value
    ) => {

        return Array.isArray(value)
            ? value
            : [];

    };


    // =====================================================
    // FETCH DASHBOARD
    // =====================================================

    const fetchDashboardData = async (
        latitude,
        longitude
    ) => {

        try {

            setDataLoading(true);

            setDisasterError("");


            console.log(
                "Fetching citizen dashboard for:",
                latitude,
                longitude
            );


            // Axios interceptor in api/axios.js
            // automatically attaches the token.

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


            const data =
                response.data;


            if (!data) {

                throw new Error(
                    "Empty response received from backend."
                );

            }


            console.log(
                "Citizen dashboard data:",
                data
            );


            // =================================================
            // ML RISK
            // =================================================

            const disasterRisk =
                data.disasterRisk ||
                null;


            const {
                risk,
                probability
            } =
                extractRiskData(
                    disasterRisk
                );


            let riskScore = 0;


            if (
                probability !== null &&
                probability !== undefined
            ) {

                const numericProbability =
                    Number(
                        probability
                    );


                if (
                    Number.isFinite(
                        numericProbability
                    )
                ) {

                    riskScore =
                        Math.round(
                            Math.max(
                                0,
                                Math.min(
                                    1,
                                    numericProbability
                                )
                            ) * 100
                        );

                }

            }


            const finalRisk =
                risk ||
                data.riskLevel ||
                "Unknown";


            // =================================================
            // SAVE DATA
            // =================================================

            setDashboardData({

                activeAlerts:
                    data.activeAlerts ??
                    0,

                nearbyHospitals:
                    data.nearbyHospitals ??
                    0,

                nearbyShelters:
                    data.nearbyShelters ??
                    0,

                riskLevel:
                    finalRisk,

                riskScore,

                alerts:
                    normalizeArray(
                        data.alerts
                    ),

                hospitals:
                    normalizeArray(
                        data.hospitals
                    ),

                shelters:
                    normalizeArray(
                        data.shelters
                    ),


                // SIH 191

                hazardZones:
                    normalizeArray(
                        data.hazardZones
                    ),

                vulnerableHabitations:
                    normalizeArray(
                        data.vulnerableHabitations
                    ),

                relocationSites:
                    normalizeArray(
                        data.relocationSites
                    ),

                relocationRecommendation:
                    data.relocationRecommendation ||
                    data.recommendedRelocationSite ||
                    null,


                disasterRisk,

                weather:
                    data.weather ||
                    null,

                features:
                    data.features ||
                    null

            });


            // =================================================
            // ML ERROR
            // =================================================

            if (
                disasterRisk &&
                disasterRisk.success === false
            ) {

                setDisasterError(
                    disasterRisk.message ||
                    disasterRisk.error ||
                    "Disaster prediction failed."
                );

            } else {

                setDisasterError("");

            }


            console.log(
                "Final citizen risk:",
                finalRisk
            );

            console.log(
                "Risk probability:",
                probability
            );

            console.log(
                "Risk score:",
                riskScore
            );

        } catch (error) {

            console.error(
                "Citizen dashboard API error:",
                error.response?.data ||
                error
            );


            const backendError =
                error.response?.data;


            setDisasterError(
                backendError?.message ||
                backendError?.error ||
                error.message ||
                "Unable to load dashboard data."
            );


            setDashboardData({

                activeAlerts: 0,

                nearbyHospitals: 0,

                nearbyShelters: 0,

                riskLevel: "Unavailable",

                riskScore: 0,

                alerts: [],

                hospitals: [],

                shelters: [],

                hazardZones: [],

                vulnerableHabitations: [],

                relocationSites: [],

                relocationRecommendation: null,

                disasterRisk: null,

                weather: null,

                features: null

            });

        } finally {

            setDataLoading(false);

        }

    };


    // =====================================================
    // GET CURRENT LOCATION
    // =====================================================

    const getCurrentLocation = () => {

        console.log(
            "Requesting current location..."
        );


        setLocationLoading(true);

        setLocationError("");

        setLocationAccuracy(null);

        setDisasterError("");


        if (
            !navigator.geolocation
        ) {

            setLocationError(
                "Geolocation is not supported by your browser."
            );

            setLocationLoading(false);

            return;

        }


        navigator.geolocation.getCurrentPosition(

            // =================================================
            // SUCCESS
            // =================================================

            (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                const accuracy =
                    position.coords.accuracy;


                console.log(
                    "Location received:",
                    latitude,
                    longitude
                );


                setLocation({

                    latitude,

                    longitude

                });


                setLocationAccuracy(
                    accuracy
                );


                setLocationLoading(
                    false
                );

            },


            // =================================================
            // ERROR
            // =================================================

            (error) => {

                console.error(
                    "Geolocation error:",
                    error
                );


                setLocationLoading(
                    false
                );


                switch (
                    error.code
                ) {

                    case error.PERMISSION_DENIED:

                        setLocationError(
                            "Location permission denied. Please allow location access in your browser."
                        );

                        break;


                    case error.POSITION_UNAVAILABLE:

                        setLocationError(
                            "Your location is currently unavailable. Please check your device's location settings."
                        );

                        break;


                    case error.TIMEOUT:

                        setLocationError(
                            "Location request timed out. Please try again."
                        );

                        break;


                    default:

                        setLocationError(
                            "Unable to determine your current location."
                        );

                }

            },


            // =================================================
            // OPTIONS
            // =================================================

            {

                enableHighAccuracy:
                    true,

                timeout:
                    30000,

                maximumAge:
                    0

            }

        );

    };


    // =====================================================
    // WHEN LOCATION CHANGES -> FETCH BACKEND
    // =====================================================

    useEffect(() => {

        if (!location) {
            return;
        }


        fetchDashboardData(
            location.latitude,
            location.longitude
        );

    }, [location]);


    // =====================================================
    // INITIAL LOCATION
    // =====================================================

    useEffect(() => {

        getCurrentLocation();

    }, []);


    // =====================================================
    // QUICK ACTION
    // =====================================================

    const handleQuickAction = (
        path
    ) => {

        navigate(path);

    };


    // =====================================================
    // RISK SCORE
    // =====================================================

    const getRiskScore = () => {

        if (dataLoading) {
            return 0;
        }


        if (
            dashboardData.riskScore
        ) {

            return Number(
                dashboardData.riskScore
            ) || 0;

        }


        const {
            probability
        } =
            extractRiskData(
                dashboardData.disasterRisk
            );


        if (
            probability !== null &&
            probability !== undefined
        ) {

            const numericProbability =
                Number(
                    probability
                );


            if (
                Number.isFinite(
                    numericProbability
                )
            ) {

                return Math.round(
                    Math.max(
                        0,
                        Math.min(
                            1,
                            numericProbability
                        )
                    ) * 100
                );

            }

        }


        return 0;

    };


    // =====================================================
    // RISK LEVEL
    // =====================================================

    const getRiskLevel = () => {

        if (dataLoading) {
            return "Loading...";
        }


        const {
            risk
        } =
            extractRiskData(
                dashboardData.disasterRisk
            );


        if (risk) {

            return String(
                risk
            ).toUpperCase();

        }


        if (
            dashboardData.riskLevel &&
            dashboardData.riskLevel !==
                "Unknown"
        ) {

            return String(
                dashboardData.riskLevel
            ).toUpperCase();

        }


        return "UNKNOWN";

    };


    // =====================================================
    // SAFETY STATUS
    // =====================================================

    const getSafetyStatus = () => {

        const risk =
            getRiskLevel();


        if (
            risk === "CRITICAL"
        ) {

            return {

                title:
                    "Immediate Relocation Recommended",

                description:
                    "Your current location has been identified as a critical-risk area. Follow instructions from authorities and move toward a designated safer site when advised.",

                className:
                    "critical"

            };

        }


        if (
            risk === "HIGH" ||
            risk === "ORANGE"
        ) {

            return {

                title:
                    "High Risk Area",

                description:
                    "Your current location shows elevated disaster risk. Stay alert and be prepared to relocate if instructed.",

                className:
                    "high"

            };

        }


        if (
            risk === "MEDIUM" ||
            risk === "MODERATE" ||
            risk === "YELLOW"
        ) {

            return {

                title:
                    "Moderate Risk Area",

                description:
                    "Monitor disaster alerts and remain prepared to move if conditions worsen.",

                className:
                    "moderate"

            };

        }


        if (
            risk === "LOW" ||
            risk === "GREEN"
        ) {

            return {

                title:
                    "Relatively Safer Area",

                description:
                    "The current assessment shows comparatively lower predicted disaster risk.",

                className:
                    "low"

            };

        }


        return {

            title:
                "Safety Status Unavailable",

            description:
                "Risk information is currently unavailable. Continue monitoring official disaster alerts.",

            className:
                "unknown"

        };

    };


    const safetyStatus =
        getSafetyStatus();


    // =====================================================
    // VULNERABLE HABITATION
    // =====================================================

    const currentHabitation =
        dashboardData
            .vulnerableHabitations
            .length > 0
            ? dashboardData
                .vulnerableHabitations[0]
            : null;


    // =====================================================
    // RELOCATION SITE
    // =====================================================

    const recommendedSite =
        dashboardData
            .relocationRecommendation ||
        (
            dashboardData
                .relocationSites
                .length > 0
                ? dashboardData
                    .relocationSites[0]
                : null
        );


    // =====================================================
    // CAPACITY HELPERS
    // =====================================================

    const getSiteCapacity = (
        site
    ) => {

        if (!site) {
            return null;
        }

        return (
            site.availableCapacity ??
            site.available ??
            site.capacityAvailable ??
            site.capacity?.available ??
            null
        );

    };


    const getTotalCapacity = (
        site
    ) => {

        if (!site) {
            return null;
        }

        return (
            site.totalCapacity ??
            site.capacity?.total ??
            site.capacity ??
            null
        );

    };


    const getOccupiedCapacity = (
        site
    ) => {

        if (!site) {
            return null;
        }

        return (
            site.occupiedCapacity ??
            site.occupied ??
            site.capacity?.occupied ??
            null
        );

    };


    // =====================================================
    // RENDER
    // =====================================================

        // ... (everything above `return (` is unchanged — keep as-is)

    return (

        <div className="dashboard-page">

            <Navbar />

            <main className="dashboard-container">

                {/* ============================================= */}
                {/* HEADER */}
                {/* ============================================= */}

                <header className="db-header">

                    <div>
                        <h1>Welcome back, {userName}</h1>
                        <p>Here's what's happening around you right now.</p>
                    </div>

                    <button
                        className="btn-location"
                        onClick={getCurrentLocation}
                        disabled={locationLoading}
                    >
                        📍 {locationLoading ? "Detecting location…" : "Use my current location"}
                    </button>

                </header>

                {(locationLoading || locationError || location) && (
                    <div className="db-location-strip">

                        {locationLoading && (
                            <p>Detecting your current location…</p>
                        )}

                        {locationError && (
                            <div className="db-location-error">
                                <p>⚠️ {locationError}</p>
                                <button onClick={getCurrentLocation}>Try again</button>
                            </div>
                        )}

                        {location && !locationLoading && (
                            <p>
                                📍 Location detected — accuracy ≈{" "}
                                {locationAccuracy ? Math.round(locationAccuracy) : "--"}m
                            </p>
                        )}

                    </div>
                )}

                {/* ============================================= */}
                {/* HERO: SAFETY STATUS + RISK SCORE (one unit) */}
                {/* ============================================= */}

                <section className={`db-hero db-hero--${safetyStatus.className}`}>

                    <div className="db-hero-top">

                        <div className="db-hero-icon">
                            {safetyStatus.className === "critical" ? "🚨"
                                : safetyStatus.className === "high" ? "⚠️"
                                : safetyStatus.className === "moderate" ? "🟡"
                                : safetyStatus.className === "low" ? "🟢"
                                : "ℹ️"}
                        </div>

                        <div className="db-hero-text">
                            <span className="db-hero-label">Current safety status</span>
                            <h2>{safetyStatus.title}</h2>
                            <p>{safetyStatus.description}</p>
                        </div>

                        {(safetyStatus.className === "critical" || safetyStatus.className === "high") && (
                            <button
                                className="btn-primary-inverse"
                                onClick={() => handleQuickAction("/safe-routes")}
                            >
                                View safe route
                            </button>
                        )}

                    </div>

                    <div className="db-hero-score">
                        <div className="db-hero-score-row">
                            <span>Risk score</span>
                            <strong>{dataLoading ? "…" : `${getRiskScore()}/100`}</strong>
                        </div>
                        <div className="db-score-track">
                            <div
                                className="db-score-fill"
                                style={{ width: `${dataLoading ? 0 : getRiskScore()}%` }}
                            />
                        </div>
                        <span className="db-hero-caption">
                            Based on current disaster and environmental conditions in your area.
                        </span>
                    </div>

                    {disasterError && (
                        <p className="db-hero-note">⚠️ {disasterError}</p>
                    )}

                </section>

                {/* ============================================= */}
                {/* SOS — always visible, one tap away */}
                {/* ============================================= */}

                <section className="db-sos-strip">
                    <SOSCard location={location} />
                </section>

                {/* ============================================= */}
                {/* HELP NEARBY */}
                {/* ============================================= */}

                <section className="db-section">

                    <div className="db-section-heading">
                        <h2>Help near you</h2>
                        <p>Live counts for your current location.</p>
                    </div>

                    <div className="db-stat-row">

                        <div className="db-stat-tile">
                            <span className="db-stat-icon">⚠️</span>
                            <strong>{dataLoading ? "…" : dashboardData.activeAlerts}</strong>
                            <span>Active alerts</span>
                        </div>

                        <div className="db-stat-tile">
                            <span className="db-stat-icon">🏥</span>
                            <strong>{dataLoading ? "…" : dashboardData.nearbyHospitals}</strong>
                            <span>Nearby hospitals</span>
                        </div>

                        <div className="db-stat-tile">
                            <span className="db-stat-icon">🏠</span>
                            <strong>{dataLoading ? "…" : dashboardData.nearbyShelters}</strong>
                            <span>Nearby shelters</span>
                        </div>

                    </div>

                </section>

                {/* ============================================= */}
                {/* WHERE SHOULD I GO */}
                {/* ============================================= */}

                <section className="db-section">

                    <div className="db-section-heading">
                        <h2>Where should I go?</h2>
                        <p>Your area's risk profile and the nearest recommended safer site.</p>
                    </div>

                    <div className="db-go-grid">

                        {/* --- Area risk profile --- */}
                        <div className="db-card">

                            <span className="db-card-kicker">Your area</span>

                            {currentHabitation ? (
                                <>
                                    <div className="db-card-title-row">
                                        <h3>
                                            {currentHabitation.name ||
                                                currentHabitation.village ||
                                                currentHabitation.habitation ||
                                                "Nearest assessed area"}
                                        </h3>
                                        <span
                                            className={`db-badge db-badge--${String(
                                                currentHabitation.relocationPriority ||
                                                currentHabitation.priority ||
                                                "monitor"
                                            ).toLowerCase()}`}
                                        >
                                            {currentHabitation.relocationPriority ||
                                                currentHabitation.priority ||
                                                "MONITOR"}
                                        </span>
                                    </div>

                                    <div className="db-card-stats">
                                        <div>
                                            <span>Population</span>
                                            <strong>{currentHabitation.population ?? "--"}</strong>
                                        </div>
                                        <div>
                                            <span>Risk level</span>
                                            <strong>
                                                {currentHabitation.riskLevel ||
                                                    currentHabitation.risk ||
                                                    getRiskLevel()}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Vulnerability</span>
                                            <strong>
                                                {currentHabitation.vulnerabilityScore ??
                                                    currentHabitation.vulnerability?.score ??
                                                    "--"}
                                            </strong>
                                        </div>
                                    </div>

                                    <p className="db-card-note">
                                        This area has been flagged as potentially vulnerable —
                                        keep an eye on alerts below.
                                    </p>
                                </>
                            ) : (
                                <p className="db-card-empty">
                                    No assessed area found near your location yet.
                                </p>
                            )}

                        </div>

                        {/* --- Recommended relocation site --- */}
                        <div className="db-card">

                            <span className="db-card-kicker">Recommended site</span>

                            {recommendedSite ? (
                                <>
                                    <div className="db-card-title-row">
                                        <h3>
                                            {recommendedSite.name ||
                                                recommendedSite.siteName ||
                                                "Safer alternative site"}
                                        </h3>
                                        <span className="db-badge db-badge--safe">SAFE</span>
                                    </div>

                                    <div className="db-card-stats">
                                        <div>
                                            <span>Distance</span>
                                            <strong>
                                                {recommendedSite.distance != null
                                                    ? `${recommendedSite.distance} km`
                                                    : "--"}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Capacity</span>
                                            <strong>{getTotalCapacity(recommendedSite) ?? "--"}</strong>
                                        </div>
                                        <div>
                                            <span>Available</span>
                                            <strong>{getSiteCapacity(recommendedSite) ?? "--"}</strong>
                                        </div>
                                    </div>

                                    {getOccupiedCapacity(recommendedSite) !== null && (
                                        <div className="db-score-track db-score-track--small">
                                            <div
                                                className="db-score-fill"
                                                style={{
                                                    width: getTotalCapacity(recommendedSite)
                                                        ? `${Math.min(
                                                            100,
                                                            (getOccupiedCapacity(recommendedSite) /
                                                                getTotalCapacity(recommendedSite)) * 100
                                                        )}%`
                                                        : "0%"
                                                }}
                                            />
                                        </div>
                                    )}

                                    <button
                                        className="btn-primary full-width"
                                        onClick={() => handleQuickAction("/safe-routes")}
                                    >
                                        View safe route
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="db-card-empty">
                                        No recommended site near you yet.
                                    </p>
                                    <button
                                        className="btn-secondary full-width"
                                        onClick={() => handleQuickAction("/shelters")}
                                    >
                                        Browse nearby shelters
                                    </button>
                                </>
                            )}

                        </div>

                    </div>

                </section>

                {/* ============================================= */}
                {/* MAP */}
                {/* ============================================= */}

                <section className="db-section">

                    <div className="db-section-heading">
                        <h2>Live risk & relocation map</h2>
                        <p>Hazard zones, vulnerable areas, safe sites and emergency resources.</p>
                    </div>

                    <div className="db-card db-card--flush">
                        <Map
                            location={location}
                            alerts={dashboardData.alerts}
                            hospitals={dashboardData.hospitals}
                            shelters={dashboardData.shelters}
                            hazardZones={dashboardData.hazardZones}
                            vulnerableHabitations={dashboardData.vulnerableHabitations}
                            relocationSites={dashboardData.relocationSites}
                        />
                    </div>

                </section>

                {/* ============================================= */}
                {/* QUICK ACTIONS */}
                {/* ============================================= */}

                <section className="db-section">

                    <div className="db-section-heading">
                        <h2>More ways to get help</h2>
                    </div>

                    <div className="db-actions-grid">

                        {[
                            { title: "Safe Routes", icon: "🛣️", path: "/safe-routes" },
                            { title: "Hospitals", icon: "🏥", path: "/hospitals" },
                            { title: "Safer Sites", icon: "🏠", path: "/shelters" },
                            { title: "Emergency Resources", icon: "📦", path: "/resources" },
                            { title: "Volunteers & NGOs", icon: "🤝", path: "/volunteers" }
                        ].map((action) => (
                            <button
                                key={action.path}
                                className="db-action-card"
                                onClick={() => handleQuickAction(action.path)}
                            >
                                <span className="db-action-icon">{action.icon}</span>
                                <span>{action.title}</span>
                            </button>
                        ))}

                    </div>

                </section>

                {/* ============================================= */}
                {/* ENVIRONMENTAL CONDITIONS (secondary — kept low-priority) */}
                {/* ============================================= */}

                {dashboardData.weather && (
                    <section className="db-section">

                        <div className="db-section-heading">
                            <h2>Environmental conditions</h2>
                            <p>Latest readings for your area.</p>
                        </div>

                        <div className="db-stat-row">
                            <div className="db-stat-tile">
                                <span className="db-stat-icon">🌧️</span>
                                <strong>{dashboardData.weather.rainfall ?? "--"}</strong>
                                <span>Rainfall (mm)</span>
                            </div>
                            <div className="db-stat-tile">
                                <span className="db-stat-icon">💧</span>
                                <strong>{dashboardData.weather.humidity ?? "--"}</strong>
                                <span>Humidity (%)</span>
                            </div>
                            <div className="db-stat-tile">
                                <span className="db-stat-icon">🌡️</span>
                                <strong>{dashboardData.weather.temperature ?? "--"}</strong>
                                <span>Temperature (°C)</span>
                            </div>
                        </div>

                    </section>
                )}

                {/* ============================================= */}
                {/* ALERTS */}
                {/* ============================================= */}

                <section className="db-section">

                    <div className="db-section-heading">
                        <h2>Disaster alerts</h2>
                        <p>Updates affecting your area, most recent first.</p>
                    </div>

                    <div className="db-alerts-list">

                        {dashboardData.alerts.length === 0 && (
                            <p className="db-card-empty">No active alerts near your location.</p>
                        )}

                        {dashboardData.alerts.map((alert, index) => (
                            <DisasterAlert key={alert._id || alert.id || index} alert={alert} />
                        ))}

                    </div>

                </section>

            </main>

        </div>

    );

}

export default CitizenDashboard;