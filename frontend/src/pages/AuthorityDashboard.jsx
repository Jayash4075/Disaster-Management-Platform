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

import api from "../api/axios";
import Map from "../components/Map";
import AuthoritySidebar from "../components/AuthoritySidebar";
import AuthorityTopbar from "../components/AuthorityTopbar";

import "./AuthorityDashboard.css";


function AuthorityDashboard() {

    // =========================================================
    // SIDEBAR / SEARCH
    // =========================================================

    const [sidebarCollapsed, setSidebarCollapsed] =
        useState(false);

    const [search, setSearch] =
        useState("");


    // =========================================================
    // DASHBOARD DATA
    // =========================================================

    const [dashboardData, setDashboardData] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");


    // =========================================================
    // OPTIONAL INCIDENT / FACILITY DATA
    // =========================================================

    const [alerts, setAlerts] =
        useState([]);

    const [hospitals, setHospitals] =
        useState([]);

    const [shelters, setShelters] =
        useState([]);


    // =========================================================
    // SELECTED INCIDENT
    // =========================================================

    const [selectedAlert, setSelectedAlert] =
        useState(null);


    // =========================================================
    // EXTRACT ARRAY FROM BACKEND RESPONSE
    // =========================================================

    const extractArray = (response) => {

        const data = response?.data;

        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.data)) {
            return data.data;
        }

        if (Array.isArray(data?.items)) {
            return data.items;
        }

        if (Array.isArray(data?.alerts)) {
            return data.alerts;
        }

        if (Array.isArray(data?.hospitals)) {
            return data.hospitals;
        }

        if (Array.isArray(data?.shelters)) {
            return data.shelters;
        }

        return [];
    };


    // =========================================================
    // FETCH AUTHORITY DASHBOARD
    // =========================================================

    const fetchAuthorityDashboard = async () => {

        try {

            setError("");

            const response =
                await api.get(
                    "/api/dashboard/authority"
                );

            if (!response.data) {
                throw new Error(
                    "Empty authority dashboard response."
                );
            }

            setDashboardData(
                response.data
            );

        } catch (err) {

            console.error(
                "Authority dashboard error:",
                err.response?.data || err
            );

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Unable to load authority dashboard."
            );

            setDashboardData(null);

        }

    };


    // =========================================================
    // FETCH INCIDENTS / FACILITIES
    //
    // These are supplementary APIs.
    // If one is unavailable, the main authority dashboard
    // still continues to work.
    // =========================================================

    const fetchSupplementaryData = async () => {

        const results =
            await Promise.allSettled([

                api.get("/api/sos"),

                api.get("/api/shelters"),

            ]);


        // ---------------------------------------------
        // SOS
        // ---------------------------------------------

        if (
            results[0].status === "fulfilled"
        ) {

            const sosData =
                extractArray(
                    results[0].value
                );

            setAlerts(sosData);

        } else {

            console.warn(
                "SOS data unavailable:",
                results[0].reason
            );

            setAlerts([]);

        }


        // ---------------------------------------------
        // SHELTERS
        // ---------------------------------------------

        if (
            results[1].status === "fulfilled"
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

            setShelters([]);

        }


        // ---------------------------------------------
        // Hospitals
        //
        // Hospital data is not part of the new authority
        // dashboard contract, so don't invent hospital data.
        // ---------------------------------------------

        setHospitals([]);

    };


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(() => {

        const loadDashboard = async () => {

            setLoading(true);

            await Promise.all([
                fetchAuthorityDashboard(),
                fetchSupplementaryData(),
            ]);

            setLoading(false);

        };

        loadDashboard();

    }, []);


    // =========================================================
    // REFRESH
    // =========================================================

    const refreshDashboard = async () => {

        setRefreshing(true);

        await Promise.all([
            fetchAuthorityDashboard(),
            fetchSupplementaryData(),
        ]);

        setRefreshing(false);

    };


    // =========================================================
    // BACKEND DATA
    // =========================================================

    const summary =
        dashboardData?.summary || {};


    const riskOverview =
        dashboardData?.riskOverview || {};


    const distribution =
        riskOverview?.distribution || {};


    const dataSource =
        dashboardData?.dataSource || {};


    // =========================================================
    // FILTER INCIDENTS
    // =========================================================

    const filteredAlerts =
        useMemo(() => {

            if (!search.trim()) {
                return alerts;
            }

            const query =
                search.toLowerCase();

            return alerts.filter(
                (alert) =>
                    JSON.stringify(alert)
                        .toLowerCase()
                        .includes(query)
            );

        }, [alerts, search]);


    // =========================================================
    // MAP DATA
    // =========================================================

    const mapFeatures =
        dashboardData?.map?.features || [];


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

        <div
            className={`authority-shell ${
                sidebarCollapsed
                    ? "sidebar-collapsed"
                    : ""
            }`}
        >

            {/* =================================================
                SIDEBAR
            ================================================= */}

            <AuthoritySidebar
                collapsed={sidebarCollapsed}
                onToggle={() =>
                    setSidebarCollapsed(
                        (previous) =>
                            !previous
                    )
                }
            />


            {/* =================================================
                MAIN
            ================================================= */}

            <div className="authority-main">


                {/* =================================================
                    TOPBAR
                ================================================= */}

                <AuthorityTopbar
                    search={search}
                    setSearch={setSearch}
                    onMenuClick={() =>
                        setSidebarCollapsed(
                            (previous) =>
                                !previous
                        )
                    }
                />


                {/* =================================================
                    PAGE
                ================================================= */}

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
                                    habitation risk.
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
                                        No mapped assessed villages
                                        are currently available.
                                    </span>

                                </div>

                            ) : (

                                <Map
                                    location={null}
                                    alerts={alerts}
                                    hospitals={hospitals}
                                    shelters={shelters}
                                    hazardZones={mapFeatures}
                                    vulnerableHabitations={[]}
                                    relocationSites={[]}
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
                                    (alert, index) => (

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

                </main>

            </div>


            {/* =========================================================
                INCIDENT DETAIL MODAL
            ========================================================= */}

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

        </div>
    );
}


export default AuthorityDashboard;