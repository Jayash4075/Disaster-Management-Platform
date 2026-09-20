import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Resources.css";

const resources = [
    {
        id: 1,
        title: "Emergency Shelters",
        icon: "🏠",
        description: "Find safe shelters and temporary accommodation near you.",
        available: "12 shelters available",
    },
    {
        id: 2,
        title: "Food & Water",
        icon: "💧",
        description: "Locate nearby food and clean drinking water distribution points.",
        available: "18 locations available",
    },
    {
        id: 3,
        title: "Medical Supplies",
        icon: "💊",
        description: "Find essential medicines and emergency medical supplies.",
        available: "9 centers available",
    },
    {
        id: 4,
        title: "Clothing",
        icon: "👕",
        description: "Find clothing and essential items provided by relief centers.",
        available: "7 centers available",
    },
    {
        id: 5,
        title: "Emergency Supplies",
        icon: "🎒",
        description: "Access emergency kits, batteries, flashlights and other supplies.",
        available: "11 locations available",
    },
    {
        id: 6,
        title: "Transportation",
        icon: "🚑",
        description: "Find available emergency transportation and evacuation support.",
        available: "6 services available",
    },
];

function Resources() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    const filteredResources = resources.filter((resource) =>
        resource.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="resources-page">

            {/* Navbar */}
            <nav className="resources-navbar">
                <div className="resources-logo" onClick={() => navigate("/dashboard")}>
                    Res<span>Q</span>
                </div>

                <div className="resources-nav-links">
                    <button onClick={() => navigate("/dashboard")}>
                        Dashboard
                    </button>

                    <button className="active-nav">
                        Resources
                    </button>

                    <button onClick={() => navigate("/volunteers")}>
                        Volunteers & NGOs
                    </button>
                </div>

                <button
                    className="back-dashboard-btn"
                    onClick={() => navigate("/dashboard")}
                >
                    ← Dashboard
                </button>
            </nav>

            {/* Main Content */}
            <main className="resources-container">

                {/* Header */}
                <section className="resources-header">
                    <div>
                        <p className="resources-label">RESQ SUPPORT</p>

                        <h1>Emergency Resources</h1>

                        <p>
                            Find essential supplies, shelters and emergency
                            support available near you.
                        </p>
                    </div>

                    <div className="location-box">
                        <span>📍</span>
                        <div>
                            <small>Your Location</small>
                            <strong>Location detected</strong>
                        </div>
                    </div>
                </section>

                {/* Search */}
                <section className="resources-search-section">
                    <div className="search-box">
                        <span>🔍</span>

                        <input
                            type="text"
                            placeholder="Search for resources..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <button className="filter-btn">
                        ☰ Filter
                    </button>
                </section>

                {/* Quick Info */}
                <section className="resource-info">
                    <div className="info-item">
                        <span>📦</span>
                        <div>
                            <strong>63+</strong>
                            <small>Resources nearby</small>
                        </div>
                    </div>

                    <div className="info-item">
                        <span>🟢</span>
                        <div>
                            <strong>Available</strong>
                            <small>Services currently active</small>
                        </div>
                    </div>

                    <div className="info-item">
                        <span>📍</span>
                        <div>
                            <strong>Nearby</strong>
                            <small>Based on your location</small>
                        </div>
                    </div>
                </section>

                {/* Resource Cards */}
                <section className="resources-section">

                    <div className="section-heading">
                        <div>
                            <h2>Available Resources</h2>
                            <p>Choose the assistance you need</p>
                        </div>
                    </div>

                    <div className="resources-grid">

                        {filteredResources.length > 0 ? (
                            filteredResources.map((resource) => (
                                <div className="resource-card" key={resource.id}>

                                    <div className="resource-card-top">
                                        <div className="resource-icon">
                                            {resource.icon}
                                        </div>

                                        <span className="available-badge">
                                            Available
                                        </span>
                                    </div>

                                    <h3>{resource.title}</h3>

                                    <p>{resource.description}</p>

                                    <div className="resource-card-bottom">

                                        <span className="resource-count">
                                            {resource.available}
                                        </span>

                                        <button
                                            onClick={() =>
                                                alert(
                                                    `${resource.title} details will be available here.`
                                                )
                                            }
                                        >
                                            View Details →
                                        </button>

                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">
                                <span>🔎</span>
                                <h3>No resources found</h3>
                                <p>Try searching for something else.</p>
                            </div>
                        )}

                    </div>
                </section>

                {/* Emergency Help */}
                <section className="resources-emergency">

                    <div>
                        <span className="emergency-icon">🆘</span>

                        <div>
                            <h3>Need immediate emergency assistance?</h3>
                            <p>
                                If you are in immediate danger, use the SOS
                                feature to request emergency help.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate("/sos")}
                    >
                        Activate SOS
                    </button>

                </section>

            </main>
        </div>
    );
}

export default Resources;