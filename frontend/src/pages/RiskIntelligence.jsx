import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Brain,
    Building2,
    RefreshCw,
    ShieldAlert,
    Users,
    X,
} from "lucide-react";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
} from "recharts";

import AuthoritySidebar from "../components/AuthoritySidebar";
import AuthorityTopbar from "../components/AuthorityTopbar";
import api from "../api/axios";

import "./RiskIntelligence.css";


const INTELLIGENCE_API = "/api/risk/intelligence";
const HABITATIONS_API = "/api/risk/habitations";
const TRENDS_API = "/api/risk/trends";


function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    return number.toLocaleString("en-IN");
}


function formatHazard(value) {
    if (!value) return "—";

    return String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}


function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}


function getRiskClass(level) {
    if (!level) return "unknown";

    return String(level)
        .toLowerCase()
        .replace(/\s+/g, "-");
}


function RiskIntelligence() {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [summary, setSummary] = useState(null);
    const [habitations, setHabitations] = useState([]);
    const [trends, setTrends] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState("");

    const [riskFilter, setRiskFilter] = useState("ALL");
    const [hazardFilter, setHazardFilter] = useState("ALL");

    const [selectedHabitation, setSelectedHabitation] =
        useState(null);


    const loadData = async (refresh = false) => {

        try {

            if (refresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");


            const results = await Promise.allSettled([

                api.get(INTELLIGENCE_API),

                api.get(HABITATIONS_API),

                api.get(TRENDS_API),

            ]);


            const [
                intelligenceResult,
                habitationsResult,
                trendsResult,
            ] = results;


            let successfulRequests = 0;


            /* ---------------- SUMMARY ---------------- */

            if (
                intelligenceResult.status === "fulfilled"
            ) {

                successfulRequests++;

                const response =
                    intelligenceResult.value.data;

                setSummary(
                    response?.data || response || null
                );

            } else {

                setSummary(null);

            }


            /* ---------------- HABITATIONS ---------------- */

            if (
                habitationsResult.status === "fulfilled"
            ) {

                successfulRequests++;

                const response =
                    habitationsResult.value.data;

                const data =
                    Array.isArray(response)
                        ? response
                        : response?.data;

                setHabitations(
                    Array.isArray(data)
                        ? data
                        : []
                );

            } else {

                setHabitations([]);

            }


            /* ---------------- TRENDS ---------------- */

            if (
                trendsResult.status === "fulfilled"
            ) {

                successfulRequests++;

                const response =
                    trendsResult.value.data;

                const data =
                    Array.isArray(response)
                        ? response
                        : response?.data;

                setTrends(
                    Array.isArray(data)
                        ? data
                        : []
                );

            } else {

                setTrends([]);

            }


            if (successfulRequests === 0) {

                setError(
                    "Risk Intelligence APIs are not available yet. The page is ready for backend and ML integration."
                );

            }

        } catch (err) {

            console.error(
                "Risk Intelligence error:",
                err
            );

            setError(
                "Unable to connect to the Risk Intelligence service."
            );

        } finally {

            setLoading(false);
            setRefreshing(false);

        }
    };


    useEffect(() => {
        loadData();
    }, []);


    /* ---------------- HAZARDS ---------------- */

    const hazards = useMemo(() => {

        const values = habitations
            .map(item =>
                item.hazard ||
                item.primaryHazard ||
                item.hazardType
            )
            .filter(Boolean);

        return [...new Set(values)];

    }, [habitations]);


    /* ---------------- FILTER DATA ---------------- */

    const filteredHabitations = useMemo(() => {

        return habitations.filter(item => {

            const level =
                item.riskLevel ||
                item.risk ||
                item.riskCategory;

            const hazard =
                item.hazard ||
                item.primaryHazard ||
                item.hazardType;


            const riskMatch =
                riskFilter === "ALL" ||
                String(level).toUpperCase() ===
                riskFilter;


            const hazardMatch =
                hazardFilter === "ALL" ||
                String(hazard).toLowerCase() ===
                String(hazardFilter).toLowerCase();


            return riskMatch && hazardMatch;

        });

    }, [
        habitations,
        riskFilter,
        hazardFilter,
    ]);


    /* ---------------- HAZARD CHART ---------------- */

    const hazardDistribution = useMemo(() => {

        const counts = {};

        habitations.forEach(item => {

            const hazard =
                item.hazard ||
                item.primaryHazard ||
                item.hazardType;

            if (!hazard) return;

            counts[hazard] =
                (counts[hazard] || 0) + 1;

        });


        return Object.entries(counts).map(
            ([name, count]) => ({
                name: formatHazard(name),
                count,
            })
        );

    }, [habitations]);


    return (

        <div
            className={`authority-layout ${
                sidebarCollapsed
                    ? "sidebar-collapsed"
                    : ""
            }`}
        >

            {/* SIDEBAR */}

            <AuthoritySidebar
                collapsed={sidebarCollapsed}
                onToggle={() =>
                    setSidebarCollapsed(
                        previous => !previous
                    )
                }
            />


            {/* MAIN */}

            <main className="authority-main">

                <AuthorityTopbar />


                <div className="risk-page">


                    {/* ================= HEADER ================= */}

                    <section className="risk-header">

                        <div>

                            <div className="risk-breadcrumb">
                                Authority
                                <span>/</span>
                                Risk Intelligence
                            </div>

                            <h1>
                                Risk Intelligence
                            </h1>

                            <p>
                                AI and ML powered disaster
                                risk assessment and
                                vulnerability intelligence.
                            </p>

                        </div>


                        <button
                            className="refresh-button"
                            onClick={() =>
                                loadData(true)
                            }
                            disabled={refreshing}
                        >

                            <RefreshCw
                                size={18}
                                className={
                                    refreshing
                                        ? "spin"
                                        : ""
                                }
                            />

                            {refreshing
                                ? "Refreshing..."
                                : "Refresh Data"}

                        </button>

                    </section>


                    {/* ================= API STATUS ================= */}

                    {error && (

                        <div className="api-status">

                            <AlertTriangle size={21} />

                            <div>

                                <strong>
                                    Backend connection status
                                </strong>

                                <p>
                                    {error}
                                </p>

                            </div>

                        </div>

                    )}


                    {/* ================= LOADING ================= */}

                    {loading ? (

                        <div className="loading-state">

                            <RefreshCw
                                size={32}
                                className="spin"
                            />

                            <h3>
                                Loading Risk Intelligence
                            </h3>

                            <p>
                                Connecting to the risk
                                intelligence service...
                            </p>

                        </div>

                    ) : (

                        <>


                            {/* ================= ML ENGINE ================= */}

                            <section className="ml-engine-card">

                                <div className="ml-icon">

                                    <Brain size={28} />

                                </div>


                                <div className="ml-content">

                                    <h2>
                                        Risk Intelligence Engine
                                    </h2>

                                    <p>
                                        This dashboard is
                                        connected to the backend
                                        API and is ready to
                                        display predictions
                                        generated by the ML
                                        pipeline.
                                    </p>

                                </div>


                                <div
                                    className={`connection-status ${
                                        summary
                                            ? "connected"
                                            : "waiting"
                                    }`}
                                >

                                    <span />

                                    {summary
                                        ? "DATA CONNECTED"
                                        : "AWAITING DATA"}

                                </div>

                            </section>


                            {/* ================= STAT CARDS ================= */}

                            <section className="stat-grid">


                                <div className="stat-card">

                                    <div className="stat-icon">
                                        <ShieldAlert
                                            size={23}
                                        />
                                    </div>

                                    <div>

                                        <span>
                                            Overall Risk
                                        </span>

                                        <strong>
                                            {
                                                summary?.overallRisk ||
                                                "—"
                                            }
                                        </strong>

                                        {summary?.overallRiskScore !==
                                            null &&
                                            summary?.overallRiskScore !==
                                            undefined && (

                                                <small>
                                                    Score:{" "}
                                                    {
                                                        summary.overallRiskScore
                                                    }
                                                </small>

                                            )}

                                    </div>

                                </div>


                                <div className="stat-card">

                                    <div className="stat-icon">
                                        <Users size={23} />
                                    </div>

                                    <div>

                                        <span>
                                            Population at Risk
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                summary?.populationAtRisk
                                            )}
                                        </strong>

                                    </div>

                                </div>


                                <div className="stat-card">

                                    <div className="stat-icon">
                                        <AlertTriangle
                                            size={23}
                                        />
                                    </div>

                                    <div>

                                        <span>
                                            Critical Habitations
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                summary?.criticalHabitations
                                            )}
                                        </strong>

                                    </div>

                                </div>


                                <div className="stat-card">

                                    <div className="stat-icon">
                                        <Building2
                                            size={23}
                                        />
                                    </div>

                                    <div>

                                        <span>
                                            High Risk
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                summary?.highRiskHabitations
                                            )}
                                        </strong>

                                    </div>

                                </div>


                                <div className="stat-card">

                                    <div className="stat-icon">
                                        <Activity
                                            size={23}
                                        />
                                    </div>

                                    <div>

                                        <span>
                                            Model Confidence
                                        </span>

                                        <strong>
                                            {
                                                summary?.modelConfidence !==
                                                null &&
                                                summary?.modelConfidence !==
                                                undefined
                                                    ? `${summary.modelConfidence}%`
                                                    : "—"
                                            }
                                        </strong>

                                    </div>

                                </div>


                            </section>


                            {/* ================= ANALYTICS ================= */}

                            <section className="analytics-grid">


                                {/* RISK TREND */}

                                <div className="chart-card">

                                    <div className="card-heading">

                                        <div>

                                            <h2>
                                                Risk Trend
                                            </h2>

                                            <p>
                                                Historical risk
                                                assessment
                                            </p>

                                        </div>

                                        <Activity
                                            size={22}
                                        />

                                    </div>


                                    {trends.length > 0 ? (

                                        <ResponsiveContainer
                                            width="100%"
                                            height={320}
                                        >

                                            <LineChart
                                                data={trends}
                                            >

                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                />

                                                <XAxis
                                                    dataKey="label"
                                                />

                                                <YAxis
                                                    domain={[
                                                        0,
                                                        100
                                                    ]}
                                                />

                                                <Tooltip />

                                                <Line
                                                    type="monotone"
                                                    dataKey="riskScore"
                                                    strokeWidth={3}
                                                    dot={false}
                                                />

                                            </LineChart>

                                        </ResponsiveContainer>

                                    ) : (

                                        <div className="chart-empty">

                                            <Activity size={34} />

                                            <h3>
                                                No trend data
                                            </h3>

                                            <p>
                                                Historical ML
                                                assessments will
                                                appear here once
                                                provided by the
                                                backend.
                                            </p>

                                        </div>

                                    )}

                                </div>


                                {/* HAZARD DISTRIBUTION */}

                                <div className="chart-card">

                                    <div className="card-heading">

                                        <div>

                                            <h2>
                                                Hazard Distribution
                                            </h2>

                                            <p>
                                                Distribution of
                                                identified hazards
                                            </p>

                                        </div>

                                        <BarChart3
                                            size={22}
                                        />

                                    </div>


                                    {hazardDistribution.length >
                                        0 ? (

                                        <ResponsiveContainer
                                            width="100%"
                                            height={320}
                                        >

                                            <BarChart
                                                data={
                                                    hazardDistribution
                                                }
                                            >

                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                />

                                                <XAxis
                                                    dataKey="name"
                                                />

                                                <YAxis />

                                                <Tooltip />

                                                <Bar
                                                    dataKey="count"
                                                    radius={[
                                                        6,
                                                        6,
                                                        0,
                                                        0
                                                    ]}
                                                />

                                            </BarChart>

                                        </ResponsiveContainer>

                                    ) : (

                                        <div className="chart-empty">

                                            <BarChart3
                                                size={34}
                                            />

                                            <h3>
                                                No hazard data
                                            </h3>

                                            <p>
                                                Hazard information
                                                will appear when
                                                supplied by the
                                                backend.
                                            </p>

                                        </div>

                                    )}

                                </div>

                            </section>


                            {/* ================= HABITATIONS ================= */}

                            <section className="habitations-card">

                                <div className="section-heading">

                                    <div>

                                        <h2>
                                            Risk-Assessed Habitations
                                        </h2>

                                        <p>
                                            Habitation-level
                                            predictions received
                                            from the ML backend.
                                        </p>

                                    </div>


                                    <div className="filters">

                                        <select
                                            value={riskFilter}
                                            onChange={event =>
                                                setRiskFilter(
                                                    event.target.value
                                                )
                                            }
                                        >

                                            <option value="ALL">
                                                All Risk Levels
                                            </option>

                                            <option value="RED">
                                                Red
                                            </option>

                                            <option value="ORANGE">
                                                Orange
                                            </option>

                                            <option value="YELLOW">
                                                Yellow
                                            </option>

                                            <option value="GREEN">
                                                Green
                                            </option>

                                        </select>


                                        <select
                                            value={hazardFilter}
                                            onChange={event =>
                                                setHazardFilter(
                                                    event.target.value
                                                )
                                            }
                                        >

                                            <option value="ALL">
                                                All Hazards
                                            </option>

                                            {hazards.map(
                                                hazard => (

                                                    <option
                                                        key={hazard}
                                                        value={hazard}
                                                    >
                                                        {
                                                            formatHazard(
                                                                hazard
                                                            )
                                                        }
                                                    </option>

                                                )
                                            )}

                                        </select>

                                    </div>

                                </div>


                                {filteredHabitations.length >
                                    0 ? (

                                    <div className="table-wrapper">

                                        <table>

                                            <thead>

                                                <tr>

                                                    <th>
                                                        Habitation
                                                    </th>

                                                    <th>
                                                        Hazard
                                                    </th>

                                                    <th>
                                                        Risk Level
                                                    </th>

                                                    <th>
                                                        Risk Score
                                                    </th>

                                                    <th>
                                                        Vulnerability
                                                    </th>

                                                    <th>
                                                        Population
                                                    </th>

                                                    <th>
                                                        Relocation
                                                    </th>

                                                    <th>
                                                        Assessment
                                                    </th>

                                                </tr>

                                            </thead>


                                            <tbody>

                                                {filteredHabitations.map(
                                                    habitation => {

                                                        const level =
                                                            habitation.riskLevel ||
                                                            habitation.risk ||
                                                            habitation.riskCategory;

                                                        const hazard =
                                                            habitation.hazard ||
                                                            habitation.primaryHazard ||
                                                            habitation.hazardType;

                                                        const score =
                                                            habitation.riskScore ??
                                                            habitation.score;

                                                        const vulnerability =
                                                            habitation.vulnerability ??
                                                            habitation.vulnerabilityScore;

                                                        const relocation =
                                                            habitation.relocationPriority ||
                                                            habitation.priority;


                                                        return (

                                                            <tr
                                                                key={
                                                                    habitation._id ||
                                                                    habitation.id ||
                                                                    habitation.habitationId
                                                                }

                                                                onClick={() =>
                                                                    setSelectedHabitation(
                                                                        habitation
                                                                    )
                                                                }
                                                            >

                                                                <td>

                                                                    <strong>
                                                                        {
                                                                            habitation.name ||
                                                                            habitation.habitationName ||
                                                                            habitation.villageName ||
                                                                            "Unnamed"
                                                                        }
                                                                    </strong>

                                                                    <small>
                                                                        {
                                                                            habitation.district ||
                                                                            "—"
                                                                        }
                                                                    </small>

                                                                </td>


                                                                <td>
                                                                    {
                                                                        formatHazard(
                                                                            hazard
                                                                        )
                                                                    }
                                                                </td>


                                                                <td>

                                                                    <span
                                                                        className={`risk-badge ${getRiskClass(
                                                                            level
                                                                        )}`}
                                                                    >
                                                                        {
                                                                            level ||
                                                                            "—"
                                                                        }
                                                                    </span>

                                                                </td>


                                                                <td>
                                                                    {
                                                                        score ??
                                                                        "—"
                                                                    }
                                                                </td>


                                                                <td>
                                                                    {
                                                                        vulnerability ??
                                                                        "—"
                                                                    }
                                                                </td>


                                                                <td>
                                                                    {
                                                                        formatNumber(
                                                                            habitation.population
                                                                        )
                                                                    }
                                                                </td>


                                                                <td>
                                                                    {
                                                                        relocation ||
                                                                        "—"
                                                                    }
                                                                </td>


                                                                <td>
                                                                    {
                                                                        formatDate(
                                                                            habitation.lastAssessment
                                                                        )
                                                                    }
                                                                </td>

                                                            </tr>

                                                        );

                                                    }
                                                )}

                                            </tbody>

                                        </table>

                                    </div>

                                ) : (

                                    <div className="empty-data">

                                        <Building2 size={40} />

                                        <h3>
                                            No habitation data available
                                        </h3>

                                        <p>
                                            Risk-assessed habitations
                                            will appear here when
                                            the backend and ML
                                            pipeline provide them.
                                        </p>

                                    </div>

                                )}

                            </section>

                        </>

                    )}

                </div>

            </main>


            {/* ================= DETAIL PANEL ================= */}

            {selectedHabitation && (

                <div
                    className="detail-overlay"
                    onClick={() =>
                        setSelectedHabitation(null)
                    }
                >

                    <aside
                        className="detail-panel"
                        onClick={event =>
                            event.stopPropagation()
                        }
                    >

                        <div className="detail-header">

                            <div>

                                <span>
                                    Risk Assessment
                                </span>

                                <h2>
                                    {
                                        selectedHabitation.name ||
                                        selectedHabitation.habitationName ||
                                        selectedHabitation.villageName ||
                                        "Habitation"
                                    }
                                </h2>

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


                        <div className="detail-content">


                            <div className="detail-score">

                                <span>
                                    Risk Score
                                </span>

                                <strong>
                                    {
                                        selectedHabitation.riskScore ??
                                        selectedHabitation.score ??
                                        "—"
                                    }
                                </strong>

                            </div>


                            <div className="detail-grid">


                                <div>
                                    <span>
                                        Risk Level
                                    </span>

                                    <strong>
                                        {
                                            selectedHabitation.riskLevel ||
                                            selectedHabitation.risk ||
                                            "—"
                                        }
                                    </strong>
                                </div>


                                <div>
                                    <span>
                                        Hazard
                                    </span>

                                    <strong>
                                        {formatHazard(
                                            selectedHabitation.hazard ||
                                            selectedHabitation.primaryHazard ||
                                            selectedHabitation.hazardType
                                        )}
                                    </strong>
                                </div>


                                <div>
                                    <span>
                                        Vulnerability
                                    </span>

                                    <strong>
                                        {
                                            selectedHabitation.vulnerability ??
                                            selectedHabitation.vulnerabilityScore ??
                                            "—"
                                        }
                                    </strong>
                                </div>


                                <div>
                                    <span>
                                        Population
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            selectedHabitation.population
                                        )}
                                    </strong>
                                </div>


                                <div>
                                    <span>
                                        Population at Risk
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            selectedHabitation.populationAtRisk ??
                                            selectedHabitation.affectedPopulation
                                        )}
                                    </strong>
                                </div>


                                <div>
                                    <span>
                                        Relocation Priority
                                    </span>

                                    <strong>
                                        {
                                            selectedHabitation.relocationPriority ||
                                            selectedHabitation.priority ||
                                            "—"
                                        }
                                    </strong>
                                </div>

                            </div>


                            <div className="detail-block">

                                <h3>
                                    Model Confidence
                                </h3>

                                <p>

                                    {
                                        selectedHabitation.modelConfidence !==
                                        null &&
                                        selectedHabitation.modelConfidence !==
                                        undefined
                                            ? `${selectedHabitation.modelConfidence}%`
                                            : "Not available yet"
                                    }

                                </p>

                            </div>


                            <div className="detail-block">

                                <h3>
                                    Risk Factors
                                </h3>


                                {selectedHabitation.riskFactors?.length >
                                    0 ? (

                                    <ul>

                                        {selectedHabitation.riskFactors.map(
                                            (factor, index) => (

                                                <li
                                                    key={index}
                                                >

                                                    {
                                                        typeof factor ===
                                                            "string"
                                                            ? factor
                                                            : factor.name ||
                                                            factor.label ||
                                                            "Risk factor"
                                                    }

                                                </li>

                                            )
                                        )}

                                    </ul>

                                ) : (

                                    <p>
                                        No risk factors supplied
                                        by the ML backend.
                                    </p>

                                )}

                            </div>


                            <div className="detail-block">

                                <h3>
                                    Last Assessment
                                </h3>

                                <p>
                                    {
                                        formatDate(
                                            selectedHabitation.lastAssessment
                                        )
                                    }
                                </p>

                            </div>

                        </div>

                    </aside>

                </div>

            )}

        </div>
    );
}


export default RiskIntelligence;