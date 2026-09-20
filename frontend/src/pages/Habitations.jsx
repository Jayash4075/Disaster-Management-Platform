import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    Building2,
    ChevronDown,
    ChevronRight,
    Filter,
    MapPin,
    Search,
    Users,
    X,
    Route,
} from "lucide-react";

import AuthoritySidebar from "../components/AuthoritySidebar";
import AuthorityTopbar from "../components/AuthorityTopbar";

import "./Habitations.css";

const HABITATIONS_API = "/api/habitations";

function normalizeHabitation(item, index) {
    return {
        id: item._id || item.id || `habitation-${index}`,

        name:
            item.name ||
            item.habitationName ||
            item.villageName ||
            "Unnamed Habitation",

        district:
            item.district ||
            item.location?.district ||
            "Unknown",

        population: Number(item.population) || 0,

        hazard:
            item.hazard ||
            item.primaryHazard ||
            item.hazardType ||
            "Unknown",

        riskLevel:
            item.riskLevel ||
            item.risk ||
            item.riskCategory ||
            "Unknown",

        vulnerability: Number(
            item.vulnerability ??
            item.vulnerabilityScore ??
            0
        ),

        relocationPriority:
            item.relocationPriority ||
            item.priority ||
            "Not assessed",

        affectedPopulation: Number(
            item.affectedPopulation ??
            item.populationAtRisk ??
            0
        ),

        latitude:
            item.latitude ??
            item.location?.latitude ??
            null,

        longitude:
            item.longitude ??
            item.location?.longitude ??
            null,

        riskFactors:
            Array.isArray(item.riskFactors)
                ? item.riskFactors
                : [],

        disasterHistory:
            item.disasterHistory ||
            item.history ||
            [],

        modelConfidence:
            item.modelConfidence ??
            item.confidence ??
            null,
    };
}

function formatNumber(value) {
    return new Intl.NumberFormat("en-IN").format(value || 0);
}

function getRiskClass(level) {
    return String(level || "")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function getPriorityClass(priority) {
    return String(priority || "")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function Habitations() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [habitations, setHabitations] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [riskFilter, setRiskFilter] = useState("All");
    const [priorityFilter, setPriorityFilter] = useState("All");
    const [hazardFilter, setHazardFilter] = useState("All");
    const [sortBy, setSortBy] = useState("risk");

    const [selectedHabitation, setSelectedHabitation] = useState(null);

    // ---------------------------------------------------------
    // FETCH DATA FROM BACKEND
    // ---------------------------------------------------------

    useEffect(() => {
        let cancelled = false;

        async function fetchHabitations() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(HABITATIONS_API, {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(
                        `Backend returned ${response.status}`
                    );
                }

                const contentType =
                    response.headers.get("content-type") || "";

                if (!contentType.includes("application/json")) {
                    throw new Error(
                        "Habitation API did not return JSON."
                    );
                }

                const result = await response.json();

                const rawData = Array.isArray(result)
                    ? result
                    : result.data ||
                      result.habitations ||
                      result.results ||
                      [];

                if (!Array.isArray(rawData)) {
                    throw new Error(
                        "Invalid habitation data received from backend."
                    );
                }

                const normalized = rawData.map(
                    normalizeHabitation
                );

                if (!cancelled) {
                    setHabitations(normalized);
                }
            } catch (err) {
                console.error(
                    "Habitations API error:",
                    err
                );

                if (!cancelled) {
                    setHabitations([]);
                    setError(
                        err.message ||
                        "Unable to load habitation data."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchHabitations();

        return () => {
            cancelled = true;
        };
    }, []);

    // ---------------------------------------------------------
    // DYNAMIC FILTER OPTIONS
    // ---------------------------------------------------------

    const hazardOptions = useMemo(() => {
        const values = habitations
            .map((item) => item.hazard)
            .filter(
                (value) =>
                    value &&
                    value !== "Unknown"
            );

        return ["All", ...new Set(values)];
    }, [habitations]);

    // ---------------------------------------------------------
    // FILTER + SORT
    // ---------------------------------------------------------

    const filteredHabitations = useMemo(() => {
        let result = [...habitations];

        const search = searchTerm
            .trim()
            .toLowerCase();

        if (search) {
            result = result.filter((item) =>
                [
                    item.name,
                    item.district,
                    item.hazard,
                    item.riskLevel,
                    item.relocationPriority,
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(search)
            );
        }

        if (riskFilter !== "All") {
            result = result.filter(
                (item) =>
                    String(item.riskLevel)
                        .toLowerCase() ===
                    riskFilter.toLowerCase()
            );
        }

        if (priorityFilter !== "All") {
            result = result.filter(
                (item) =>
                    String(
                        item.relocationPriority
                    )
                        .toLowerCase() ===
                    priorityFilter.toLowerCase()
                );
        }

        if (hazardFilter !== "All") {
            result = result.filter(
                (item) =>
                    item.hazard === hazardFilter
            );
        }

        result.sort((a, b) => {
            if (sortBy === "population") {
                return (
                    b.population -
                    a.population
                );
            }

            if (sortBy === "vulnerability") {
                return (
                    b.vulnerability -
                    a.vulnerability
                );
            }

            const riskWeight = {
                critical: 4,
                high: 3,
                medium: 2,
                low: 1,
            };

            return (
                (riskWeight[
                    String(
                        b.riskLevel
                    ).toLowerCase()
                ] || 0) -
                (riskWeight[
                    String(
                        a.riskLevel
                    ).toLowerCase()
                ] || 0)
            );
        });

        return result;
    }, [
        habitations,
        searchTerm,
        riskFilter,
        priorityFilter,
        hazardFilter,
        sortBy,
    ]);

    // ---------------------------------------------------------
    // CALCULATED SUMMARY FROM BACKEND DATA
    // ---------------------------------------------------------

    const statistics = useMemo(() => {
        const critical = habitations.filter(
            (item) =>
                String(item.riskLevel)
                    .toLowerCase() ===
                "critical"
        ).length;

        const populationAtRisk =
            habitations.reduce(
                (total, item) =>
                    total +
                    (Number(
                        item.affectedPopulation
                    ) || 0),
                0
            );

        const immediateRelocation =
            habitations.filter(
                (item) =>
                    String(
                        item.relocationPriority
                    )
                        .toLowerCase() ===
                    "immediate"
            ).length;

        return {
            total: habitations.length,
            critical,
            populationAtRisk,
            immediateRelocation,
        };
    }, [habitations]);

    // ---------------------------------------------------------
    // RESET FILTERS
    // ---------------------------------------------------------

    const resetFilters = () => {
        setSearchTerm("");
        setRiskFilter("All");
        setPriorityFilter("All");
        setHazardFilter("All");
        setSortBy("risk");
    };

    return (
        <div
            className={`authority-layout ${
                sidebarCollapsed
                    ? "sidebar-collapsed"
                    : ""
            }`}
        >
            <AuthoritySidebar
                collapsed={sidebarCollapsed}
                onToggle={() =>
                    setSidebarCollapsed(
                        (previous) =>
                            !previous
                    )
                }
            />

            <div className="authority-main">
                <AuthorityTopbar />

                <main className="habitations-page">
                    {/* PAGE HEADER */}
                    <section className="habitations-header">
                        <div>
                            <div className="page-eyebrow">
                                RISK ANALYSIS
                            </div>

                            <h1>
                                Vulnerable Habitations
                            </h1>

                            <p>
                                Identify and prioritize
                                habitations exposed to
                                disaster risk for
                                informed relocation
                                planning.
                            </p>
                        </div>
                    </section>

                    {/* ERROR */}
                    {error && (
                        <motion.div
                            className="api-error"
                            initial={{
                                opacity: 0,
                                y: -8,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                            }}
                        >
                            <AlertTriangle
                                size={20}
                            />

                            <div>
                                <strong>
                                    Unable to load
                                    habitation data
                                </strong>

                                <span>
                                    {error}
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {/* STATISTICS */}
                    <section className="habitation-stats">
                        <StatCard
                            icon={
                                <Building2
                                    size={23}
                                />
                            }
                            label="Habitations Assessed"
                            value={
                                loading
                                    ? "—"
                                    : formatNumber(
                                          statistics.total
                                      )
                            }
                        />

                        <StatCard
                            icon={
                                <AlertTriangle
                                    size={23}
                                />
                            }
                            label="Critical Risk"
                            value={
                                loading
                                    ? "—"
                                    : formatNumber(
                                          statistics.critical
                                      )
                            }
                            danger
                        />

                        <StatCard
                            icon={
                                <Users size={23} />
                            }
                            label="Population at Risk"
                            value={
                                loading
                                    ? "—"
                                    : formatNumber(
                                          statistics.populationAtRisk
                                      )
                            }
                        />

                        <StatCard
                            icon={
                                <Route size={23} />
                            }
                            label="Immediate Relocation"
                            value={
                                loading
                                    ? "—"
                                    : formatNumber(
                                          statistics.immediateRelocation
                                      )
                            }
                        />
                    </section>

                    {/* FILTERS */}
                    <section className="habitation-filters">
                        <div className="search-wrapper">
                            <Search size={19} />

                            <input
                                type="text"
                                placeholder="Search habitation, district or hazard..."
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </div>

                        <FilterSelect
                            label="Risk"
                            value={riskFilter}
                            options={[
                                "All",
                                "Critical",
                                "High",
                                "Medium",
                                "Low",
                            ]}
                            onChange={
                                setRiskFilter
                            }
                        />

                        <FilterSelect
                            label="Priority"
                            value={priorityFilter}
                            options={[
                                "All",
                                "Immediate",
                                "Short-term",
                                "Medium-term",
                            ]}
                            onChange={
                                setPriorityFilter
                            }
                        />

                        <FilterSelect
                            label="Hazard"
                            value={hazardFilter}
                            options={
                                hazardOptions
                            }
                            onChange={
                                setHazardFilter
                            }
                        />

                        <FilterSelect
                            label="Sort"
                            value={sortBy}
                            options={[
                                "risk",
                                "population",
                                "vulnerability",
                            ]}
                            labels={{
                                risk: "Risk",
                                population:
                                    "Population",
                                vulnerability:
                                    "Vulnerability",
                            }}
                            onChange={setSortBy}
                        />
                    </section>

                    {/* TABLE */}
                    <section className="habitation-card">
                        <div className="table-header">
                            <div>
                                <h2>
                                    Habitation Risk
                                    Register
                                </h2>

                                <p>
                                    {loading
                                        ? "Loading habitation data..."
                                        : `Showing ${filteredHabitations.length} of ${habitations.length} habitations`}
                                </p>
                            </div>

                            {!loading &&
                                habitations.length >
                                    0 && (
                                    <button
                                        className="reset-button"
                                        onClick={
                                            resetFilters
                                        }
                                    >
                                        Reset filters
                                    </button>
                                )}
                        </div>

                        {loading ? (
                            <LoadingState />
                        ) : error ? (
                            <EmptyState
                                icon={
                                    <AlertTriangle
                                        size={30}
                                    />
                                }
                                title="Habitation data unavailable"
                                message="Connect the backend habitation endpoint to populate this register."
                            />
                        ) : habitations.length ===
                          0 ? (
                            <EmptyState
                                icon={
                                    <Building2
                                        size={30}
                                    />
                                }
                                title="No habitation data"
                                message="No habitation records have been returned by the backend yet."
                            />
                        ) : filteredHabitations.length ===
                          0 ? (
                            <EmptyState
                                icon={
                                    <Search
                                        size={30}
                                    />
                                }
                                title="No matching habitations"
                                message="Try changing your search or filters."
                            />
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>
                                                Habitation
                                            </th>
                                            <th>
                                                Population
                                            </th>
                                            <th>
                                                Hazard
                                            </th>
                                            <th>
                                                Risk
                                            </th>
                                            <th>
                                                Vulnerability
                                            </th>
                                            <th>
                                                Relocation
                                            </th>
                                            <th>
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredHabitations.map(
                                            (
                                                habitation
                                            ) => (
                                                <tr
                                                    key={
                                                        habitation.id
                                                    }
                                                >
                                                    <td>
                                                        <div className="habitation-name">
                                                            <div className="habitation-icon">
                                                                <Building2
                                                                    size={
                                                                        19
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <strong>
                                                                    {
                                                                        habitation.name
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    <MapPin
                                                                        size={
                                                                            14
                                                                        }
                                                                    />

                                                                    {
                                                                        habitation.district
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {formatNumber(
                                                                habitation.population
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <span className="hazard-badge">
                                                            {
                                                                habitation.hazard
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`risk-badge ${getRiskClass(
                                                                habitation.riskLevel
                                                            )}`}
                                                        >
                                                            {
                                                                habitation.riskLevel
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="vulnerability">
                                                            <div className="progress">
                                                                <span
                                                                    style={{
                                                                        width: `${Math.min(
                                                                            Math.max(
                                                                                habitation.vulnerability,
                                                                                0
                                                                            ),
                                                                            100
                                                                        )}%`,
                                                                    }}
                                                                />
                                                            </div>

                                                            <strong>
                                                                {Math.round(
                                                                    habitation.vulnerability
                                                                )}
                                                                %
                                                            </strong>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`priority-badge ${getPriorityClass(
                                                                habitation.relocationPriority
                                                            )}`}
                                                        >
                                                            {
                                                                habitation.relocationPriority
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <button
                                                            className="view-button"
                                                            onClick={() =>
                                                                setSelectedHabitation(
                                                                    habitation
                                                                )
                                                            }
                                                        >
                                                            View
                                                            <ChevronRight
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </main>
            </div>

            {/* DETAIL PANEL */}
            {selectedHabitation && (
                <>
                    <div
                        className="detail-overlay"
                        onClick={() =>
                            setSelectedHabitation(
                                null
                            )
                        }
                    />

                    <aside className="habitation-detail-panel">
                        <div className="detail-header">
                            <div>
                                <span>
                                    HABITATION
                                </span>

                                <h2>
                                    {
                                        selectedHabitation.name
                                    }
                                </h2>

                                <p>
                                    <MapPin
                                        size={15}
                                    />

                                    {
                                        selectedHabitation.district
                                    }
                                </p>
                            </div>

                            <button
                                onClick={() =>
                                    setSelectedHabitation(
                                        null
                                    )
                                }
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="detail-body">
                            <div className="detail-risk">
                                <span>
                                    Current Risk
                                </span>

                                <strong
                                    className={`risk-badge ${getRiskClass(
                                        selectedHabitation.riskLevel
                                    )}`}
                                >
                                    {
                                        selectedHabitation.riskLevel
                                    }
                                </strong>
                            </div>

                            <div className="detail-grid">
                                <DetailItem
                                    label="Population"
                                    value={formatNumber(
                                        selectedHabitation.population
                                    )}
                                />

                                <DetailItem
                                    label="Population at Risk"
                                    value={formatNumber(
                                        selectedHabitation.affectedPopulation
                                    )}
                                />

                                <DetailItem
                                    label="Primary Hazard"
                                    value={
                                        selectedHabitation.hazard
                                    }
                                />

                                <DetailItem
                                    label="Vulnerability"
                                    value={`${Math.round(
                                        selectedHabitation.vulnerability
                                    )}%`}
                                />

                                <DetailItem
                                    label="Relocation Priority"
                                    value={
                                        selectedHabitation.relocationPriority
                                    }
                                />

                                {selectedHabitation
                                    .modelConfidence !==
                                    null && (
                                    <DetailItem
                                        label="Model Confidence"
                                        value={`${Math.round(
                                            Number(
                                                selectedHabitation.modelConfidence
                                            ) > 1
                                                ? Number(
                                                      selectedHabitation.modelConfidence
                                                  )
                                                : Number(
                                                      selectedHabitation.modelConfidence
                                                  ) *
                                                      100
                                        )}%`}
                                    />
                                )}
                            </div>

                            {selectedHabitation
                                .riskFactors
                                .length > 0 && (
                                <div className="detail-section">
                                    <h3>
                                        Risk Factors
                                    </h3>

                                    <ul>
                                        {selectedHabitation.riskFactors.map(
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

                            {(selectedHabitation.latitude !==
                                null ||
                                selectedHabitation.longitude !==
                                    null) && (
                                <div className="coordinates-box">
                                    <MapPin
                                        size={18}
                                    />

                                    <div>
                                        <span>
                                            Coordinates
                                        </span>

                                        <strong>
                                            {
                                                selectedHabitation.latitude
                                            }
                                            ,{" "}
                                            {
                                                selectedHabitation.longitude
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

// ---------------------------------------------------------
// COMPONENTS
// ---------------------------------------------------------

function StatCard({
    icon,
    label,
    value,
    danger = false,
}) {
    return (
        <div className="stat-card">
            <div
                className={`stat-icon ${
                    danger ? "danger" : ""
                }`}
            >
                {icon}
            </div>

            <div>
                <span>{label}</span>
                <strong>{value}</strong>
            </div>
        </div>
    );
}

function FilterSelect({
    label,
    value,
    options,
    onChange,
    labels = {},
}) {
    return (
        <label className="filter-select">
            <span>{label}</span>

            <select
                value={value}
                onChange={(event) =>
                    onChange(
                        event.target.value
                    )
                }
            >
                {options.map((option) => (
                    <option
                        key={option}
                        value={option}
                    >
                        {labels[option] ||
                            option}
                    </option>
                ))}
            </select>

            <ChevronDown size={17} />
        </label>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="detail-item">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="loading-state">
            <div className="loading-spinner" />
            <h3>
                Loading habitation intelligence
            </h3>
            <p>
                Fetching risk and vulnerability
                data from the backend.
            </p>
        </div>
    );
}

function EmptyState({
    icon,
    title,
    message,
}) {
    return (
        <div className="empty-state">
            <div className="empty-icon">
                {icon}
            </div>

            <h3>{title}</h3>
            <p>{message}</p>
        </div>
    );
}

export default Habitations;