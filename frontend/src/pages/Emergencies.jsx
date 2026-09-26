import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    AlertTriangle,
    Clock3,
    MapPin,
    Search,
    ShieldAlert,
    Users,
    X,
    Loader2,
    Navigation,
    User,
    Phone,
    UserCheck,
    RefreshCw
} from "lucide-react";

import { io } from "socket.io-client";

import api from "../api/axios";

import "./Emergencies.css";


const SOCKET_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";


/* ============================================================
   NORMALIZE SOS DATA
   ============================================================ */

const normalizeIncident = (report) => {

    if (!report) return null;

    const coordinates =
        report.location?.coordinates || [];

    const longitude = coordinates[0];
    const latitude = coordinates[1];

    const assignedTeam =
        report.assignedTeamId;

    let teamName = null;

    if (assignedTeam) {

        if (typeof assignedTeam === "object") {

            teamName =
                assignedTeam.name ||
                assignedTeam.organization ||
                assignedTeam.teamType ||
                null;

        } else {

            teamName = String(assignedTeam);

        }

    }

    const rawStatus =
        String(
            report.status || "pending"
        ).toLowerCase();

    let displayStatus = rawStatus;

    /*
     * Backend statuses:
     *
     * pending
     * assigned
     * in-progress
     * resolved
     */

    return {

        ...report,

        id:
            report._id ||
            report.id,

        type:
            report.category ||
            "Emergency SOS",

        location:
            latitude !== undefined &&
            longitude !== undefined
                ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
                : "Location unavailable",

        latitude,
        longitude,

        severity:
            String(
                report.severityLabel ||
                report.severity ||
                "MEDIUM"
            ).toUpperCase(),

        severityScore:
            Number(
                report.severityScore || 0
            ),

        status:
            displayStatus,

        team:
            teamName,

        assignedTeam:
            assignedTeam,

        description:
            report.description ||
            "No description available.",

        peopleCount:
            Number(report.peopleCount || 0),

        injuredPeople:
            Number(
                report.injured_people || 0
            ),

        criticalInjuries:
            Number(
                report.critical_injuries || 0
            ),

        childrenElderly:
            Number(
                report.children_elderly || 0
            ),

        waterLevel:
            Number(
                report.water_level || 0
            ),

        buildingDamage:
            Number(
                report.building_damage || 0
            ),

        hoursTrapped:
            Number(
                report.hours_trapped || 0
            ),

        communicationAvailable:
            report.communication_available,

        reporter:
            report.reporterId,

        createdAt:
            report.createdAt

    };
};


/* ============================================================
   STATUS LABEL
   ============================================================ */

const getStatusLabel = (status) => {

    switch (status) {

        case "pending":
            return "Pending";

        case "assigned":
            return "Team Assigned";

        case "in-progress":
            return "In Progress";

        case "resolved":
            return "Resolved";

        default:
            return status || "Unknown";
    }
};


/* ============================================================
   SEVERITY CLASS
   ============================================================ */

const getSeverityClass = (severity) => {

    return String(
        severity || ""
    ).toLowerCase();
};


/* ============================================================
   MAIN COMPONENT
   ============================================================ */

function Emergencies() {

    const [
        incidents,
        setIncidents
    ] = useState([]);

    const [
        rescueTeams,
        setRescueTeams
    ] = useState([]);

    const [
        search,
        setSearch
    ] = useState("");

    const [
        statusFilter,
        setStatusFilter
    ] = useState("all");

    const [
        selectedIncident,
        setSelectedIncident
    ] = useState(null);

    const [
        selectedTeam,
        setSelectedTeam
    ] = useState("");

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        refreshing,
        setRefreshing
    ] = useState(false);

    const [
        assigning,
        setAssigning
    ] = useState(false);

    const [
        updatingStatus,
        setUpdatingStatus
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        actionMessage,
        setActionMessage
    ] = useState("");


    /* ============================================================
       FETCH SOS REPORTS
       ============================================================ */

    const fetchIncidents = async (
        showLoader = false
    ) => {

        try {

            if (showLoader) {
                setLoading(true);
            }

            setError("");

            const response =
                await api.get("/api/sos");

            const reports =
                response.data?.reports ||
                [];

            const normalized =
                reports
                    .map(normalizeIncident)
                    .filter(Boolean);

            setIncidents(normalized);

            /*
             * If a selected incident is open,
             * update its data too.
             */

            setSelectedIncident(
                current => {

                    if (!current) {
                        return current;
                    }

                    const updated =
                        normalized.find(
                            item =>
                                item.id ===
                                current.id
                        );

                    return updated || current;
                }
            );

        } catch (err) {

            console.error(
                "Failed to fetch SOS reports:",
                err
            );

            const status =
                err.response?.status;

            if (status === 401) {

                setError(
                    "Your session has expired. Please login again."
                );

            } else if (status === 403) {

                setError(
                    "You are not authorized to view emergency reports."
                );

            } else {

                setError(
                    err.response?.data?.message ||
                    "Failed to load emergency reports."
                );
            }

        } finally {

            setLoading(false);
            setRefreshing(false);
        }
    };


    /* ============================================================
       FETCH RESCUE TEAMS
       ============================================================ */

    const fetchRescueTeams = async () => {

        try {

            const response =
                await api.get(
                    "/api/rescue-teams"
                );

            const teams =
                response.data?.teams ||
                [];

            setRescueTeams(teams);

        } catch (err) {

            console.error(
                "Failed to fetch rescue teams:",
                err
            );

        }
    };


    /* ============================================================
       INITIAL LOAD
       ============================================================ */

    useEffect(() => {

        fetchIncidents(true);

        fetchRescueTeams();

    }, []);


    /* ============================================================
       SOCKET.IO LIVE UPDATES
       ============================================================ */

    useEffect(() => {

        const socket =
            io(SOCKET_URL, {
                transports: [
                    "websocket",
                    "polling"
                ]
            });


        /* --------------------------------------------------------
           NEW SOS
        -------------------------------------------------------- */

        socket.on(
            "new-sos",
            (report) => {

                console.log(
                    "New SOS received:",
                    report
                );

                const normalized =
                    normalizeIncident(report);

                if (!normalized) {
                    return;
                }

                setIncidents(
                    current => {

                        /*
                         * Avoid duplicate incident
                         */

                        const alreadyExists =
                            current.some(
                                item =>
                                    item.id ===
                                    normalized.id
                            );

                        if (alreadyExists) {

                            return current.map(
                                item =>
                                    item.id ===
                                    normalized.id
                                        ? {
                                            ...item,
                                            ...normalized
                                        }
                                        : item
                            );
                        }

                        return [
                            normalized,
                            ...current
                        ];
                    }
                );

            }
        );


        /* --------------------------------------------------------
           TEAM ASSIGNED / STATUS UPDATE
        -------------------------------------------------------- */

        socket.on(
            "status-update",
            (payload) => {

                console.log(
                    "SOS status update:",
                    payload
                );

                const report =
                    payload?.report ||
                    payload;

                const reportId =
                    report?._id ||
                    report?.id ||
                    payload?.reportId ||
                    payload?.sosId;

                const newStatus =
                    report?.status ||
                    payload?.status;

                if (!reportId) {
                    return;
                }

                setIncidents(
                    current =>
                        current.map(
                            item =>
                                item.id ===
                                reportId
                                    ? {
                                        ...item,
                                        ...(report?._id
                                            ? normalizeIncident(
                                                report
                                            )
                                            : {}),
                                        status:
                                            newStatus ||
                                            item.status
                                    }
                                    : item
                        )
                );

            }
        );


        socket.on(
            "team-assigned",
            (payload) => {

                console.log(
                    "Team assigned:",
                    payload
                );

                /*
                 * Refetch because backend may have
                 * populated assignedTeamId.
                 */

                fetchIncidents(false);

                fetchRescueTeams();

            }
        );


        return () => {

            socket.disconnect();

        };

    }, []);


    /* ============================================================
       FILTER INCIDENTS
       ============================================================ */

    const filteredIncidents =
        useMemo(() => {

            const searchValue =
                search
                    .trim()
                    .toLowerCase();


            return incidents.filter(
                incident => {

                    const matchesSearch =
                        !searchValue ||

                        String(
                            incident.id || ""
                        )
                            .toLowerCase()
                            .includes(searchValue) ||

                        String(
                            incident.type || ""
                        )
                            .toLowerCase()
                            .includes(searchValue) ||

                        String(
                            incident.location || ""
                        )
                            .toLowerCase()
                            .includes(searchValue) ||

                        String(
                            incident.description || ""
                        )
                            .toLowerCase()
                            .includes(searchValue);


                    const matchesStatus =
                        statusFilter === "all" ||
                        incident.status ===
                            statusFilter;


                    return (
                        matchesSearch &&
                        matchesStatus
                    );

                }
            );

        }, [
            incidents,
            search,
            statusFilter
        ]);


    /* ============================================================
       SUMMARY COUNTS
       ============================================================ */

    const activeEmergencies =
        incidents.filter(
            item =>
                [
                    "pending",
                    "assigned",
                    "in-progress"
                ].includes(
                    item.status
                )
        ).length;


    const highPriority =
        incidents.filter(
            item =>
                [
                    "HIGH",
                    "CRITICAL"
                ].includes(
                    item.severity
                )
        ).length;


    const pendingResponse =
        incidents.filter(
            item =>
                item.status ===
                "pending"
        ).length;


    const teamsAssigned =
        incidents.filter(
            item =>
                Boolean(
                    item.assignedTeamId ||
                    item.team
                )
        ).length;


    /* ============================================================
       AVAILABLE TEAMS
       ============================================================ */

    const availableTeams =
        rescueTeams.filter(
            team =>
                (
                    team.currentStatus ||
                    team.status
                ) === "AVAILABLE" &&
                team.availability !== false
        );


    /* ============================================================
       OPEN INCIDENT
       ============================================================ */

    const openIncident = (
        incident
    ) => {

        setSelectedIncident(
            incident
        );

        setSelectedTeam(
            incident.assignedTeamId?._id ||
            (
                typeof incident.assignedTeamId ===
                "string"
                    ? incident.assignedTeamId
                    : ""
            )
        );

        setActionMessage("");

    };


    /* ============================================================
       CLOSE MODAL
       ============================================================ */

    const closeModal = () => {

        if (
            assigning ||
            updatingStatus
        ) {
            return;
        }

        setSelectedIncident(null);
        setSelectedTeam("");
        setActionMessage("");

    };


    /* ============================================================
       ASSIGN RESCUE TEAM
       ============================================================ */

    const handleAssignTeam = async () => {

        if (!selectedIncident) {
            return;
        }

        if (!selectedTeam) {

            setActionMessage(
                "Please select a rescue team."
            );

            return;
        }


        try {

            setAssigning(true);
            setActionMessage("");


            const response =
                await api.post(
                    `/api/sos/${selectedIncident.id}/assign`,
                    {
                        teamId:
                            selectedTeam
                    }
                );


            console.log(
                "Team assignment response:",
                response.data
            );


            setActionMessage(
                "Rescue team assigned successfully."
            );


            /*
             * Refresh both lists.
             */

            await Promise.all([
                fetchIncidents(false),
                fetchRescueTeams()
            ]);


            /*
             * selectedIncident is refreshed
             * by fetchIncidents.
             */

        } catch (err) {

            console.error(
                "Failed to assign rescue team:",
                err
            );

            setActionMessage(
                err.response?.data?.message ||
                "Failed to assign rescue team."
            );

        } finally {

            setAssigning(false);

        }

    };


    /* ============================================================
       UPDATE SOS STATUS
       ============================================================ */

    const handleStatusUpdate = async (
        newStatus
    ) => {

        if (!selectedIncident) {
            return;
        }


        try {

            setUpdatingStatus(true);
            setActionMessage("");


            const response =
                await api.patch(
                    `/api/sos/${selectedIncident.id}/status`,
                    {
                        status:
                            newStatus
                    }
                );


            console.log(
                "Status update response:",
                response.data
            );


            setActionMessage(
                `Emergency status changed to ${getStatusLabel(newStatus)}.`
            );


            await Promise.all([
                fetchIncidents(false),
                fetchRescueTeams()
            ]);


        } catch (err) {

            console.error(
                "Failed to update SOS status:",
                err
            );

            setActionMessage(
                err.response?.data?.message ||
                "Failed to update emergency status."
            );

        } finally {

            setUpdatingStatus(false);

        }

    };


    /* ============================================================
       REFRESH
       ============================================================ */

    const handleRefresh = async () => {

        setRefreshing(true);

        await Promise.all([
            fetchIncidents(false),
            fetchRescueTeams()
        ]);

        setRefreshing(false);

    };


    /* ============================================================
       RENDER
       ============================================================ */

    return (

        <div className="emergencies-page">

            <div className="emergencies-container">


                {/* ==================================================
                    HEADER
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


                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="emergency-refresh-button"
                        disabled={refreshing}
                    >

                        <RefreshCw
                            size={17}
                            className={
                                refreshing
                                    ? "spinning"
                                    : ""
                            }
                        />

                        {refreshing
                            ? "Refreshing..."
                            : "Refresh"}

                    </button>

                </section>


                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (

                    <div
                        className="emergency-error"
                        role="alert"
                    >

                        <AlertTriangle
                            size={18}
                        />

                        <span>
                            {error}
                        </span>

                    </div>

                )}


                {/* ==================================================
                    SUMMARY
                ================================================== */}

                <section className="emergency-stats">


                    <div className="emergency-stat-card">

                        <div className="emergency-stat-icon red">

                            <ShieldAlert
                                size={20}
                            />

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


                    <div className="emergency-stat-card">

                        <div className="emergency-stat-icon orange">

                            <AlertTriangle
                                size={20}
                            />

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


                    <div className="emergency-stat-card">

                        <div className="emergency-stat-icon blue">

                            <Clock3
                                size={20}
                            />

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


                    <div className="emergency-stat-card">

                        <div className="emergency-stat-icon green">

                            <Users
                                size={20}
                            />

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


                            <div className="emergency-search">

                                <Search
                                    size={16}
                                />

                                <input
                                    type="text"
                                    placeholder="Search incidents..."
                                    value={search}
                                    onChange={
                                        event =>
                                            setSearch(
                                                event.target.value
                                            )
                                    }
                                />

                            </div>


                            <select
                                value={statusFilter}
                                onChange={
                                    event =>
                                        setStatusFilter(
                                            event.target.value
                                        )
                                }
                                className="emergency-filter"
                            >

                                <option value="all">
                                    All Status
                                </option>

                                <option value="pending">
                                    Pending
                                </option>

                                <option value="assigned">
                                    Team Assigned
                                </option>

                                <option value="in-progress">
                                    In Progress
                                </option>

                                <option value="resolved">
                                    Resolved
                                </option>

                            </select>

                        </div>

                    </div>


                    {/* ==================================================
                        TABLE
                    ================================================== */}

                    <div className="incident-table">


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


                        {/* LOADING */}

                        {loading ? (

                            <div className="incident-empty">

                                <Loader2
                                    size={28}
                                    className="spinning"
                                />

                                <h3>
                                    Loading emergency reports...
                                </h3>

                                <p>
                                    Fetching live SOS reports from the
                                    emergency reporting system.
                                </p>

                            </div>

                        ) : filteredIncidents.length === 0 ? (

                            <div className="incident-empty">

                                <div className="incident-empty-icon">

                                    <ShieldAlert
                                        size={25}
                                    />

                                </div>


                                <h3>
                                    No emergency incidents
                                </h3>


                                <p>
                                    No emergency reports are currently
                                    available. New citizen SOS reports
                                    will appear here automatically.
                                </p>

                            </div>

                        ) : (

                            filteredIncidents.map(
                                incident => (

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
                                                    {String(
                                                        incident.id
                                                    ).slice(-8)}
                                                </span>

                                            </div>

                                        </div>


                                        {/* LOCATION */}

                                        <div className="incident-location">

                                            <MapPin
                                                size={15}
                                            />

                                            <span>
                                                {incident.location}
                                            </span>

                                        </div>


                                        {/* SEVERITY */}

                                        <div>

                                            <span
                                                className={`severity-badge ${getSeverityClass(
                                                    incident.severity
                                                )}`}
                                            >

                                                {incident.severity}

                                                {incident.severityScore >
                                                    0 && (
                                                    <small>
                                                        {" "}
                                                        (
                                                        {
                                                            incident.severityScore
                                                        }
                                                        )
                                                    </small>
                                                )}

                                            </span>

                                        </div>


                                        {/* STATUS */}

                                        <div>

                                            <span
                                                className={`status-badge ${incident.status}`}
                                            >

                                                {getStatusLabel(
                                                    incident.status
                                                )}

                                            </span>

                                        </div>


                                        {/* TEAM */}

                                        <div className="incident-team">

                                            <Users
                                                size={15}
                                            />

                                            {incident.team ||
                                                "Unassigned"}

                                        </div>


                                        {/* ACTION */}

                                        <button
                                            type="button"
                                            className="view-incident-button"
                                            onClick={() =>
                                                openIncident(
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
                INCIDENT DETAILS / ASSIGNMENT MODAL
            ================================================== */}

            {selectedIncident && (

                <div
                    className="emergency-modal-backdrop"
                    onClick={closeModal}
                >

                    <div
                        className="emergency-modal"
                        onClick={
                            event =>
                                event.stopPropagation()
                        }
                    >


                        {/* CLOSE */}

                        <button
                            type="button"
                            className="emergency-modal-close"
                            onClick={closeModal}
                            aria-label="Close incident details"
                        >

                            <X size={19} />

                        </button>


                        {/* ICON */}

                        <div className="modal-emergency-icon">

                            <AlertTriangle
                                size={22}
                            />

                        </div>


                        <span className="modal-emergency-kicker">

                            INCIDENT DETAILS

                        </span>


                        <h2>
                            {selectedIncident.type}
                        </h2>


                        {/* LOCATION */}

                        <div className="modal-incident-location">

                            <MapPin
                                size={16}
                            />

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
                                    {selectedIncident.severityScore >
                                        0 &&
                                        ` (${selectedIncident.severityScore})`}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Status
                                </span>

                                <strong>
                                    {getStatusLabel(
                                        selectedIncident.status
                                    )}
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


                        {/* ==================================================
                            CITIZEN DETAILS
                        ================================================== */}

                        <div className="detail-box">
                            <span>Emergency Description</span>
                            <p>
                                {selectedIncident?.description ||
                                    selectedIncident?.message ||
                                    selectedIncident?.emergencyMessage ||
                                    "No message provided by citizen."}
                            </p>
                        </div>


                        <div className="modal-incident-grid">


                            <div>

                                <span>
                                    People Trapped
                                </span>

                                <strong>
                                    {selectedIncident.peopleCount}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Injured
                                </span>

                                <strong>
                                    {selectedIncident.injuredPeople}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Critical Injuries
                                </span>

                                <strong>
                                    {selectedIncident.criticalInjuries}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Children / Elderly
                                </span>

                                <strong>
                                    {selectedIncident.childrenElderly}
                                </strong>

                            </div>

                        </div>


                        {/* ==================================================
                            REPORTER
                        ================================================== */}

                        {selectedIncident.reporter && (

                            <div className="modal-incident-description">

                                <span>
                                    Reported By
                                </span>

                                <p>

                                    <User
                                        size={15}
                                        style={{
                                            verticalAlign:
                                                "middle",
                                            marginRight:
                                                "6px"
                                        }}
                                    />

                                    {
                                        selectedIncident
                                            .reporter
                                            .name ||
                                        "Citizen"
                                    }

                                    {selectedIncident.reporter.phone && (
                                        <>
                                            {" • "}
                                            <Phone
                                                size={14}
                                                style={{
                                                    verticalAlign:
                                                        "middle"
                                                }}
                                            />

                                            {" "}
                                            {
                                                selectedIncident
                                                    .reporter
                                                    .phone
                                            }
                                        </>
                                    )}

                                </p>

                            </div>

                        )}


                        {/* ==================================================
                            COORDINATES
                        ================================================== */}

                        {selectedIncident.latitude !==
                            undefined &&
                            selectedIncident.longitude !==
                                undefined && (

                            <div className="modal-incident-description">

                                <span>
                                    GPS Coordinates
                                </span>

                                <p>

                                    <Navigation
                                        size={14}
                                        style={{
                                            verticalAlign:
                                                "middle",
                                            marginRight:
                                                "6px"
                                        }}
                                    />

                                    {selectedIncident.latitude},{" "}
                                    {selectedIncident.longitude}

                                </p>

                            </div>

                        )}


                        {/* ==================================================
                            RESCUE TEAM ASSIGNMENT
                        ================================================== */}

                        {selectedIncident.status !==
                            "resolved" && (

                            <div
                                className="modal-incident-description"
                            >

                                <span>
                                    Rescue Team Assignment
                                </span>


                                <select
                                    value={selectedTeam}
                                    onChange={
                                        event =>
                                            setSelectedTeam(
                                                event.target.value
                                            )
                                    }
                                    disabled={
                                        assigning ||
                                        updatingStatus
                                    }
                                    style={{
                                        width: "100%",
                                        marginTop: "10px",
                                        padding: "11px",
                                        borderRadius: "8px",
                                        border:
                                            "1px solid #d7dfeb",
                                        background:
                                            "#fff"
                                    }}
                                >

                                    <option value="">
                                        Select available rescue team
                                    </option>


                                    {availableTeams.length ===
                                    0 ? (

                                        <option
                                            value=""
                                            disabled
                                        >
                                            No available rescue teams
                                        </option>

                                    ) : (

                                        availableTeams.map(
                                            team => (

                                                <option
                                                    key={
                                                        team._id
                                                    }
                                                    value={
                                                        team._id
                                                    }
                                                >

                                                    {
                                                        team.name ||
                                                        team.organization ||
                                                        "Rescue Team"
                                                    }

                                                    {" — "}

                                                    {
                                                        team.teamType ||
                                                        "Response Team"
                                                    }

                                                </option>

                                            )
                                        )

                                    )}

                                </select>


                                <button
                                    type="button"
                                    onClick={
                                        handleAssignTeam
                                    }
                                    disabled={
                                        assigning ||
                                        updatingStatus ||
                                        !selectedTeam
                                    }
                                    style={{
                                        marginTop: "12px",
                                        width: "100%",
                                        padding: "11px",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor:
                                            selectedTeam
                                                ? "pointer"
                                                : "not-allowed",
                                        background:
                                            selectedTeam
                                                ? "#1557a6"
                                                : "#cbd5e1",
                                        color: "#fff",
                                        fontWeight: "600"
                                    }}
                                >

                                    {assigning ? (

                                        <>
                                            <Loader2
                                                size={16}
                                                className="spinning"
                                                style={{
                                                    verticalAlign:
                                                        "middle",
                                                    marginRight:
                                                        "6px"
                                                }}
                                            />

                                            Assigning Team...

                                        </>

                                    ) : (

                                        <>
                                            <UserCheck
                                                size={16}
                                                style={{
                                                    verticalAlign:
                                                        "middle",
                                                    marginRight:
                                                        "6px"
                                                }}
                                            />

                                            Assign Rescue Team

                                        </>
                                    )}

                                </button>


                                {/* ACTION MESSAGE */}

                                {actionMessage && (

                                    <p
                                        style={{
                                            marginTop:
                                                "10px",
                                            fontSize:
                                                "13px"
                                        }}
                                    >
                                        {actionMessage}
                                    </p>

                                )}

                            </div>

                        )}


                        {/* ==================================================
                            STATUS CONTROLS
                        ================================================== */}

                        <div
                            className="modal-incident-description"
                        >

                            <span>
                                Response Status
                            </span>


                            <div
                                style={{
                                    display:
                                        "flex",
                                    gap:
                                        "8px",
                                    flexWrap:
                                        "wrap",
                                    marginTop:
                                        "10px"
                                }}
                            >


                                {selectedIncident.status ===
                                    "assigned" && (

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleStatusUpdate(
                                                "in-progress"
                                            )
                                        }
                                        disabled={
                                            updatingStatus ||
                                            assigning
                                        }
                                        style={{
                                            padding:
                                                "9px 13px",
                                            border:
                                                "none",
                                            borderRadius:
                                                "7px",
                                            background:
                                                "#1557a6",
                                            color:
                                                "#fff",
                                            cursor:
                                                "pointer"
                                        }}
                                    >

                                        {updatingStatus
                                            ? "Updating..."
                                            : "Team On The Way"}

                                    </button>

                                )}


                                {selectedIncident.status ===
                                    "in-progress" && (

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleStatusUpdate(
                                                "resolved"
                                            )
                                        }
                                        disabled={
                                            updatingStatus
                                        }
                                        style={{
                                            padding:
                                                "9px 13px",
                                            border:
                                                "none",
                                            borderRadius:
                                                "7px",
                                            background:
                                                "#16845b",
                                            color:
                                                "#fff",
                                            cursor:
                                                "pointer"
                                        }}
                                    >

                                        {updatingStatus
                                            ? "Updating..."
                                            : "Mark Help Arrived / Resolved"}

                                    </button>

                                )}


                                {selectedIncident.status ===
                                    "pending" && (

                                    <p
                                        style={{
                                            margin:
                                                "8px 0 0",
                                            fontSize:
                                                "13px",
                                            color:
                                                "#64748b"
                                        }}
                                    >
                                        Assign an available rescue team
                                        to begin the response.
                                    </p>

                                )}


                                {selectedIncident.status ===
                                    "resolved" && (

                                    <p
                                        style={{
                                            margin:
                                                "8px 0 0",
                                            fontSize:
                                                "13px",
                                            color:
                                                "#16845b"
                                        }}
                                    >
                                        This emergency has been resolved.
                                    </p>

                                )}

                            </div>

                        </div>


                    </div>

                </div>

            )}

        </div>

    );

}


export default Emergencies;