import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    MapPin,
    Users,
    Home,
    AlertTriangle,
    ArrowRightLeft,
    ShieldCheck,
    Clock,
    CheckCircle2,
    ChevronRight,
} from "lucide-react";

import AuthoritySidebar from "../components/AuthoritySidebar";
import AuthorityTopbar from "../components/AuthorityTopbar";

import "./Relocation.css";

const relocationData = [
    {
        id: 1,
        habitation: "Riverbank Zone A",
        location: "Prayagraj",
        population: 1240,
        risk: "Critical",
        safeSite: "Community Shelter - Sector 4",
        distance: "2.4 km",
        progress: 72,
        status: "In Progress",
    },
    {
        id: 2,
        habitation: "Lowland Settlement B",
        location: "Prayagraj",
        population: 860,
        risk: "High",
        safeSite: "Relief Camp - Sector 7",
        distance: "3.1 km",
        progress: 45,
        status: "Planning",
    },
    {
        id: 3,
        habitation: "Canal Side Colony",
        location: "Prayagraj",
        population: 540,
        risk: "High",
        safeSite: "Government School - Zone 2",
        distance: "1.8 km",
        progress: 25,
        status: "Planning",
    },
    {
        id: 4,
        habitation: "Floodplain Village",
        location: "Prayagraj",
        population: 920,
        risk: "Medium",
        safeSite: "Community Hall - Sector 5",
        distance: "4.2 km",
        progress: 90,
        status: "Ready",
    },
];

const Relocation = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedHabitation, setSelectedHabitation] = useState(null);

    const criticalCount = relocationData.filter(
        (item) => item.risk === "Critical"
    ).length;

    const totalPopulation = relocationData.reduce(
        (total, item) => total + item.population,
        0
    );

    const completedCount = relocationData.filter(
        (item) => item.progress >= 90
    ).length;

    const activePlans = relocationData.filter(
        (item) => item.status === "In Progress" || item.status === "Planning"
    ).length;

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

                {/* TOPBAR */}
                <AuthorityTopbar />

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

                        <div className="header-action">
                            <button className="primary-action">
                                <ArrowRightLeft size={18} />
                                Create Relocation Plan
                            </button>
                        </div>
                    </motion.section>

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
                                <strong>{criticalCount}</strong>
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
                                <strong>{totalPopulation.toLocaleString()}</strong>
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
                                <span>Active Plans</span>
                                <strong>{activePlans}</strong>
                                <small>Currently being coordinated</small>
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
                                <span>Ready Relocations</span>
                                <strong>{completedCount}</strong>
                                <small>Safe-site arrangements ready</small>
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
                                        Habititation-wise relocation requirements
                                    </p>
                                </div>

                                <span className="live-indicator">
                                    <span></span>
                                    Live
                                </span>
                            </div>

                            <div className="habitation-list">

                                {relocationData.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        className={`habitation-row ${
                                            selectedHabitation?.id === item.id
                                                ? "selected"
                                                : ""
                                        }`}
                                        whileHover={{ y: -2 }}
                                        onClick={() =>
                                            setSelectedHabitation(item)
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
                                ))}

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
                                                {selectedHabitation.safeSite}
                                            </strong>
                                        </div>

                                        <div>
                                            <MapPin size={18} />
                                            <span>Distance</span>
                                            <strong>
                                                {selectedHabitation.distance}
                                            </strong>
                                        </div>

                                    </div>

                                    <div className="progress-section">

                                        <div className="progress-heading">
                                            <span>Relocation Progress</span>
                                            <strong>
                                                {selectedHabitation.progress}%
                                            </strong>
                                        </div>

                                        <div className="progress-bar">
                                            <div
                                                style={{
                                                    width: `${selectedHabitation.progress}%`,
                                                }}
                                            ></div>
                                        </div>

                                        <div className="progress-status">
                                            <Clock size={15} />
                                            {selectedHabitation.status}
                                        </div>

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
                                    Track the progress of relocation operations
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
                                        High-risk habitation detected
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
                                    Overview of current relocation operations
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
                                        <th>Safe Site</th>
                                        <th>Distance</th>
                                        <th>Progress</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {relocationData.map((item) => (
                                        <tr key={item.id}>

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
                                                {item.safeSite}
                                            </td>

                                            <td>
                                                {item.distance}
                                            </td>

                                            <td>
                                                <div className="table-progress">
                                                    <div className="mini-progress">
                                                        <span
                                                            style={{
                                                                width: `${item.progress}%`,
                                                            }}
                                                        ></span>
                                                    </div>

                                                    <small>
                                                        {item.progress}%
                                                    </small>
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`status-badge ${item.status
                                                        .toLowerCase()
                                                        .replace(" ", "-")}`}
                                                >
                                                    {item.status}
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