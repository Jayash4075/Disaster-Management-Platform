import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    MapPin,
    ShieldCheck,
    Users,
    Building2,
    Navigation,
    Search,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
} from "lucide-react";

import AuthoritySidebar from "../components/AuthoritySidebar";
import AuthorityTopbar from "../components/AuthorityTopbar";

import "./SafeSites.css";

const API_ENDPOINT = "/api/safe-sites";

const SafeSites = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [safeSites, setSafeSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchSafeSites = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(API_ENDPOINT);

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch safe sites (${response.status})`
                );
            }

            const data = await response.json();

            /*
             * Supports either:
             *
             * [
             *   {...},
             *   {...}
             * ]
             *
             * OR
             *
             * {
             *   safeSites: [...]
             * }
             */

            const sites = Array.isArray(data)
                ? data
                : data.safeSites || data.sites || data.data || [];

            setSafeSites(sites);
        } catch (err) {
            console.error("Safe sites error:", err);
            setError(err.message || "Unable to load safe sites.");
            setSafeSites([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSafeSites();
    }, []);

    /*
     * Normalize backend values.
     * This does NOT create data.
     * It only allows the UI to work with slightly different
     * backend field names.
     */

    const getSiteName = (site) =>
        site.name ||
        site.siteName ||
        site.safeSiteName ||
        site.locationName ||
        "Unnamed Safe Site";

    const getLocation = (site) =>
        site.location ||
        site.address ||
        site.area ||
        site.village ||
        site.district ||
        "Location unavailable";

    const getCapacity = (site) =>
        site.capacity ??
        site.maxCapacity ??
        site.totalCapacity ??
        null;

    const getOccupancy = (site) =>
        site.occupancy ??
        site.currentOccupancy ??
        site.occupied ??
        null;

    const getType = (site) =>
        site.type ||
        site.siteType ||
        site.category ||
        "Safe Site";

    const getStatus = (site) =>
        String(site.status || "unknown").toLowerCase();

    const getCoordinates = (site) => {
        const latitude =
            site.latitude ??
            site.lat ??
            site.coordinates?.latitude ??
            site.coordinates?.lat;

        const longitude =
            site.longitude ??
            site.lng ??
            site.lon ??
            site.coordinates?.longitude ??
            site.coordinates?.lng ??
            site.coordinates?.lon;

        if (latitude == null || longitude == null) {
            return null;
        }

        return {
            latitude,
            longitude,
        };
    };

    const getAvailableCapacity = (site) => {
        const capacity = getCapacity(site);
        const occupancy = getOccupancy(site);

        if (capacity == null || occupancy == null) {
            return null;
        }

        return Math.max(Number(capacity) - Number(occupancy), 0);
    };

    /*
     * Filter only data received from backend.
     */

    const filteredSites = safeSites.filter((site) => {
        const name = getSiteName(site).toLowerCase();
        const location = getLocation(site).toLowerCase();
        const status = getStatus(site);

        const matchesSearch =
            name.includes(searchTerm.toLowerCase()) ||
            location.includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "all" ||
            status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    /*
     * Calculate dashboard statistics from backend data.
     */

    const totalSites = safeSites.length;

    const operationalSites = safeSites.filter((site) => {
        const status = getStatus(site);

        return (
            status === "active" ||
            status === "operational" ||
            status === "available"
        );
    }).length;

    const unavailableSites = safeSites.filter((site) => {
        const status = getStatus(site);

        return (
            status === "inactive" ||
            status === "unavailable" ||
            status === "closed"
        );
    }).length;

    const totalCapacity = safeSites.reduce((sum, site) => {
        const capacity = getCapacity(site);

        return capacity != null
            ? sum + Number(capacity)
            : sum;
    }, 0);

    const totalOccupancy = safeSites.reduce((sum, site) => {
        const occupancy = getOccupancy(site);

        return occupancy != null
            ? sum + Number(occupancy)
            : sum;
    }, 0);

    const getStatusClass = (status) => {
        if (
            status === "active" ||
            status === "operational" ||
            status === "available"
        ) {
            return "status-active";
        }

        if (
            status === "inactive" ||
            status === "unavailable" ||
            status === "closed"
        ) {
            return "status-inactive";
        }

        if (
            status === "maintenance" ||
            status === "pending"
        ) {
            return "status-warning";
        }

        return "status-unknown";
    };

    const getStatusLabel = (status) => {
        if (!status || status === "unknown") {
            return "Unknown";
        }

        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const openMap = (site) => {
        const coordinates = getCoordinates(site);

        if (!coordinates) {
            return;
        }

        const url = `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;

        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="authority-layout">

            {/* SIDEBAR */}

            <AuthoritySidebar
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
            />

            {/* MAIN AREA */}

            <div
                className={`authority-main ${
                    sidebarCollapsed ? "sidebar-collapsed" : ""
                }`}
            >

                <AuthorityTopbar />

                <main className="safe-sites-page">

                    {/* HEADER */}

                    <motion.section
                        className="safe-sites-header"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div>

                            <div className="safe-sites-breadcrumb">
                                Authority Dashboard
                                <span>/</span>
                                Safe Sites
                            </div>

                            <h1>Safe Sites</h1>

                            <p>
                                Monitor identified safe locations available
                                for evacuation and population relocation.
                            </p>

                        </div>

                        <button
                            className="refresh-button"
                            onClick={fetchSafeSites}
                            disabled={loading}
                        >
                            <RefreshCw
                                size={17}
                                className={loading ? "spin" : ""}
                            />

                            Refresh
                        </button>

                    </motion.section>


                    {/* ERROR */}

                    {error && (
                        <motion.div
                            className="safe-sites-error"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <AlertCircle size={19} />

                            <div>
                                <strong>
                                    Unable to load safe sites
                                </strong>

                                <span>
                                    {error}
                                </span>
                            </div>

                            <button onClick={fetchSafeSites}>
                                Retry
                            </button>
                        </motion.div>
                    )}


                    {/* STAT CARDS */}

                    <section className="safe-sites-stats">

                        <motion.div
                            className="safe-stat-card"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="safe-stat-icon blue">
                                <ShieldCheck size={21} />
                            </div>

                            <div>
                                <span>Total Safe Sites</span>

                                <strong>
                                    {loading ? "—" : totalSites}
                                </strong>

                                <small>
                                    Identified locations
                                </small>
                            </div>
                        </motion.div>


                        <motion.div
                            className="safe-stat-card"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="safe-stat-icon green">
                                <CheckCircle2 size={21} />
                            </div>

                            <div>
                                <span>Operational</span>

                                <strong>
                                    {loading ? "—" : operationalSites}
                                </strong>

                                <small>
                                    Currently available
                                </small>
                            </div>
                        </motion.div>


                        <motion.div
                            className="safe-stat-card"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="safe-stat-icon orange">
                                <Users size={21} />
                            </div>

                            <div>
                                <span>Current Occupancy</span>

                                <strong>
                                    {loading
                                        ? "—"
                                        : totalOccupancy.toLocaleString()}
                                </strong>

                                <small>
                                    People currently accommodated
                                </small>
                            </div>
                        </motion.div>


                        <motion.div
                            className="safe-stat-card"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="safe-stat-icon purple">
                                <Building2 size={21} />
                            </div>

                            <div>
                                <span>Total Capacity</span>

                                <strong>
                                    {loading
                                        ? "—"
                                        : totalCapacity.toLocaleString()}
                                </strong>

                                <small>
                                    Combined site capacity
                                </small>
                            </div>
                        </motion.div>

                    </section>


                    {/* SEARCH / FILTER */}

                    <section className="safe-sites-controls">

                        <div className="search-box">

                            <Search size={18} />

                            <input
                                type="text"
                                placeholder="Search safe sites or locations..."
                                value={searchTerm}
                                onChange={(e) =>
                                    setSearchTerm(e.target.value)
                                }
                            />

                        </div>


                        <select
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(e.target.value)
                            }
                        >
                            <option value="all">
                                All Status
                            </option>

                            <option value="active">
                                Active
                            </option>

                            <option value="operational">
                                Operational
                            </option>

                            <option value="available">
                                Available
                            </option>

                            <option value="maintenance">
                                Maintenance
                            </option>

                            <option value="inactive">
                                Inactive
                            </option>

                            <option value="closed">
                                Closed
                            </option>
                        </select>

                    </section>


                    {/* SAFE SITE CONTENT */}

                    <section className="safe-sites-content">

                        <div className="safe-sites-panel">

                            <div className="safe-panel-header">

                                <div>
                                    <h2>
                                        Identified Safe Sites
                                    </h2>

                                    <p>
                                        Locations retrieved from the
                                        TerraShield backend.
                                    </p>
                                </div>

                                {!loading && (
                                    <span className="site-count">
                                        {filteredSites.length} sites
                                    </span>
                                )}

                            </div>


                            {/* LOADING */}

                            {loading && (
                                <div className="safe-sites-loading">

                                    <RefreshCw
                                        size={28}
                                        className="spin"
                                    />

                                    <p>
                                        Loading safe-site information...
                                    </p>

                                </div>
                            )}


                            {/* EMPTY */}

                            {!loading &&
                                !error &&
                                filteredSites.length === 0 && (
                                    <div className="safe-sites-empty">

                                        <div className="empty-site-icon">
                                            <ShieldCheck size={28} />
                                        </div>

                                        <h3>
                                            No safe sites found
                                        </h3>

                                        <p>
                                            No safe-site records were
                                            returned by the backend for
                                            the current filters.
                                        </p>

                                    </div>
                                )}


                            {/* SITE CARDS */}

                            {!loading &&
                                filteredSites.length > 0 && (
                                    <div className="safe-sites-list">

                                        {filteredSites.map(
                                            (site, index) => {

                                                const name =
                                                    getSiteName(site);

                                                const location =
                                                    getLocation(site);

                                                const capacity =
                                                    getCapacity(site);

                                                const occupancy =
                                                    getOccupancy(site);

                                                const available =
                                                    getAvailableCapacity(
                                                        site
                                                    );

                                                const status =
                                                    getStatus(site);

                                                const coordinates =
                                                    getCoordinates(site);

                                                const occupancyPercentage =
                                                    capacity &&
                                                    occupancy != null
                                                        ? Math.min(
                                                              (
                                                                  Number(
                                                                      occupancy
                                                                  ) /
                                                                  Number(
                                                                      capacity
                                                                  )
                                                              ) *
                                                                  100,
                                                              100
                                                          )
                                                        : null;

                                                return (
                                                    <motion.article
                                                        className="safe-site-card"
                                                        key={
                                                            site._id ||
                                                            site.id ||
                                                            index
                                                        }
                                                        initial={{
                                                            opacity: 0,
                                                            y: 10,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            y: 0,
                                                        }}
                                                        transition={{
                                                            delay:
                                                                index *
                                                                0.04,
                                                        }}
                                                    >

                                                        {/* CARD TOP */}

                                                        <div className="site-card-top">

                                                            <div className="site-title-area">

                                                                <div className="site-icon">
                                                                    <ShieldCheck
                                                                        size={
                                                                            20
                                                                        }
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <h3>
                                                                        {
                                                                            name
                                                                        }
                                                                    </h3>

                                                                    <div className="site-location">

                                                                        <MapPin
                                                                            size={
                                                                                14
                                                                            }
                                                                        />

                                                                        <span>
                                                                            {
                                                                                location
                                                                            }
                                                                        </span>

                                                                    </div>
                                                                </div>

                                                            </div>


                                                            <span
                                                                className={`site-status ${getStatusClass(
                                                                    status
                                                                )}`}
                                                            >

                                                                {status ===
                                                                    "active" ||
                                                                status ===
                                                                    "operational" ||
                                                                status ===
                                                                    "available" ? (
                                                                    <CheckCircle2
                                                                        size={
                                                                            13
                                                                        }
                                                                    />
                                                                ) : status ===
                                                                  "maintenance" ||
                                                                  status ===
                                                                      "pending" ? (
                                                                    <Clock
                                                                        size={
                                                                            13
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <XCircle
                                                                        size={
                                                                            13
                                                                        }
                                                                    />
                                                                )}

                                                                {getStatusLabel(
                                                                    status
                                                                )}

                                                            </span>

                                                        </div>


                                                        {/* SITE INFO */}

                                                        <div className="site-info-grid">

                                                            <div className="site-info-item">

                                                                <Building2
                                                                    size={
                                                                        16
                                                                    }
                                                                />

                                                                <div>
                                                                    <span>
                                                                        Type
                                                                    </span>

                                                                    <strong>
                                                                        {
                                                                            getType(
                                                                                site
                                                                            )
                                                                        }
                                                                    </strong>
                                                                </div>

                                                            </div>


                                                            <div className="site-info-item">

                                                                <Users
                                                                    size={
                                                                        16
                                                                    }
                                                                />

                                                                <div>
                                                                    <span>
                                                                        Capacity
                                                                    </span>

                                                                    <strong>
                                                                        {capacity !=
                                                                        null
                                                                            ? Number(
                                                                                  capacity
                                                                              ).toLocaleString()
                                                                            : "—"}
                                                                    </strong>
                                                                </div>

                                                            </div>


                                                            <div className="site-info-item">

                                                                <Users
                                                                    size={
                                                                        16
                                                                    }
                                                                />

                                                                <div>
                                                                    <span>
                                                                        Occupied
                                                                    </span>

                                                                    <strong>
                                                                        {occupancy !=
                                                                        null
                                                                            ? Number(
                                                                                  occupancy
                                                                              ).toLocaleString()
                                                                            : "—"}
                                                                    </strong>
                                                                </div>

                                                            </div>


                                                            <div className="site-info-item">

                                                                <ShieldCheck
                                                                    size={
                                                                        16
                                                                    }
                                                                />

                                                                <div>
                                                                    <span>
                                                                        Available
                                                                    </span>

                                                                    <strong>
                                                                        {available !=
                                                                        null
                                                                            ? available.toLocaleString()
                                                                            : "—"}
                                                                    </strong>
                                                                </div>

                                                            </div>

                                                        </div>


                                                        {/* OCCUPANCY */}

                                                        {occupancyPercentage !==
                                                            null && (
                                                            <div className="occupancy-section">

                                                                <div className="occupancy-heading">

                                                                    <span>
                                                                        Occupancy
                                                                    </span>

                                                                    <strong>
                                                                        {Math.round(
                                                                            occupancyPercentage
                                                                        )}
                                                                        %
                                                                    </strong>

                                                                </div>

                                                                <div className="occupancy-bar">

                                                                    <div
                                                                        style={{
                                                                            width: `${occupancyPercentage}%`,
                                                                        }}
                                                                    />

                                                                </div>

                                                            </div>
                                                        )}


                                                        {/* ACTIONS */}

                                                        <div className="site-actions">

                                                            <button
                                                                className="site-map-button"
                                                                onClick={() =>
                                                                    openMap(
                                                                        site
                                                                    )
                                                                }
                                                                disabled={
                                                                    !coordinates
                                                                }
                                                                title={
                                                                    !coordinates
                                                                        ? "Coordinates unavailable"
                                                                        : "View location on map"
                                                                }
                                                            >
                                                                <Navigation
                                                                    size={
                                                                        15
                                                                    }
                                                                />

                                                                View on Map
                                                            </button>

                                                        </div>

                                                    </motion.article>
                                                );
                                            }
                                        )}

                                    </div>
                                )}

                        </div>

                    </section>

                </main>
            </div>
        </div>
    );
};

export default SafeSites;