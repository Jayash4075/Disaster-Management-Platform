import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    MapPin, Users, Home, AlertTriangle, ArrowRightLeft,
    ShieldCheck, Clock, CheckCircle2, ChevronRight,
} from "lucide-react";
import AuthoritySidebar from "../components/AuthoritySidebar";

import api from "../api/axios";
import "./Relocation.css";

const Relocation = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedHabitation, setSelectedHabitation] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);
    const [siteLoading, setSiteLoading] = useState(false);
    const [relocationData, setRelocationData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchPriorities = async () => {
            try {
                setLoading(true);
                setError("");
                const response = await api.get("/api/relocation/priority-villages");
                const villages = response.data?.villages || [];
                setRelocationData(villages.map(v => ({
                    id: v.habitationId,
                    habitation: v.name,
                    location: "Prayagraj",
                    population: v.population || 0,
                    risk: v.riskLevel === "RED" ? "Critical" : v.riskLevel === "ORANGE" ? "High" : "Medium",
                    relocationPriority: v.relocationPriority,
                    riskScore: v.riskScore,
                })));
            } catch (err) {
                console.error("Relocation priorities error:", err);
                setError(err.response?.data?.message || "Unable to load relocation priorities.");
                setRelocationData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPriorities();
    }, []);

    const handleSelectHabitation = async (item) => {
        setSelectedHabitation(item);
        setSelectedSite(null);
        setSiteLoading(true);
        try {
            const response = await api.get(`/api/relocation/${item.id}/site`);
            setSelectedSite(response.data);
        } catch (err) {
            console.error("Site recommendation error:", err);
            setSelectedSite(null);
        } finally {
            setSiteLoading(false);
        }
    };

    const criticalCount = relocationData.filter(item => item.risk === "Critical").length;
    const totalPopulation = relocationData.reduce((total, item) => total + item.population, 0);
    const immediateCount = relocationData.filter(item => item.relocationPriority === "IMMEDIATE").length;
    const activePlans = relocationData.length; // every listed village is an active relocation concern
    const readyCount = relocationData.filter(item => item.relocationPriority === "SHORT_TERM" || item.relocationPriority === "MEDIUM_TERM").length;

    return (
        <div className="authority-layout">

            {/* SIDEBAR */}
            <AuthoritySidebar
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
            />

            {/* MAIN CONTENT */}
            <div
                className={`authority-main ${
                    sidebarCollapsed ? "sidebar-collapsed" : ""
                }`}
            >


                <main className="relocation-page">

                    {/* PAGE HEADER */}
                    <motion.section
                        className="relocation-header"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div>
                            <div className="breadcrumb">
                                Authority Dashboard
                                <ChevronRight size={15} />
                                Relocation Planning
                            </div>

                            <h1>Relocation Planning</h1>

                            <p>
                                Plan and monitor the relocation of populations
                                from high-risk habitations to identified safe sites.
                            </p>
                        </div>
                    </motion.section>

                    {/* ERROR */}
                    {error && (
                        <div className="relocation-error" style={{ marginBottom: 16, color: "#b91c1c" }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* SUMMARY CARDS */}
                    <section className="relocation-stats">

                        <motion.div
                            className="relocation-stat-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="stat-icon critical-icon">
                                <AlertTriangle size={21} />
                            </div>

                            <div>
                                <span>Critical Zones</span>
                                <strong>{loading ? "—" : criticalCount}</strong>
                                <small>Require immediate action</small>
                            </div>
                        </motion.div>

                        <motion.div
                            className="relocation-stat-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="stat-icon people-icon">
                                <Users size={21} />
                            </div>

                            <div>
                                <span>People Affected</span>
                                <strong>{loading ? "—" : totalPopulation.toLocaleString()}</strong>
                                <small>Across identified habitations</small>
                            </div>
                        </motion.div>

                        <motion.div
                            className="relocation-stat-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="stat-icon plan-icon">
                                <ArrowRightLeft size={21} />
                            </div>

                            <div>
                                <span>Villages Needing Relocation</span>
                                <strong>{loading ? "—" : activePlans}</strong>
                                <small>Currently identified for planning</small>
                            </div>
                        </motion.div>

                        <motion.div
                            className="relocation-stat-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="stat-icon safe-icon">
                                <ShieldCheck size={21} />
                            </div>

                            <div>
                                <span>Immediate Priority</span>
                                <strong>{loading ? "—" : immediateCount}</strong>
                                <small>Require urgent relocation</small>
                            </div>
                        </motion.div>

                    </section>

                    {/* MAIN GRID */}
                    <section className="relocation-grid">

                        {/* LEFT - PRIORITY HABITATIONS */}
                        <motion.div
                            className="relocation-panel habitation-panel"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >

                            <div className="panel-header">
                                <div>
                                    <h2>Relocation Priority List</h2>
                                    <p>
                                        Habitation-wise relocation requirements
                                    </p>
                                </div>

                                <span className="live-indicator">
                                    <span></span>
                                    Live
                                </span>
                            </div>

                            <div className="habitation-list">

                                {loading ? (
                                    <p style={{ padding: 20 }}>Loading relocation priorities...</p>
                                ) : relocationData.length === 0 ? (
                                    <div className="empty-selection">
                                        <div className="empty-icon">
                                            <ShieldCheck size={30} />
                                        </div>
                                        <h3>No villages currently need relocation</h3>
                                        <p>Assess villages to populate this list.</p>
                                    </div>
                                ) : (
                                    relocationData.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            className={`habitation-row ${
                                                selectedHabitation?.id === item.id
                                                    ? "selected"
                                                    : ""
                                            }`}
                                            whileHover={{ y: -2 }}
                                            onClick={() =>
                                                handleSelectHabitation(item)
                                            }
                                        >

                                            <div className="habitation-main">

                                                <div className="location-icon">
                                                    <MapPin size={18} />
                                                </div>

                                                <div>
                                                    <h3>{item.habitation}</h3>

                                                    <span className="location-name">
                                                        {item.location}
                                                    </span>
                                                </div>

                                            </div>

                                            <div className="population-info">
                                                <Users size={15} />
                                                {item.population.toLocaleString()}
                                            </div>

                                            <div>
                                                <span
                                                    className={`risk-badge ${item.risk.toLowerCase()}`}
                                                >
                                                    {item.risk}
                                                </span>
                                            </div>

                                            <div className="row-arrow">
                                                <ChevronRight size={18} />
                                            </div>

                                        </motion.div>
                                    ))
                                )}

                            </div>
                        </motion.div>

                        {/* RIGHT - SELECTED HABITATION */}
                        <motion.div
                            className="relocation-panel detail-panel"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >

                            {selectedHabitation ? (
                                <>
                                    <div className="panel-header">
                                        <div>
                                            <h2>Relocation Details</h2>
                                            <p>
                                                {selectedHabitation.habitation}
                                            </p>
                                        </div>

                                        <span
                                            className={`risk-badge ${selectedHabitation.risk.toLowerCase()}`}
                                        >
                                            {selectedHabitation.risk}
                                        </span>
                                    </div>

                                    <div className="detail-location">
                                        <MapPin size={18} />
                                        <div>
                                            <strong>
                                                {selectedHabitation.location}
                                            </strong>

                                            <span>
                                                High-risk habitation identified
                                                for relocation
                                            </span>
                                        </div>
                                    </div>

                                    <div className="detail-stats">

                                        <div>
                                            <Users size={18} />
                                            <span>Population</span>
                                            <strong>
                                                {selectedHabitation.population.toLocaleString()}
                                            </strong>
                                        </div>

                                        <div>
                                            <Home size={18} />
                                            <span>Safe Site</span>
                                            <strong>
                                                {siteLoading
                                                    ? "Calculating..."
                                                    : selectedSite?.recommendedSite?.name || "No suitable site found"}
                                            </strong>
                                        </div>

                                        <div>
                                            <MapPin size={18} />
                                            <span>Available Capacity</span>
                                            <strong>
                                                {siteLoading
                                                    ? "—"
                                                    : selectedSite?.recommendedSite?.capacity?.available ?? "—"}
                                            </strong>
                                        </div>

                                    </div>

                                    {selectedSite?.reasons?.length > 0 && (
                                        <div className="progress-section">
                                            <div className="progress-heading">
                                                <span>Why this site</span>
                                            </div>
                                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                {selectedSite.reasons.map((reason, i) => (
                                                    <li key={i}>{reason}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="progress-status">
                                        <Clock size={15} />
                                        {selectedHabitation.relocationPriority || "Not yet prioritized"}
                                    </div>

                                    <div className="detail-actions">

                                        <button className="secondary-action">
                                            <MapPin size={17} />
                                            View on Map
                                        </button>

                                        <button className="primary-action">
                                            <ArrowRightLeft size={17} />
                                            Manage Plan
                                        </button>

                                    </div>
                                </>
                            ) : (
                                <div className="empty-selection">

                                    <div className="empty-icon">
                                        <MapPin size={30} />
                                    </div>

                                    <h3>Select a habitation</h3>

                                    <p>
                                        Select a habitation from the priority
                                        list to view relocation details.
                                    </p>

                                </div>
                            )}

                        </motion.div>

                    </section>

                    {/* RELOCATION WORKFLOW */}
                    <motion.section
                        className="workflow-panel"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >

                        <div className="panel-header">
                            <div>
                                <h2>Relocation Workflow</h2>
                                <p>
                                    General stages of the relocation process
                                </p>
                            </div>
                        </div>

                        <div className="workflow">

                            <div className="workflow-step completed">
                                <div className="workflow-circle">
                                    <CheckCircle2 size={18} />
                                </div>

                                <div>
                                    <strong>Risk Identification</strong>
                                    <span>
                                        High-risk habitation detected via ML assessment
                                    </span>
                                </div>
                            </div>

                            <div className="workflow-line"></div>

                            <div className="workflow-step completed">
                                <div className="workflow-circle">
                                    <CheckCircle2 size={18} />
                                </div>

                                <div>
                                    <strong>Safe Site Selection</strong>
                                    <span>
                                        Suitable relocation sites identified
                                    </span>
                                </div>
                            </div>

                            <div className="workflow-line"></div>

                            <div className="workflow-step active">
                                <div className="workflow-circle">
                                    <ArrowRightLeft size={18} />
                                </div>

                                <div>
                                    <strong>Relocation Planning</strong>
                                    <span>
                                        Assign resources and coordinate movement
                                    </span>
                                </div>
                            </div>

                            <div className="workflow-line"></div>

                            <div className="workflow-step">
                                <div className="workflow-circle">
                                    <ShieldCheck size={18} />
                                </div>

                                <div>
                                    <strong>Relocation Complete</strong>
                                    <span>
                                        Population safely moved to site
                                    </span>
                                </div>
                            </div>

                        </div>

                    </motion.section>

                    {/* PLANNING TABLE */}
                    <motion.section
                        className="table-panel"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >

                        <div className="panel-header">
                            <div>
                                <h2>Relocation Plans</h2>
                                <p>
                                    Overview of all villages currently flagged for relocation
                                </p>
                            </div>
                        </div>

                        <div className="table-wrapper">

                            <table>

                                <thead>
                                    <tr>
                                        <th>Habitation</th>
                                        <th>Population</th>
                                        <th>Risk</th>
                                        <th>Risk Score</th>
                                        <th>Priority</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {relocationData.map((item) => (
                                        <tr key={item.id} onClick={() => handleSelectHabitation(item)} style={{ cursor: "pointer" }}>

                                            <td>
                                                <div className="table-location">
                                                    <MapPin size={16} />
                                                    <span>
                                                        {item.habitation}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                {item.population.toLocaleString()}
                                            </td>

                                            <td>
                                                <span
                                                    className={`risk-badge ${item.risk.toLowerCase()}`}
                                                >
                                                    {item.risk}
                                                </span>
                                            </td>

                                            <td>
                                                {item.riskScore ?? "—"}
                                            </td>

                                            <td>
                                                <span className={`status-badge ${(item.relocationPriority || "").toLowerCase().replace("_", "-")}`}>
                                                    {item.relocationPriority || "—"}
                                                </span>
                                            </td>

                                        </tr>
                                    ))}

                                </tbody>

                            </table>

                        </div>

                    </motion.section>

                </main>
            </div>
        </div>
    );
};

export default Relocation;