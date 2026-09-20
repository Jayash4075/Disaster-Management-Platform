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

    return (

        <div className="dashboard-page">


            <Navbar />


            <main className="dashboard-container">


                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="dashboard-header">

                    <div>

                        <h1>
                            Welcome back, {userName}!
                        </h1>

                        <p>
                            Stay informed and stay safe
                            with ResQ.
                        </p>

                    </div>


                    <button
                        className="location-button"
                        onClick={
                            getCurrentLocation
                        }
                        disabled={
                            locationLoading
                        }
                    >

                        📍{" "}

                        {locationLoading
                            ? "Detecting Location..."
                            : "Use My Current Location"}

                    </button>

                </div>


                {/* =================================================
                    LOCATION STATUS
                ================================================= */}

                <div className="location-status">

                    {locationLoading && (

                        <p>
                            📍 Detecting your current
                            location...
                        </p>

                    )}


                    {locationError && (

                        <div>

                            <p className="location-error">
                                ⚠️ {locationError}
                            </p>

                            <button
                                className="location-button"
                                onClick={
                                    getCurrentLocation
                                }
                            >
                                Try Again
                            </button>

                        </div>

                    )}


                    {location &&
                        !locationLoading && (

                            <div className="location-success">

                                <p>
                                    📍{" "}
                                    <strong>
                                        Location detected
                                    </strong>
                                </p>

                                <p>
                                    Latitude:{" "}
                                    {location.latitude.toFixed(6)}
                                </p>

                                <p>
                                    Longitude:{" "}
                                    {location.longitude.toFixed(6)}
                                </p>

                                <p>
                                    Accuracy: approximately{" "}
                                    {locationAccuracy
                                        ? Math.round(
                                            locationAccuracy
                                        )
                                        : "--"}m
                                </p>

                            </div>

                        )}

                </div>


                {/* =================================================
                    SAFETY STATUS
                ================================================= */}

                <section
                    className={`safety-status-card ${safetyStatus.className}`}
                >

                    <div className="safety-status-icon">

                        {safetyStatus.className ===
                        "critical"
                            ? "🚨"
                            : safetyStatus.className ===
                                "high"
                                ? "⚠️"
                                : safetyStatus.className ===
                                    "moderate"
                                    ? "🟡"
                                    : safetyStatus.className ===
                                        "low"
                                        ? "🟢"
                                        : "ℹ️"}

                    </div>


                    <div className="safety-status-content">

                        <span className="safety-label">
                            CURRENT SAFETY STATUS
                        </span>

                        <h2>
                            {safetyStatus.title}
                        </h2>

                        <p>
                            {safetyStatus.description}
                        </p>

                    </div>


                    {(
                        safetyStatus.className ===
                            "critical" ||
                        safetyStatus.className ===
                            "high"
                    ) && (

                        <button
                            className="relocation-button"
                            onClick={() =>
                                handleQuickAction(
                                    "/safe-routes"
                                )
                            }
                        >
                            View Safe Route
                        </button>

                    )}

                </section>


                {/* =================================================
                    TOP CARDS
                ================================================= */}

                <div className="dashboard-cards">


                    <AlertCard
                        count={
                            dataLoading
                                ? "..."
                                : dashboardData.activeAlerts
                        }
                        title="Active Alerts"
                        subtitle="Near your location"
                    />


                    <div className="dashboard-card">

                        <div className="card-icon">
                            🏥
                        </div>

                        <div>

                            <h3>
                                Nearby Hospitals
                            </h3>

                            <p className="card-number">
                                {dataLoading
                                    ? "..."
                                    : dashboardData.nearbyHospitals}
                            </p>

                            <span>
                                Near your location
                            </span>

                        </div>

                    </div>


                    <div className="dashboard-card">

                        <div className="card-icon">
                            🏠
                        </div>

                        <div>

                            <h3>
                                Nearby Shelters
                            </h3>

                            <p className="card-number">
                                {dataLoading
                                    ? "..."
                                    : dashboardData.nearbyShelters}
                            </p>

                            <span>
                                Near your location
                            </span>

                        </div>

                    </div>


                    <RiskCard
                        riskLevel={
                            dataLoading
                                ? "..."
                                : getRiskLevel()
                        }
                        riskScore={
                            getRiskScore()
                        }
                    />

                </div>


                {/* =================================================
                    VULNERABILITY + RELOCATION
                ================================================= */}

                <div className="sih-intelligence-grid">


                    <section className="dashboard-section vulnerability-section">

                        <div className="section-heading">

                            <div>

                                <span className="section-label">
                                    SIH 191
                                </span>

                                <h2>
                                    Vulnerable Habitation
                                </h2>

                                <p>
                                    Vulnerable communities
                                    near your current location.
                                </p>

                            </div>

                        </div>


                        {currentHabitation ? (

                            <div className="vulnerability-card">

                                <div className="vulnerability-header">

                                    <div>

                                        <span className="small-label">
                                            HABITATION
                                        </span>

                                        <h3>
                                            {currentHabitation.name ||
                                                currentHabitation.village ||
                                                currentHabitation.habitation ||
                                                "Priority Habitation"}
                                        </h3>

                                    </div>


                                    <span
                                        className={`priority-badge ${
                                            String(
                                                currentHabitation.relocationPriority ||
                                                currentHabitation.priority ||
                                                "HIGH"
                                            ).toLowerCase()
                                        }`}
                                    >

                                        {currentHabitation.relocationPriority ||
                                            currentHabitation.priority ||
                                            "HIGH"}

                                    </span>

                                </div>


                                <div className="vulnerability-details">


                                    <div>

                                        <span>
                                            Population
                                        </span>

                                        <strong>
                                            {currentHabitation.population ??
                                                "--"}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Risk Level
                                        </span>

                                        <strong>
                                            {currentHabitation.riskLevel ||
                                                currentHabitation.risk ||
                                                getRiskLevel()}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Vulnerability
                                        </span>

                                        <strong>
                                            {currentHabitation.vulnerabilityScore ??
                                                currentHabitation.vulnerability?.score ??
                                                "--"}
                                        </strong>

                                    </div>

                                </div>


                                <p className="vulnerability-note">

                                    ⚠️ This habitation has
                                    been identified as
                                    potentially vulnerable.

                                </p>

                            </div>

                        ) : (

                            <div className="empty-state">

                                <div>
                                    ✓
                                </div>

                                <p>
                                    No priority vulnerable
                                    habitation has been
                                    returned for your location.
                                </p>

                            </div>

                        )}

                    </section>


                    {/* =================================================
                        RELOCATION
                    ================================================= */}

                    <section className="dashboard-section relocation-section">

                        <div className="section-heading">

                            <div>

                                <span className="section-label">
                                    SIH 191
                                </span>

                                <h2>
                                    Safer Relocation Site
                                </h2>

                                <p>
                                    Recommended safer site
                                    based on available capacity.
                                </p>

                            </div>

                        </div>


                        {recommendedSite ? (

                            <div className="relocation-site-card">

                                <div className="relocation-site-header">

                                    <div>

                                        <span className="small-label">
                                            RECOMMENDED SITE
                                        </span>

                                        <h3>
                                            {recommendedSite.name ||
                                                recommendedSite.siteName ||
                                                "Safer Alternative Site"}
                                        </h3>

                                    </div>


                                    <span className="safe-badge">
                                        SAFE
                                    </span>

                                </div>


                                <div className="relocation-site-info">


                                    <div>

                                        <span>
                                            📍 Distance
                                        </span>

                                        <strong>
                                            {recommendedSite.distance != null
                                                ? `${recommendedSite.distance} km`
                                                : "--"}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Capacity
                                        </span>

                                        <strong>
                                            {getTotalCapacity(
                                                recommendedSite
                                            ) ?? "--"}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Available
                                        </span>

                                        <strong>
                                            {getSiteCapacity(
                                                recommendedSite
                                            ) ?? "--"}
                                        </strong>

                                    </div>

                                </div>


                                {getOccupiedCapacity(
                                    recommendedSite
                                ) !== null && (

                                    <div className="capacity-bar-container">

                                        <div className="capacity-label">

                                            <span>
                                                Occupancy
                                            </span>

                                            <span>

                                                {
                                                    getOccupiedCapacity(
                                                        recommendedSite
                                                    )
                                                }

                                                {" / "}

                                                {
                                                    getTotalCapacity(
                                                        recommendedSite
                                                    ) ??
                                                    "--"
                                                }

                                            </span>

                                        </div>


                                        <div className="capacity-bar">

                                            <div
                                                className="capacity-fill"
                                                style={{
                                                    width:
                                                        getTotalCapacity(
                                                            recommendedSite
                                                        )
                                                            ? `${Math.min(
                                                                100,
                                                                (
                                                                    getOccupiedCapacity(
                                                                        recommendedSite
                                                                    ) /
                                                                    getTotalCapacity(
                                                                        recommendedSite
                                                                    )
                                                                ) *
                                                                100
                                                            )}%`
                                                            : "0%"
                                                }}
                                            />

                                        </div>

                                    </div>

                                )}


                                <button
                                    className="relocation-button full-width"
                                    onClick={() =>
                                        handleQuickAction(
                                            "/safe-routes"
                                        )
                                    }
                                >
                                    🛣️ View Safe Route
                                </button>

                            </div>

                        ) : (

                            <div className="empty-state">

                                <div>
                                    📍
                                </div>

                                <p>
                                    No specific relocation
                                    recommendation is currently
                                    available.
                                </p>

                                <button
                                    className="secondary-action-button"
                                    onClick={() =>
                                        handleQuickAction(
                                            "/shelters"
                                        )
                                    }
                                >
                                    View Nearby Shelters
                                </button>

                            </div>

                        )}

                    </section>

                </div>


                {/* =================================================
                    WEATHER
                ================================================= */}

                {dashboardData.weather && (

                    <div className="dashboard-section">

                        <div className="section-heading">

                            <div>

                                <h2>
                                    Current Environmental Conditions
                                </h2>

                                <p>
                                    Environmental data returned
                                    by the dashboard backend.
                                </p>

                            </div>

                        </div>


                        <div className="dashboard-cards">


                            <div className="dashboard-card">

                                <div className="card-icon">
                                    🌧️
                                </div>

                                <div>

                                    <h3>
                                        Rainfall
                                    </h3>

                                    <p className="card-number">
                                        {dashboardData.weather.rainfall ??
                                            "--"}
                                    </p>

                                    <span>
                                        mm
                                    </span>

                                </div>

                            </div>


                            <div className="dashboard-card">

                                <div className="card-icon">
                                    💧
                                </div>

                                <div>

                                    <h3>
                                        Humidity
                                    </h3>

                                    <p className="card-number">
                                        {dashboardData.weather.humidity ??
                                            "--"}
                                    </p>

                                    <span>
                                        %
                                    </span>

                                </div>

                            </div>


                            <div className="dashboard-card">

                                <div className="card-icon">
                                    🌡️
                                </div>

                                <div>

                                    <h3>
                                        Temperature
                                    </h3>

                                    <p className="card-number">
                                        {dashboardData.weather.temperature ??
                                            "--"}
                                    </p>

                                    <span>
                                        °C
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                )}


                {/* =================================================
                    ML ERROR
                ================================================= */}

                {disasterError && (

                    <div className="location-error">

                        ⚠️ Disaster prediction:

                        {" "}

                        {disasterError}

                    </div>

                )}


                {/* =================================================
                    MAP + SOS
                ================================================= */}

                <div className="map-sos-layout">


                    <section className="dashboard-section map-section">

                        <div className="section-heading">

                            <div>

                                <span className="section-label">
                                    SIH 191
                                </span>

                                <h2>
                                    Live Risk & Relocation Map
                                </h2>

                                <p>
                                    View hazard zones,
                                    vulnerable habitations,
                                    relocation sites and
                                    emergency resources.
                                </p>

                            </div>

                        </div>


                        <Map
                            location={location}
                            alerts={
                                dashboardData.alerts
                            }
                            hospitals={
                                dashboardData.hospitals
                            }
                            shelters={
                                dashboardData.shelters
                            }
                            hazardZones={
                                dashboardData.hazardZones
                            }
                            vulnerableHabitations={
                                dashboardData.vulnerableHabitations
                            }
                            relocationSites={
                                dashboardData.relocationSites
                            }
                        />

                    </section>


                    <section className="dashboard-section sos-section">

                        <SOSCard
                            location={location}
                        />

                    </section>

                </div>


                {/* =================================================
                    QUICK ACTIONS
                ================================================= */}

                <section className="dashboard-section">

                    <h2>
                        Emergency Actions
                    </h2>


                    <div className="quick-actions">


                        <div
                            className="quick-action-wrapper"
                            onClick={() =>
                                handleQuickAction(
                                    "/safe-routes"
                                )
                            }
                        >

                            <QuickActionCard
                                title="Safe Routes"
                                icon="🛣️"
                                path="/safe-routes"
                            />

                        </div>


                        <div
                            className="quick-action-wrapper"
                            onClick={() =>
                                handleQuickAction(
                                    "/hospitals"
                                )
                            }
                        >

                            <QuickActionCard
                                title="Hospitals"
                                icon="🏥"
                                path="/hospitals"
                            />

                        </div>


                        <div
                            className="quick-action-wrapper"
                            onClick={() =>
                                handleQuickAction(
                                    "/shelters"
                                )
                            }
                        >

                            <QuickActionCard
                                title="Safer Sites"
                                icon="🏠"
                                path="/shelters"
                            />

                        </div>


                        <div
                            className="quick-action-wrapper"
                            onClick={() =>
                                handleQuickAction(
                                    "/resources"
                                )
                            }
                        >

                            <QuickActionCard
                                title="Emergency Resources"
                                icon="📦"
                                path="/resources"
                            />

                        </div>


                        <div
                            className="quick-action-wrapper"
                            onClick={() =>
                                handleQuickAction(
                                    "/volunteers"
                                )
                            }
                        >

                            <QuickActionCard
                                title="Volunteers & NGOs"
                                icon="🤝"
                                path="/volunteers"
                            />

                        </div>

                    </div>

                </section>


                {/* =================================================
                    ALERTS
                ================================================= */}

                <section className="dashboard-section">

                    <div className="section-heading">

                        <div>

                            <h2>
                                Disaster Alerts
                            </h2>

                            <p>
                                Alerts affecting your area.
                            </p>

                        </div>

                    </div>


                    <div className="alerts-list">


                        {dashboardData.alerts.length === 0 && (

                            <p className="no-alerts">
                                No active alerts near
                                your location.
                            </p>

                        )}


                        {dashboardData.alerts.map(
                            (alert, index) => (

                                <DisasterAlert
                                    key={
                                        alert._id ||
                                        alert.id ||
                                        index
                                    }
                                    alert={alert}
                                />

                            )
                        )}

                    </div>

                </section>


            </main>

        </div>

    );

}


export default CitizenDashboard;