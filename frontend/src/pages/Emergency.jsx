import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/axios";
import "./Emergency.css";

function Emergency() {
    const navigate = useNavigate();

    const [status, setStatus] = useState("Loading emergency status...");
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState("");

    // Actual SOS report from backend
    const [sosReport, setSosReport] = useState(null);

    // Assigned rescue team
    const [assignedTeam, setAssignedTeam] = useState(null);

    // ============================================================
    // STATUS HELPERS
    // ============================================================

    const getStatusText = (currentStatus) => {
        switch (currentStatus) {
            case "pending":
                return "Emergency request received";

            case "assigned":
                return "Rescue team assigned";

            case "in-progress":
                return "Rescue team is on the way";

            case "resolved":
                return "Emergency assistance completed";

            default:
                return "Emergency request received";
        }
    };

    const getCurrentStep = (currentStatus) => {
        switch (currentStatus) {
            case "pending":
                return 2;

            case "assigned":
                return 3;

            case "in-progress":
                return 4;

            case "resolved":
                return 5;

            default:
                return 2;
        }
    };

    // ============================================================
    // FETCH MY SOS REPORT
    // ============================================================

    useEffect(() => {
        const fetchMySOS = async () => {
            try {
                const response = await api.get("/api/sos/my-reports");

                const reports =
                    response.data?.reports ||
                    response.data?.sosReports ||
                    response.data?.data ||
                    [];

                if (!Array.isArray(reports) || reports.length === 0) {
                    setStatus("Emergency request received");
                    return;
                }

                // Backend normally returns newest first.
                // Sort again here to make sure we get the latest report.
                const sortedReports = [...reports].sort(
                    (a, b) =>
                        new Date(b.createdAt || 0) -
                        new Date(a.createdAt || 0)
                );

                const latestReport = sortedReports[0];

                setSosReport(latestReport);

                setStatus(
                    getStatusText(
                        latestReport.status
                    )
                );

                if (latestReport.assignedTeamId) {
                    setAssignedTeam(latestReport.assignedTeamId);
                }

                console.log(
                    "Citizen SOS report loaded:",
                    latestReport
                );

            } catch (error) {
                console.error(
                    "Failed to fetch citizen SOS:",
                    error.response?.data || error.message
                );

                setStatus("Emergency request received");
            }
        };

        fetchMySOS();
    }, []);

    // ============================================================
    // SOCKET.IO - LIVE SOS UPDATES
    // ============================================================

    useEffect(() => {
        const socketUrl =
            import.meta.env.VITE_API_URL ||
            "http://localhost:5000";

        const socket = io(socketUrl, {
            transports: ["websocket", "polling"],
            withCredentials: true,
        });

        socket.on("connect", () => {
            console.log(
                "Citizen emergency socket connected:",
                socket.id
            );
        });

        // --------------------------------------------------------
        // STATUS UPDATE
        // --------------------------------------------------------

        socket.on("status-update", (data) => {
            console.log(
                "LIVE STATUS UPDATE RECEIVED:",
                data
            );

            setSosReport((previousReport) => {
                if (!previousReport) {
                    return previousReport;
                }

                const currentReportId =
                    previousReport._id ||
                    previousReport.id;

                const updatedReportId =
                    data.reportId ||
                    data.sosId ||
                    data.id;

                // Ignore updates belonging to another SOS
                if (
                    String(currentReportId) !==
                    String(updatedReportId)
                ) {
                    return previousReport;
                }

                const newStatus =
                    data.status ||
                    data.newStatus;

                if (newStatus) {
                    setStatus(
                        getStatusText(newStatus)
                    );
                }

                return {
                    ...previousReport,
                    status:
                        newStatus ||
                        previousReport.status,
                };
            });
        });

        // --------------------------------------------------------
        // RESCUE TEAM ASSIGNED
        // --------------------------------------------------------

        socket.on("team-assigned", (data) => {
            console.log(
                "LIVE TEAM ASSIGNMENT RECEIVED:",
                data
            );

            setSosReport((previousReport) => {
                if (!previousReport) {
                    return previousReport;
                }

                const currentReportId =
                    previousReport._id ||
                    previousReport.id;

                const updatedReportId =
                    data.reportId ||
                    data.sosId ||
                    data.id;

                // Ignore assignment for another citizen
                if (
                    String(currentReportId) !==
                    String(updatedReportId)
                ) {
                    return previousReport;
                }

                const team =
                    data.team ||
                    data.rescueTeam ||
                    data.assignedTeam ||
                    null;

                if (team) {
                    setAssignedTeam(team);
                }

                const newStatus =
                    data.status || "assigned";

                setStatus(
                    getStatusText(newStatus)
                );

                return {
                    ...previousReport,

                    status: newStatus,

                    assignedTeamId:
                        team ||
                        previousReport.assignedTeamId,
                };
            });
        });

        // --------------------------------------------------------
        // CLEANUP
        // --------------------------------------------------------

        return () => {
            console.log(
                "Disconnecting citizen emergency socket"
            );

            socket.disconnect();
        };
    }, []);

    // ============================================================
    // LOCATION
    // ============================================================

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError(
                "Geolocation is not supported by your browser."
            );

            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                setLocation({
                    latitude,
                    longitude,
                    accuracy: Math.round(
                        position.coords.accuracy
                    ),
                });
            },

            () => {
                setLocationError(
                    "Unable to access your location. Please enable location permission."
                );
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    // ============================================================
    // CANCEL
    // ============================================================

    const handleCancel = () => {
        navigate("/dashboard", {
            replace: true,
        });
    };

    // ============================================================
    // CALL 112
    // ============================================================

    const handleCall = () => {
        window.location.href = "tel:112";
    };

    // ============================================================
    // SHARE LOCATION
    // ============================================================

    const handleShareLocation = () => {
        if (!location) {
            alert("Location is not available yet.");
            return;
        }

        const locationText = `My current location:
Latitude: ${location.latitude}
Longitude: ${location.longitude}`;

        if (navigator.share) {
            navigator.share({
                title: "My Emergency Location",
                text: locationText,
            });
        } else {
            navigator.clipboard.writeText(
                locationText
            );

            alert(
                "Location copied to clipboard."
            );
        }
    };

    // ============================================================
    // TIMELINE
    // ============================================================

    const currentStep = getCurrentStep(
        sosReport?.status
    );

    const isStepCompleted = (step) => {
            return currentStep >= step;
        };

        const isStepActive = (step) => {
            // When emergency is resolved, every step is completed.
            // No step should remain in the active state.
            if (sosReport?.status === "resolved") {
                return false;
            }

            return currentStep === step;
        };

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="emergency-page">

            {/* Header */}

            <header className="emergency-header">

                <div>
                    <h1>ResQ</h1>
                    <p>Emergency Assistance</p>
                </div>

                <button
                    className="back-dashboard-btn"
                    onClick={() =>
                        navigate("/dashboard")
                    }
                >
                    ← Dashboard
                </button>

            </header>


            {/* Main */}

            <main className="emergency-container">

                {/* Emergency Status */}

                <section className="emergency-status-card">

                    <div className="status-icon">
                        🚨
                    </div>

                    <h2>
                        Emergency Assistance
                    </h2>

                    <div className="status-badge">

                        <span className="status-dot"></span>

                        {status}

                    </div>

                    <p className="emergency-description">

                        Your emergency request is being
                        monitored by the emergency
                        response authority.

                        {assignedTeam && (
                            <>
                                {" "}
                                A rescue team has been
                                assigned to your request.
                            </>
                        )}

                    </p>

                </section>


                {/* Location */}

                <section className="emergency-card">

                    <div className="card-heading">

                        <span>📍</span>

                        <h3>Your Location</h3>

                    </div>

                    {location ? (

                        <div className="location-details">

                            <div className="location-item">

                                <span>
                                    Latitude
                                </span>

                                <strong>
                                    {location.latitude.toFixed(
                                        6
                                    )}
                                </strong>

                            </div>

                            <div className="location-item">

                                <span>
                                    Longitude
                                </span>

                                <strong>
                                    {location.longitude.toFixed(
                                        6
                                    )}
                                </strong>

                            </div>

                            <div className="location-item">

                                <span>
                                    Accuracy
                                </span>

                                <strong>
                                    {location.accuracy} m
                                </strong>

                            </div>

                        </div>

                    ) : (

                        <div className="location-loading">

                            <div className="loader"></div>

                            <p>
                                Detecting your current
                                location...
                            </p>

                        </div>

                    )}

                    {locationError && (

                        <p className="location-error">
                            {locationError}
                        </p>

                    )}

                </section>


                {/* Assigned Team */}

                {assignedTeam && (

                    <section className="emergency-card">

                        <div className="card-heading">

                            <span>🛟</span>

                            <h3>
                                Assigned Rescue Team
                            </h3>

                        </div>

                        <div className="location-details">

                            <div className="location-item">

                                <span>
                                    Team
                                </span>

                                <strong>
                                    {assignedTeam.name ||
                                        assignedTeam.teamName ||
                                        "Rescue Team"}
                                </strong>

                            </div>

                            {assignedTeam.organization && (

                                <div className="location-item">

                                    <span>
                                        Organization
                                    </span>

                                    <strong>
                                        {
                                            assignedTeam.organization
                                        }
                                    </strong>

                                </div>

                            )}

                            {assignedTeam.teamType && (

                                <div className="location-item">

                                    <span>
                                        Team Type
                                    </span>

                                    <strong>
                                        {
                                            assignedTeam.teamType
                                        }
                                    </strong>

                                </div>

                            )}

                        </div>

                    </section>

                )}


                {/* Rescue Status */}

                <section className="emergency-card">

                    <div className="card-heading">

                        <span>🛟</span>

                        <h3>
                            Rescue Status
                        </h3>

                    </div>


                    <div className="rescue-timeline">

                        {/* STEP 1 */}

                        <div
                            className={`timeline-step ${
                                isStepCompleted(1)
                                    ? "completed"
                                    : ""
                            } ${
                                isStepActive(1)
                                    ? "active"
                                    : ""
                            }`}
                        >

                            <div className="timeline-circle">

                                {isStepCompleted(1)
                                    ? "✓"
                                    : "1"}

                            </div>

                            <div>

                                <strong>
                                    SOS Sent
                                </strong>

                                <p>
                                    Your emergency request
                                    has been created.
                                </p>

                            </div>

                        </div>


                        <div className="timeline-line"></div>


                        {/* STEP 2 */}

                        <div
                            className={`timeline-step ${
                                isStepCompleted(2)
                                    ? "completed"
                                    : ""
                            } ${
                                isStepActive(2)
                                    ? "active"
                                    : ""
                            }`}
                        >

                            <div className="timeline-circle">

                                {isStepCompleted(2)
                                    ? "✓"
                                    : "2"}

                            </div>

                            <div>

                                <strong>
                                    Request Received
                                </strong>

                                <p>
                                    Emergency services
                                    have received your
                                    request.
                                </p>

                            </div>

                        </div>


                        <div className="timeline-line"></div>


                        {/* STEP 3 */}

                        <div
                            className={`timeline-step ${
                                isStepCompleted(3)
                                    ? "completed"
                                    : ""
                            } ${
                                isStepActive(3)
                                    ? "active"
                                    : ""
                            }`}
                        >

                            <div className="timeline-circle">

                                {isStepCompleted(3)
                                    ? "✓"
                                    : "3"}

                            </div>

                            <div>

                                <strong>
                                    Rescue Team Assignment
                                </strong>

                                <p>
                                    {sosReport?.status ===
                                    "assigned"
                                        ? "A rescue team has been assigned."
                                        : "Finding the nearest available rescue team."}
                                </p>

                            </div>

                        </div>


                        <div className="timeline-line"></div>


                        {/* STEP 4 */}

                        <div
                            className={`timeline-step ${
                                isStepCompleted(4)
                                    ? "completed"
                                    : ""
                            } ${
                                isStepActive(4)
                                    ? "active"
                                    : ""
                            }`}
                        >

                            <div className="timeline-circle">

                                {isStepCompleted(4)
                                    ? "✓"
                                    : "4"}

                            </div>

                            <div>

                                <strong>
                                    Team On The Way
                                </strong>

                                <p>

                                    {sosReport?.status ===
                                    "in-progress"
                                        ? "The rescue team is responding to your emergency."
                                        : "Rescue team will be dispatched."}

                                </p>

                            </div>

                        </div>


                        <div className="timeline-line"></div>


                        {/* STEP 5 */}

                        <div
                            className={`timeline-step ${
                                isStepCompleted(5)
                                    ? "completed"
                                    : ""
                            } ${
                                isStepActive(5)
                                    ? "active"
                                    : ""
                            }`}
                        >

                            <div className="timeline-circle">

                                {isStepCompleted(5)
                                    ? "✓"
                                    : "5"}

                            </div>

                            <div>

                                <strong>
                                    Help Arrived
                                </strong>

                                <p>

                                    {sosReport?.status ===
                                    "resolved"
                                        ? "Emergency assistance has been completed."
                                        : "Emergency assistance will reach you."}

                                </p>

                            </div>

                        </div>

                    </div>

                </section>


                {/* Emergency Actions */}

                <section className="emergency-actions">

                    <button
                        className="call-btn"
                        onClick={handleCall}
                    >
                        📞 Call Emergency Services
                    </button>


                    <button
                        className="share-btn"
                        onClick={handleShareLocation}
                    >
                        📍 Share My Location
                    </button>


                    <button
                        className="cancel-btn"
                        onClick={handleCancel}
                    >
                        Cancel SOS
                    </button>

                </section>

            </main>

        </div>
    );
}

export default Emergency;