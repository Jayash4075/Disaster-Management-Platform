
import { useEffect, useMemo, useState } from "react";

import {
    Home,
    MapPin,
    Users,
    Building2,
    Plus,
    X,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Search,
    Route,
    Droplet,
    UtensilsCrossed,
    Stethoscope
} from "lucide-react";

import api from "../api/axios";
import toast from "react-hot-toast";

import "./SafeSites.css";


function SafeSites() {

    const [sites, setSites] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState({
        siteId: "",
        name: "",
        latitude: "",
        longitude: "",
        total: "",
        occupied: "0",
        suitabilityScore: "70"
    });


    // ============================================================
    // FETCH SAFE SITES
    // ============================================================

    const fetchSites = async (isRefresh = false) => {

        try {

            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const response = await api.get("/api/relocation/sites");

            const data = response.data?.data;

            setSites(Array.isArray(data) ? data : []);

        } catch (err) {

            console.error("Fetch sites error:", err);

            setSites([]);

            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Failed to fetch safe sites";

            setError(message);

        } finally {

            setLoading(false);
            setRefreshing(false);

        }
    };


    useEffect(() => {

        fetchSites();

    }, []);


    // ============================================================
    // FORM CHANGE
    // ============================================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));

    };


    // ============================================================
    // RESET FORM
    // ============================================================

    const resetForm = () => {

        setForm({
            siteId: "",
            name: "",
            latitude: "",
            longitude: "",
            total: "",
            occupied: "0",
            suitabilityScore: "70"
        });

    };


    // ============================================================
    // ADD SAFE SITE
    // ============================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const total = Number(form.total);
            const occupied = Number(form.occupied);

            if (total <= 0) {
                toast.error("Total capacity must be greater than 0");
                return;
            }

            if (occupied < 0 || occupied > total) {
                toast.error("Occupied capacity must be between 0 and total capacity");
                return;
            }

            await api.post("/api/relocation/sites", {

                siteId: form.siteId.trim(),

                name: form.name.trim(),

                location: {
                    coordinates: [
                        Number(form.longitude),
                        Number(form.latitude)
                    ]
                },

                capacity: {
                    total,
                    occupied,
                    available: total - occupied
                },

                suitabilityScore: Number(form.suitabilityScore)

            });


            toast.success("Safe site added successfully");

            setShowForm(false);

            resetForm();

            await fetchSites(true);

        } catch (err) {

            console.error("Create site error:", err);

            toast.error(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to add safe site"
            );

        }

    };


    // ============================================================
    // CALCULATE SITE STATUS
    // ============================================================

    const getSiteStatus = (site) => {

        const total = Number(site.capacity?.total) || 0;

        const available = Number(site.capacity?.available) || 0;

        if (total <= 0) {
            return {
                label: "UNKNOWN",
                className: "status-unknown"
            };
        }

        if (available <= 0) {
            return {
                label: "FULL",
                className: "status-inactive"
            };
        }

        const availabilityPercentage =
            (available / total) * 100;

        if (availabilityPercentage <= 20) {
            return {
                label: "LIMITED",
                className: "status-warning"
            };
        }

        return {
            label: "OPERATIONAL",
            className: "status-active"
        };

    };


    // ============================================================
    // FILTER SITES
    // ============================================================

    const filteredSites = useMemo(() => {

        const query = search.trim().toLowerCase();

        return sites.filter((site) => {

            const status = getSiteStatus(site);

            const matchesSearch =
                !query ||
                String(site.name || "")
                    .toLowerCase()
                    .includes(query) ||
                String(site.siteId || "")
                    .toLowerCase()
                    .includes(query);

            const matchesStatus =
                statusFilter === "all" ||
                status.label.toLowerCase() ===
                statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;

        });

    }, [sites, search, statusFilter]);


    // ============================================================
    // STATISTICS
    // ============================================================

    const statistics = useMemo(() => {

        let operational = 0;
        let occupied = 0;
        let totalCapacity = 0;

        sites.forEach((site) => {

            const total =
                Number(site.capacity?.total) || 0;

            const currentOccupied =
                Number(site.capacity?.occupied) || 0;

            totalCapacity += total;

            occupied += currentOccupied;

            const status = getSiteStatus(site);

            if (status.label === "OPERATIONAL") {
                operational++;
            }

        });

        return {
            totalSites: sites.length,
            operational,
            occupied,
            totalCapacity
        };

    }, [sites]);


    // ============================================================
    // LOCATION TEXT
    // ============================================================

    const getLocationText = (site) => {

        const coordinates =
            site.location?.coordinates;

        if (
            Array.isArray(coordinates) &&
            coordinates.length === 2
        ) {

            const longitude = Number(coordinates[0]);
            const latitude = Number(coordinates[1]);

            if (
                Number.isFinite(latitude) &&
                Number.isFinite(longitude)
            ) {

                return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

            }

        }

        return "Location not available";

    };


    // ============================================================
    // OCCUPANCY PERCENTAGE
    // ============================================================

    const getOccupancyPercentage = (site) => {

        const total =
            Number(site.capacity?.total) || 0;

        const occupied =
            Number(site.capacity?.occupied) || 0;

        if (total <= 0) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(
                0,
                Math.round((occupied / total) * 100)
            )
        );

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <main className="safe-sites-page">


                    {/* ==================================================
                        HEADER
                    ================================================== */}

                    <section className="safe-sites-header">

                        <div>

                            <div className="safe-sites-breadcrumb">

                                <span>
                                    Authority Dashboard
                                </span>

                                <span>/</span>

                                <span>
                                    Safe Sites
                                </span>

                            </div>


                            <h1>
                                Safe Sites
                            </h1>


                            <p>
                                Monitor identified safe locations
                                available for evacuation and
                                population relocation.
                            </p>

                        </div>


                        <div className="safe-sites-header-actions">

                            <button
                                className="refresh-button"
                                onClick={() =>
                                    fetchSites(true)
                                }
                                disabled={
                                    loading ||
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
                                    ? "Refreshing..."
                                    : "Refresh"}

                            </button>


                            <button
                                className="primary-action"
                                onClick={() =>
                                    setShowForm(true)
                                }
                            >

                                <Plus size={18} />

                                Add Safe Site

                            </button>

                        </div>

                    </section>


                    {/* ==================================================
                        ERROR
                    ================================================== */}

                    {error && (

                        <div className="safe-sites-error">

                            <AlertCircle
                                size={19}
                            />

                            <div>

                                <strong>
                                    Unable to load safe sites
                                </strong>

                                <span>
                                    {error}
                                </span>

                            </div>


                            <button
                                onClick={() =>
                                    fetchSites(true)
                                }
                            >
                                Retry
                            </button>

                        </div>

                    )}


                    {/* ==================================================
                        STATISTICS
                    ================================================== */}

                    <section className="safe-sites-stats">


                        {/* TOTAL */}

                        <div className="safe-stat-card">

                            <div className="safe-stat-icon blue">

                                <Home size={21} />

                            </div>


                            <div>

                                <span>
                                    Total Safe Sites
                                </span>

                                <strong>
                                    {statistics.totalSites}
                                </strong>

                                <small>
                                    Identified locations
                                </small>

                            </div>

                        </div>


                        {/* OPERATIONAL */}

                        <div className="safe-stat-card">

                            <div className="safe-stat-icon green">

                                <CheckCircle2 size={21} />

                            </div>


                            <div>

                                <span>
                                    Operational
                                </span>

                                <strong>
                                    {statistics.operational}
                                </strong>

                                <small>
                                    Currently available
                                </small>

                            </div>

                        </div>


                        {/* OCCUPANCY */}

                        <div className="safe-stat-card">

                            <div className="safe-stat-icon orange">

                                <Users size={21} />

                            </div>


                            <div>

                                <span>
                                    Current Occupancy
                                </span>

                                <strong>
                                    {statistics.occupied}
                                </strong>

                                <small>
                                    People currently accommodated
                                </small>

                            </div>

                        </div>


                        {/* CAPACITY */}

                        <div className="safe-stat-card">

                            <div className="safe-stat-icon purple">

                                <Building2 size={21} />

                            </div>


                            <div>

                                <span>
                                    Total Capacity
                                </span>

                                <strong>
                                    {statistics.totalCapacity}
                                </strong>

                                <small>
                                    Combined site capacity
                                </small>

                            </div>

                        </div>

                    </section>


                    {/* ==================================================
                        SEARCH / FILTER
                    ================================================== */}

                    <section className="safe-sites-controls">


                        <div className="search-box">

                            <Search size={17} />

                            <input
                                type="text"
                                placeholder="Search safe sites or locations..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
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

                            <option value="operational">
                                Operational
                            </option>

                            <option value="limited">
                                Limited
                            </option>

                            <option value="full">
                                Full
                            </option>

                            <option value="unknown">
                                Unknown
                            </option>

                        </select>

                    </section>


                    {/* ==================================================
                        MAIN PANEL
                    ================================================== */}

                    <section className="safe-sites-panel">


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


                            <span className="site-count">

                                {filteredSites.length} sites

                            </span>

                        </div>


                        {/* LOADING */}

                        {loading && (

                            <div className="safe-sites-loading">

                                <RefreshCw
                                    size={24}
                                    className="spin"
                                />

                                <p>
                                    Loading safe sites...
                                </p>

                            </div>

                        )}


                        {/* EMPTY */}

                        {!loading &&
                            filteredSites.length === 0 && (

                                <div className="safe-sites-empty">

                                    <div className="empty-site-icon">

                                        <Home size={28} />

                                    </div>


                                    <h3>

                                        {sites.length === 0
                                            ? "No safe sites yet"
                                            : "No matching safe sites"}

                                    </h3>


                                    <p>

                                        {sites.length === 0
                                            ? "Add a relocation site to start recommending it to at-risk habitations."
                                            : "Try changing your search or status filter."}

                                    </p>

                                </div>

                            )}


                        {/* SITE LIST */}

                        {!loading &&
                            filteredSites.length > 0 && (

                                <div className="safe-sites-list">

                                    {filteredSites.map(
                                        (site) => {

                                            const status =
                                                getSiteStatus(site);

                                            const occupancy =
                                                getOccupancyPercentage(
                                                    site
                                                );

                                            const available =
                                                Number(
                                                    site.capacity?.available
                                                ) || 0;

                                            const total =
                                                Number(
                                                    site.capacity?.total
                                                ) || 0;

                                            return (

                                                <div
                                                    className="safe-site-card"
                                                    key={
                                                        site.siteId ||
                                                        site._id
                                                    }
                                                >


                                                    {/* CARD TOP */}

                                                    <div className="site-card-top">

                                                        <div className="site-title-area">


                                                            <div className="site-icon">

                                                                <Home
                                                                    size={19}
                                                                />

                                                            </div>


                                                            <div>

                                                                <h3>
                                                                    {site.name ||
                                                                        "Unnamed Safe Site"}
                                                                </h3>


                                                                <div className="site-location">

                                                                    <MapPin
                                                                        size={12}
                                                                    />

                                                                    <span>
                                                                        {getLocationText(
                                                                            site
                                                                        )}
                                                                    </span>

                                                                </div>

                                                            </div>

                                                        </div>


                                                        <span
                                                            className={`site-status ${status.className}`}
                                                        >

                                                            <CheckCircle2
                                                                size={11}
                                                            />

                                                            {status.label}

                                                        </span>

                                                    </div>


                                                    {/* INFORMATION */}

                                                    <div className="site-info-grid">


                                                        <div className="site-info-item">

                                                            <Building2
                                                                size={15}
                                                            />

                                                            <div>

                                                                <span>
                                                                    Total Capacity
                                                                </span>

                                                                <strong>
                                                                    {total}
                                                                </strong>

                                                            </div>

                                                        </div>


                                                        <div className="site-info-item">

                                                            <Users
                                                                size={15}
                                                            />

                                                            <div>

                                                                <span>
                                                                    Available
                                                                </span>

                                                                <strong>
                                                                    {available}
                                                                </strong>

                                                            </div>

                                                        </div>


                                                        <div className="site-info-item">

                                                            <CheckCircle2
                                                                size={15}
                                                            />

                                                            <div>

                                                                <span>
                                                                    Suitability
                                                                </span>

                                                                <strong>
                                                                    {site.suitabilityScore ??
                                                                        "—"}
                                                                    %
                                                                </strong>

                                                            </div>

                                                        </div>


                                                        <div className="site-info-item">

                                                            <MapPin
                                                                size={15}
                                                            />

                                                            <div>

                                                                <span>
                                                                    Site ID
                                                                </span>

                                                                <strong>
                                                                    {site.siteId ||
                                                                        "—"}
                                                                </strong>

                                                            </div>

                                                        </div>

                                                    </div>


                                                    {/* OCCUPANCY */}

                                                    <div className="occupancy-section">

                                                        <div className="occupancy-heading">

                                                            <span>
                                                                Occupancy
                                                            </span>

                                                            <strong>
                                                                {occupancy}%
                                                            </strong>

                                                        </div>


                                                        <div className="occupancy-bar">

                                                            <div
                                                                style={{
                                                                    width: `${occupancy}%`
                                                                }}
                                                            />

                                                        </div>

                                                    </div>


                                                    {/* ACTION */}

                                                    <div className="site-actions">

                                                        <button
                                                            className="site-map-button"
                                                            type="button"
                                                            disabled
                                                            title="Map integration can be connected here"
                                                        >

                                                            <MapPin
                                                                size={13}
                                                            />

                                                            View on Map

                                                        </button>

                                                    </div>

                                                </div>

                                            );

                                        }
                                    )}

                                </div>

                            )}

                    </section>

            {/* ==========================================================
                ADD SAFE SITE MODAL
            ========================================================== */}

            {showForm && (

                <div
                    className="modal-backdrop"
                    onClick={() =>
                        setShowForm(false)
                    }
                >

                    <div
                        className="modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <button
                            className="modal-close"
                            onClick={() =>
                                setShowForm(false)
                            }
                            type="button"
                        >

                            <X size={18} />

                        </button>


                        <h2>
                            Add Safe Site
                        </h2>


                        <p className="modal-description">
                            Add a new relocation location for
                            evacuated populations.
                        </p>


                        <form
                            onSubmit={handleSubmit}
                        >

                            <input
                                name="siteId"
                                placeholder="Site ID (e.g. S001)"
                                value={form.siteId}
                                onChange={handleChange}
                                required
                            />


                            <input
                                name="name"
                                placeholder="Site Name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />


                            <div className="modal-form-row">

                                <input
                                    name="latitude"
                                    type="number"
                                    step="any"
                                    placeholder="Latitude"
                                    value={form.latitude}
                                    onChange={handleChange}
                                    required
                                />

                                <input
                                    name="longitude"
                                    type="number"
                                    step="any"
                                    placeholder="Longitude"
                                    value={form.longitude}
                                    onChange={handleChange}
                                    required
                                />

                            </div>


                            <div className="modal-form-row">

                                <input
                                    name="total"
                                    type="number"
                                    min="1"
                                    placeholder="Total Capacity"
                                    value={form.total}
                                    onChange={handleChange}
                                    required
                                />

                                <input
                                    name="occupied"
                                    type="number"
                                    min="0"
                                    placeholder="Currently Occupied"
                                    value={form.occupied}
                                    onChange={handleChange}
                                />

                            </div>


                            <input
                                name="suitabilityScore"
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Suitability Score (0-100)"
                                value={form.suitabilityScore}
                                onChange={handleChange}
                            />


                            <button
                                type="submit"
                                className="primary-action modal-submit"
                            >

                                <Plus size={17} />

                                Save Site

                            </button>

                        </form>

                    </div>

                </div>

            )}

        </main>

    );

}


export default SafeSites;