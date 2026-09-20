import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Emergency.css";

function Emergency() {
    const navigate = useNavigate();

    const [status, setStatus] = useState("Sending emergency request...");
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState("");

    useEffect(() => {
        // Get user's current location
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            setStatus("Unable to detect location");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                setLocation({
                    latitude,
                    longitude,
                    accuracy: Math.round(position.coords.accuracy),
                });

                // Frontend simulation
                setTimeout(() => {
                    setStatus("Emergency request received");
                }, 1500);
            },
            () => {
                setLocationError(
                    "Unable to access your location. Please enable location permission."
                );
                setStatus("Location access required");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

const handleCancel = () => {
navigate("/dashboard", { replace: true });
};

    const handleCall = () => {
        window.location.href = "tel:112";
    };

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
            navigator.clipboard.writeText(locationText);
            alert("Location copied to clipboard.");
        }
    };

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
                    onClick={() => navigate("/dashboard")}
                >
                    ← Dashboard
                </button>
            </header>

            {/* Emergency Status */}
            <main className="emergency-container">

                <section className="emergency-status-card">

                    <div className="status-icon">
                        🚨
                    </div>

                    <h2>Emergency Assistance</h2>

                    <div className="status-badge">
                        <span className="status-dot"></span>
                        {status}
                    </div>

                    <p className="emergency-description">
                        Your emergency request is being processed.
                        Rescue assistance will be coordinated using your
                        current location.
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
                                <span>Latitude</span>
                                <strong>
                                    {location.latitude.toFixed(6)}
                                </strong>
                            </div>

                            <div className="location-item">
                                <span>Longitude</span>
                                <strong>
                                    {location.longitude.toFixed(6)}
                                </strong>
                            </div>

                            <div className="location-item">
                                <span>Accuracy</span>
                                <strong>
                                    {location.accuracy} m
                                </strong>
                            </div>

                        </div>
                    ) : (
                        <div className="location-loading">
                            <div className="loader"></div>
                            <p>Detecting your current location...</p>
                        </div>
                    )}

                    {locationError && (
                        <p className="location-error">
                            {locationError}
                        </p>
                    )}

                </section>

                {/* Rescue Status */}
                <section className="emergency-card">

                    <div className="card-heading">
                        <span>🛟</span>
                        <h3>Rescue Status</h3>
                    </div>

                    <div className="rescue-timeline">

                        <div className="timeline-step completed">
                            <div className="timeline-circle">✓</div>
                            <div>
                                <strong>SOS Sent</strong>
                                <p>Your emergency request has been created.</p>
                            </div>
                        </div>

                        <div className="timeline-line"></div>

                        <div className="timeline-step completed">
                            <div className="timeline-circle">✓</div>
                            <div>
                                <strong>Request Received</strong>
                                <p>Emergency services have received your request.</p>
                            </div>
                        </div>

                        <div className="timeline-line"></div>

                        <div className="timeline-step active">
                            <div className="timeline-circle">3</div>
                            <div>
                                <strong>Rescue Team Assignment</strong>
                                <p>Finding the nearest available rescue team.</p>
                            </div>
                        </div>

                        <div className="timeline-line"></div>

                        <div className="timeline-step">
                            <div className="timeline-circle">4</div>
                            <div>
                                <strong>Team On The Way</strong>
                                <p>Rescue team will be dispatched.</p>
                            </div>
                        </div>

                        <div className="timeline-line"></div>

                        <div className="timeline-step">
                            <div className="timeline-circle">5</div>
                            <div>
                                <strong>Help Arrived</strong>
                                <p>Emergency assistance has reached you.</p>
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