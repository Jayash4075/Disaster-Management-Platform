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

import "./Emergencies.css";


function Emergencies() {

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedIncident, setSelectedIncident] = useState(null);


    /*
     * ============================================================
     * BACKEND READY STRUCTURE
     * ============================================================
     *
     * Later replace this with data from:
     *
     * GET /api/sos
     *
     * Do not create fake emergency records here.
     */

    const incidents = [];


    /*
     * ============================================================
     * FILTER INCIDENTS
     * ============================================================
     */

    const filteredIncidents = useMemo(() => {

        const searchValue =
            search.trim().toLowerCase();


        return incidents.filter((incident) => {

            const matchesSearch =
                !searchValue ||
                incident.id
                    ?.toLowerCase()
                    .includes(searchValue) ||
                incident.type
                    ?.toLowerCase()
                    .includes(searchValue) ||
                incident.location
                    ?.toLowerCase()
                    .includes(searchValue);


            const matchesStatus =
                statusFilter === "all" ||
                incident.status
                    ?.toLowerCase() === statusFilter;


            return (
                matchesSearch &&
                matchesStatus
            );

        });

    }, [
        incidents,
        search,
        statusFilter,
    ]);


    /*
     * ============================================================
     * SUMMARY COUNTS
     * ============================================================
     */

    const activeEmergencies =
        incidents.filter(
            (item) =>
                item.status?.toLowerCase() === "active"
        ).length;


    const highPriority =
        incidents.filter(
            (item) =>
                item.severity?.toLowerCase() === "high"
        ).length;


    const pendingResponse =
        incidents.filter(
            (item) =>
                item.status?.toLowerCase() === "pending"
        ).length;


    const teamsAssigned =
        incidents.filter(
            (item) => item.team
        ).length;


    return (

        /*
         * IMPORTANT:
         *
         * Do NOT add:
         * AuthoritySidebar
         * AuthorityTopbar
         * authority-main
         *
         * here.
         *
         * AuthorityLayout already provides them.
         */

        <div className="emergencies-page">

            <div className="emergencies-container">


                {/* ==================================================
                    PAGE HEADER
                ================================================== */}

                <section className="emergencies-header">

                    <div>

                        <div className="emergencies-kicker">
                            <span></span>

                            EMERGENCY RESPONSE
                        </div>


                        <h1>
                            Emergency &amp; Incident Monitoring
                        </h1>


                        <p>
                            Monitor reported emergencies, assess
                            incident severity and coordinate disaster
                            response.
                        </p>

                    </div>

                </section>


                {/* ==================================================
                    SUMMARY CARDS
                ================================================== */}

                <section className="emergency-stats">


                    {/* ACTIVE EMERGENCIES */}

                    <div className="emergency-stat-card">

                        <div className="emergency-stat-icon red">

                            <ShieldAlert size={20} />

                        </div>


                        <div>

                            <span>
                                Active Emergencies
                            </span>

                            <strong>
                                {activeEmergencies}
                            </strong>

                        </div>

                    </div>


                    {/* HIGH PRIORITY */}

                    <div className="emergency-stat-card">

                        <div className="emergency-stat-icon orange">

                            <AlertTriangle size={20} />

                        </div>


                        <div>

                            <span>
                                High Priority
                            </span>

                            <strong>
                                {highPriority}
                            </strong>

                        </div>

                    </div>


                    {/* PENDING */}

                    <div className="emergency-stat-card">

                        <div className="emergency-stat-icon blue">

                            <Clock3 size={20} />

                        </div>


                        <div>

                            <span>
                                Pending Response
                            </span>

                            <strong>
                                {pendingResponse}
                            </strong>

                        </div>

                    </div>


                    {/* TEAMS */}

                    <div className="emergency-stat-card">

                        <div className="emergency-stat-icon green">

                            <Users size={20} />

                        </div>


                        <div>

                            <span>
                                Teams Assigned
                            </span>

                            <strong>
                                {teamsAssigned}
                            </strong>

                        </div>

                    </div>

                </section>


                {/* ==================================================
                    INCIDENT PANEL
                ================================================== */}

                <section className="emergency-panel">


                    {/* PANEL HEADER */}

                    <div className="emergency-panel-header">

                        <div>

                            <h2>
                                Reported Incidents
                            </h2>

                            <p>
                                Emergency reports requiring authority
                                monitoring and response.
                            </p>

                        </div>


                        <div className="emergency-controls">


                            {/* SEARCH */}

                            <div className="emergency-search">

                                <Search size={16} />

                                <input
                                    type="text"
                                    placeholder="Search incidents..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            {/* STATUS FILTER */}

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(
                                        event.target.value
                                    )
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


                    {/* ==================================================
                        INCIDENT TABLE
                    ================================================== */}

                    <div className="incident-table">


                        {/* TABLE HEADER */}

                        <div className="incident-table-header">

                            <span>
                                INCIDENT
                            </span>

                            <span>
                                LOCATION
                            </span>

                            <span>
                                SEVERITY
                            </span>

                            <span>
                                STATUS
                            </span>

                            <span>
                                RESPONSE TEAM
                            </span>

                            <span>
                                ACTION
                            </span>

                        </div>


                        {/* ==================================================
                            EMPTY STATE
                        ================================================== */}

                        {filteredIncidents.length === 0 ? (

                            <div className="incident-empty">

                                <div className="incident-empty-icon">

                                    <ShieldAlert size={25} />

                                </div>


                                <h3>
                                    No emergency incidents
                                </h3>


                                <p>
                                    No emergency reports are currently
                                    available. Once incidents are received
                                    from the emergency reporting system,
                                    they will appear here.
                                </p>

                            </div>

                        ) : (

                            filteredIncidents.map(
                                (incident) => (

                                    <div
                                        className="incident-table-row"
                                        key={incident.id}
                                    >


                                        {/* INCIDENT */}

                                        <div className="incident-name">

                                            <div className="incident-type-icon">

                                                <AlertTriangle
                                                    size={17}
                                                />

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


                                        {/* LOCATION */}

                                        <div className="incident-location">

                                            <MapPin size={15} />

                                            <span>
                                                {incident.location}
                                            </span>

                                        </div>


                                        {/* SEVERITY */}

                                        <div>

                                            <span
                                                className={`severity-badge ${
                                                    incident.severity || ""
                                                }`}
                                            >
                                                {incident.severity}
                                            </span>

                                        </div>


                                        {/* STATUS */}

                                        <div>

                                            <span
                                                className={`status-badge ${
                                                    incident.status || ""
                                                }`}
                                            >
                                                {incident.status}
                                            </span>

                                        </div>


                                        {/* TEAM */}

                                        <div className="incident-team">

                                            <Users size={15} />

                                            {incident.team ||
                                                "Unassigned"}

                                        </div>


                                        {/* VIEW */}

                                        <button
                                            type="button"
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

                                )
                            )

                        )}

                    </div>

                </section>

            </div>


            {/* ==================================================
                INCIDENT DETAILS MODAL
            ================================================== */}

            {selectedIncident && (

                <div
                    className="emergency-modal-backdrop"
                    onClick={() =>
                        setSelectedIncident(null)
                    }
                >

                    <div
                        className="emergency-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >


                        {/* CLOSE BUTTON */}

                        <button
                            type="button"
                            className="emergency-modal-close"
                            onClick={() =>
                                setSelectedIncident(null)
                            }
                            aria-label="Close incident details"
                        >

                            <X size={19} />

                        </button>


                        {/* ICON */}

                        <div className="modal-emergency-icon">

                            <AlertTriangle size={22} />

                        </div>


                        <span className="modal-emergency-kicker">
                            INCIDENT DETAILS
                        </span>


                        <h2>
                            {selectedIncident.type}
                        </h2>


                        {/* LOCATION */}

                        <div className="modal-incident-location">

                            <MapPin size={16} />

                            {selectedIncident.location}

                        </div>


                        {/* DETAILS */}

                        <div className="modal-incident-grid">


                            <div>

                                <span>
                                    Incident ID
                                </span>

                                <strong>
                                    {selectedIncident.id}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Severity
                                </span>

                                <strong>
                                    {selectedIncident.severity}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Status
                                </span>

                                <strong>
                                    {selectedIncident.status}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Response Team
                                </span>

                                <strong>
                                    {selectedIncident.team ||
                                        "Unassigned"}
                                </strong>

                            </div>

                        </div>


                        {/* DESCRIPTION */}

                        <div className="modal-incident-description">

                            <span>
                                Description
                            </span>

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