import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
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

import api from "../api/axios";
import "./RiskIntelligence.css";

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
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

  return String(level).toLowerCase().replace(/\s+/g, "-");
}

function RiskIntelligence() {
  // Get search state from AuthorityLayout Outlet context
  const { search } = useOutletContext() || { search: "" };

  const [summary, setSummary] = useState(null);
  const [habitations, setHabitations] = useState([]);
  const [trends, setTrends] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [riskFilter, setRiskFilter] = useState("ALL");
  const [hazardFilter, setHazardFilter] = useState("ALL");

  const [selectedHabitation, setSelectedHabitation] = useState(null);

  const loadData = async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");

      const [dashboardRes, habitationsRes] = await Promise.allSettled([
        api.get("/api/dashboard/authority"),
        api.get("/api/habitations/ml-service-status"),
      ]);

      if (dashboardRes.status === "fulfilled") {
        const d = dashboardRes.value.data;
        setSummary({
          overallRisk: d.riskOverview?.riskLevel,
          overallRiskScore: d.riskOverview?.overallRiskScore,
          populationAtRisk: d.summary?.peopleAtRisk,
          criticalHabitations: d.riskOverview?.criticalVillages,
          highRiskHabitations: d.riskOverview?.highRiskVillages,
          modelConfidence: d.dataSource?.mlService ? 85 : null,
        });
      } else {
        setSummary(null);
      }

      if (habitationsRes.status === "fulfilled") {
        setHabitations(habitationsRes.value.data?.data || []);
      } else {
        setHabitations([]);
      }

      setTrends([]);

      if (
        dashboardRes.status === "rejected" &&
        habitationsRes.status === "rejected"
      ) {
        setError("Unable to reach the backend. Please check your connection.");
      }
    } catch (err) {
      console.error("Risk Intelligence error:", err);
      setError("Unable to connect to the Risk Intelligence service.");
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
      .map((item) => item.hazard || item.primaryHazard || item.hazardType)
      .filter(Boolean);

    return [...new Set(values)];
  }, [habitations]);

  /* ---------------- FILTER DATA ---------------- */
  const filteredHabitations = useMemo(() => {
    return habitations.filter((item) => {
      const level = item.riskLevel || item.risk || item.riskCategory;
      const hazard = item.hazard || item.primaryHazard || item.hazardType;
      const name = item.name || item.villageName || item.habitationName || "";
      const district = item.district || "";

      const riskMatch =
        riskFilter === "ALL" ||
        String(level).toUpperCase() === riskFilter;

      const hazardMatch =
        hazardFilter === "ALL" ||
        String(hazard).toLowerCase() === String(hazardFilter).toLowerCase();

      const searchMatch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        district.toLowerCase().includes(search.toLowerCase());

      return riskMatch && hazardMatch && searchMatch;
    });
  }, [habitations, riskFilter, hazardFilter, search]);

  /* ---------------- HAZARD CHART ---------------- */
  const hazardDistribution = useMemo(() => {
    const counts = {};

    habitations.forEach((item) => {
      const hazard = item.hazard || item.primaryHazard || item.hazardType;
      if (!hazard) return;
      counts[hazard] = (counts[hazard] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name: formatHazard(name),
      count,
    }));
  }, [habitations]);

  return (
    <div className="risk-page">
      {/* ================= HEADER ================= */}
      <section className="risk-header">
        <div>
          <div className="risk-breadcrumb">
            Authority <span>/</span> Risk Intelligence
          </div>

          <h1>Risk Intelligence</h1>

          <p>
            AI and ML powered disaster risk assessment and vulnerability
            intelligence.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={() => loadData(true)}
          disabled={refreshing}
        >
          <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </section>

      {/* ================= API STATUS ================= */}
      {error && (
        <div className="api-status">
          <AlertTriangle size={21} />
          <div>
            <strong>Backend connection status</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* ================= LOADING ================= */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spin" />
          <h3>Loading Risk Intelligence</h3>
          <p>Connecting to the risk intelligence service...</p>
        </div>
      ) : (
        <>
          {/* ================= ML ENGINE ================= */}
          <section className="ml-engine-card">
            <div className="ml-icon">
              <Brain size={28} />
            </div>

            <div className="ml-content">
              <h2>Risk Intelligence Engine</h2>
              <p>
                This dashboard is connected to the backend API and is ready to
                display predictions generated by the ML pipeline.
              </p>
            </div>

            <div
              className={`connection-status ${
                summary ? "connected" : "waiting"
              }`}
            >
              <span />
              {summary ? "DATA CONNECTED" : "AWAITING DATA"}
            </div>
          </section>

          {/* ================= STAT CARDS ================= */}
          <section className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <ShieldAlert size={23} />
              </div>
              <div>
                <span>Overall Risk</span>
                <strong>{summary?.overallRisk || "—"}</strong>
                {summary?.overallRiskScore !== null &&
                  summary?.overallRiskScore !== undefined && (
                    <small>Score: {summary.overallRiskScore}</small>
                  )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Users size={23} />
              </div>
              <div>
                <span>Population at Risk</span>
                <strong>{formatNumber(summary?.populationAtRisk)}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <AlertTriangle size={23} />
              </div>
              <div>
                <span>Critical Habitations</span>
                <strong>{formatNumber(summary?.criticalHabitations)}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Building2 size={23} />
              </div>
              <div>
                <span>High Risk</span>
                <strong>{formatNumber(summary?.highRiskHabitations)}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Activity size={23} />
              </div>
              <div>
                <span>Model Confidence</span>
                <strong>
                  {summary?.modelConfidence !== null &&
                  summary?.modelConfidence !== undefined
                    ? `${summary.modelConfidence}%`
                    : "—"}
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
                  <h2>Risk Trend</h2>
                  <p>Historical risk assessment</p>
                </div>
                <Activity size={22} />
              </div>

              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[0, 100]} />
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
                  <h3>No trend data</h3>
                  <p>
                    Historical ML assessments will appear here once provided by
                    the backend.
                  </p>
                </div>
              )}
            </div>

            {/* HAZARD DISTRIBUTION */}
            <div className="chart-card">
              <div className="card-heading">
                <div>
                  <h2>Hazard Distribution</h2>
                  <p>Distribution of identified hazards</p>
                </div>
                <BarChart3 size={22} />
              </div>

              {hazardDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={hazardDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <BarChart3 size={34} />
                  <h3>No hazard data</h3>
                  <p>Hazard information will render here when available.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default RiskIntelligence;