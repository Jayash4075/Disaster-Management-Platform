import { useMemo, useState } from "react";
import {
    AlertTriangle,
    Clock3,
    MapPin,
    Search,
    ShieldAlert,
    Users,
    X,
} from "lucide-react";

import AuthoritySidebar from "../components/AuthoritySidebar";
import AuthorityTopbar from "../components/AuthorityTopbar";

import "./Emergencies.css";

function Emergencies() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedIncident, setSelectedIncident] = useState(null);

    /*
     * Backend-ready structure.
     *
     * Later this array will come from something like:
     * GET /api/emergencies
     *
     * We are intentionally keeping it empty for now rather than
     * creating fake emergency records.
     */
    const incidents = [];

    const filteredIncidents = useMemo(() => {
        return incidents.filter((incident) => {
            const matchesSearch =
                !search ||
                incident.id?.toLowerCase().includes(search.toLowerCase()) ||
                incident.type?.toLowerCase().includes(search.toLowerCase()) ||
                incident.location?.toLowerCase().includes(search.toLowerCase());

            const matchesStatus =
                statusFilter === "all" ||
                incident.status?.toLowerCase() === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [incidents, search, statusFilter]);

    return (
        <div
            className={`authority-shell ${
                sidebarCollapsed ? "sidebar-collapsed" : ""
            }`}
        >
            {/* SIDEBAR */}
            <AuthoritySidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((prev) => !prev)}
            />

            {/* MAIN AREA */}
            <div className="authority-main">
                <AuthorityTopbar
                    search={search}
                    setSearch={setSearch}
                    onMenuClick={() => setSidebarCollapsed((prev) => !prev)}
                />

                <main className="emergencies-page">

                    {/* PAGE HEADER */}
                    <section className="emergencies-header">
                        <div>
                            <div className="emergencies-kicker">
                                <span></span>
                                EMERGENCY RESPONSE
                            </div>

                            <h1>Emergency & Incident Monitoring</h1>

                            <p>
                                Monitor reported emergencies, assess incident
                                severity and coordinate disaster response.
                            </p>
                        </div>
                    </section>


                    {/* SUMMARY */}
                    <section className="emergency-stats">

                        <div className="emergency-stat-card">
                            <div className="emergency-stat-icon red">
                                <ShieldAlert size={20} />
                            </div>

                            <div>
                                <span>Active Emergencies</span>
                                <strong>
                                    {incidents.filter(
                                        (item) =>
                                            item.status === "active"
                                    ).length}
                                </strong>
                            </div>
                        </div>


                        <div className="emergency-stat-card">
                            <div className="emergency-stat-icon orange">
                                <AlertTriangle size={20} />
                            </div>

                            <div>
                                <span>High Priority</span>
                                <strong>
                                    {incidents.filter(
                                        (item) =>
                                            item.severity === "high"
                                    ).length}
                                </strong>
                            </div>
                        </div>


                        <div className="emergency-stat-card">
                            <div className="emergency-stat-icon blue">
                                <Clock3 size={20} />
                            </div>

                            <div>
                                <span>Pending Response</span>
                                <strong>
                                    {incidents.filter(
                                        (item) =>
                                            item.status === "pending"
                                    ).length}
                                </strong>
                            </div>
                        </div>


                        <div className="emergency-stat-card">
                            <div className="emergency-stat-icon green">
                                <Users size={20} />
                            </div>

                            <div>
                                <span>Teams Assigned</span>
                                <strong>
                                    {
                                        incidents.filter(
                                            (item) => item.team
                                        ).length
                                    }
                                </strong>
                            </div>
                        </div>

                    </section>


                    {/* INCIDENT PANEL */}
                    <section className="emergency-panel">

                        {/* PANEL HEADER */}
                        <div className="emergency-panel-header">

                            <div>
                                <h2>Reported Incidents</h2>
                                <p>
                                    Emergency reports requiring authority
                                    monitoring and response.
                                </p>
                            </div>

                            <div className="emergency-controls">

                                <div className="emergency-search">
                                    <Search size={16} />

                                    <input
                                        type="text"
                                        placeholder="Search incidents..."
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>


                                <select
                                    value={statusFilter}
                                    onChange={(event) =>
                                        setStatusFilter(event.target.value)
                                    }
                                    className="emergency-filter"
                                >
                                    <option value="all">
                                        All Status
                                    </option>

                                    <option value="active">
                                        Active
                                    </option>

                                    <option value="pending">
                                        Pending
                                    </option>

                                    <option value="resolved">
                                        Resolved
                                    </option>
                                </select>

                            </div>

                        </div>


                        {/* INCIDENT LIST */}
                        <div className="incident-table">

                            <div className="incident-table-header">
                                <span>INCIDENT</span>
                                <span>LOCATION</span>
                                <span>SEVERITY</span>
                                <span>STATUS</span>
                                <span>RESPONSE TEAM</span>
                                <span></span>
                            </div>


                            {filteredIncidents.length === 0 ? (

                                <div className="incident-empty">

                                    <div className="incident-empty-icon">
                                        <ShieldAlert size={25} />
                                    </div>

                                    <h3>No emergency incidents</h3>

                                    <p>
                                        No emergency reports are currently
                                        available. Once incidents are received
                                        from the emergency reporting system,
                                        they will appear here.
                                    </p>

                                </div>

                            ) : (

                                filteredIncidents.map((incident) => (

                                    <div
                                        className="incident-table-row"
                                        key={incident.id}
                                    >

                                        <div className="incident-name">
                                            <div className="incident-type-icon">
                                                <AlertTriangle size={17} />
                                            </div>

                                            <div>
                                                <strong>
                                                    {incident.type}
                                                </strong>

                                                <span>
                                                    {incident.id}
                                                </span>
                                            </div>
                                        </div>


                                        <div className="incident-location">
                                            <MapPin size={15} />

                                            <span>
                                                {incident.location}
                                            </span>
                                        </div>


                                        <div>
                                            <span
                                                className={`severity-badge ${
                                                    incident.severity
                                                }`}
                                            >
                                                {incident.severity}
                                            </span>
                                        </div>


                                        <div>
                                            <span
                                                className={`status-badge ${
                                                    incident.status
                                                }`}
                                            >
                                                {incident.status}
                                            </span>
                                        </div>


                                        <div className="incident-team">
                                            <Users size={15} />

                                            {incident.team || "Unassigned"}
                                        </div>


                                        <button
                                            className="view-incident-button"
                                            onClick={() =>
                                                setSelectedIncident(
                                                    incident
                                                )
                                            }
                                        >
                                            View
                                        </button>

                                    </div>

                                ))

                            )}

                        </div>

                    </section>

                </main>
            </div>


            {/* INCIDENT DETAILS MODAL */}
            {selectedIncident && (

                <div
                    className="emergency-modal-backdrop"
                    onClick={() => setSelectedIncident(null)}
                >

                    <div
                        className="emergency-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="emergency-modal-close"
                            onClick={() =>
                                setSelectedIncident(null)
                            }
                        >
                            <X size={19} />
                        </button>


                        <div className="modal-emergency-icon">
                            <AlertTriangle size={22} />
                        </div>


                        <span className="modal-emergency-kicker">
                            INCIDENT DETAILS
                        </span>

                        <h2>
                            {selectedIncident.type}
                        </h2>


                        <div className="modal-incident-location">
                            <MapPin size={16} />

                            {selectedIncident.location}
                        </div>


                        <div className="modal-incident-grid">

                            <div>
                                <span>Incident ID</span>
                                <strong>
                                    {selectedIncident.id}
                                </strong>
                            </div>

                            <div>
                                <span>Severity</span>
                                <strong>
                                    {selectedIncident.severity}
                                </strong>
                            </div>

                            <div>
                                <span>Status</span>
                                <strong>
                                    {selectedIncident.status}
                                </strong>
                            </div>

                            <div>
                                <span>Response Team</span>
                                <strong>
                                    {selectedIncident.team ||
                                        "Unassigned"}
                                </strong>
                            </div>

                        </div>


                        <div className="modal-incident-description">

                            <span>Description</span>

                            <p>
                                {selectedIncident.description ||
                                    "No description available."}
                            </p>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Emergencies;