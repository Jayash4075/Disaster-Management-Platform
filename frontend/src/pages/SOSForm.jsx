import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    Cross,
    Info,
    MapPin,
    Phone,
    Send,
    ShieldAlert,
    Siren,
    Users,
} from "lucide-react";

import "./SOSForm.css";


/*
    ============================================================
    RESQ / TERRASHIELD - CITIZEN SOS FORM
    ============================================================

    This page is intentionally self-contained.

    It:
    - keeps the existing /api/sos backend contract
    - sends JWT authentication
    - sends the user's GPS coordinates
    - supports optional photo upload
    - keeps the SOS form full-screen
    - uses the same navy/blue visual language as the dashboard
    - does not modify CitizenDashboard, AuthorityDashboard or Map.jsx
*/


const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";


const initialForm = {
    description: "",
    peopleCount: 1,
    injured_people: 0,
    critical_injuries: 0,
    children_elderly: 0,
    water_level: 0,
    building_damage: 0,
    hours_trapped: 0,
    communication_available: 1,
};


function SOSForm() {

    const navigate = useNavigate();

    const [form, setForm] = useState(initialForm);

    const [photo, setPhoto] = useState(null);

    const [location, setLocation] = useState(null);

    const [locationAccuracy, setLocationAccuracy] =
        useState(null);

    const [locationLoading, setLocationLoading] =
        useState(true);

    const [locationError, setLocationError] =
        useState("");

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState(null);


    /*
        ========================================================
        GET CURRENT LOCATION
        ========================================================
    */

    const getCurrentLocation = () => {

        if (!navigator.geolocation) {

            setLocationLoading(false);

            setLocationError(
                "Location services are not supported by this browser."
            );

            return;
        }

        setLocationLoading(true);
        setLocationError("");

        navigator.geolocation.getCurrentPosition(

            (position) => {

                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });

                setLocationAccuracy(
                    position.coords.accuracy
                );

                setLocationLoading(false);
            },

            (err) => {

                console.error(
                    "SOS location error:",
                    err
                );

                setLocationLoading(false);

                if (err.code === 1) {

                    setLocationError(
                        "Location permission was denied. Allow location access to send an SOS."
                    );

                } else {

                    setLocationError(
                        "Unable to determine your current location. Please try again."
                    );
                }
            },

            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0,
            }
        );
    };


    useEffect(() => {

        getCurrentLocation();

    }, []);


    /*
        ========================================================
        FORM CHANGE
        ========================================================
    */

    const updateField = (field, value) => {

        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));

        setError("");
    };


    /*
        ========================================================
        SUBMIT SOS
        ========================================================
    */

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");
        setSuccess(null);


        if (!form.description.trim()) {

            setError(
                "Please describe what is happening."
            );

            return;
        }


        if (!location) {

            setError(
                "Your location is not available. Please allow location access and try again."
            );

            return;
        }


        const token =
            localStorage.getItem("token");


        if (!token) {

            setError(
                "Your session has expired. Please log in again."
            );

            return;
        }


        try {

            setSubmitting(true);


            const data = new FormData();


            /*
                Existing backend field names
            */

            data.append(
                "description",
                form.description.trim()
            );

            data.append(
                "peopleCount",
                String(form.peopleCount)
            );

            data.append(
                "injured_people",
                String(form.injured_people)
            );

            data.append(
                "critical_injuries",
                String(form.critical_injuries)
            );

            data.append(
                "children_elderly",
                String(form.children_elderly)
            );

            data.append(
                "water_level",
                String(form.water_level)
            );

            data.append(
                "building_damage",
                String(form.building_damage)
            );

            data.append(
                "hours_trapped",
                String(form.hours_trapped)
            );

            data.append(
                "communication_available",
                String(form.communication_available)
            );

            data.append(
                "latitude",
                String(location.latitude)
            );

            data.append(
                "longitude",
                String(location.longitude)
            );


            if (photo) {

                data.append(
                    "photo",
                    photo
                );
            }


            const response = await fetch(
                `${API_BASE_URL}/api/sos`,
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: data,
                }
            );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    result.error ||
                    "Failed to submit SOS."
                );
            }


            const prediction =
                result.mlPrediction ||
                {};


            setSuccess({

                severity:
                    prediction.severity ||
                    result.sosReport?.severityLabel ||
                    "RECEIVED",

                score:
                    prediction.severityScore ??
                    result.sosReport?.severityScore ??
                    null,

                id:
                    result.sosReport?._id ||
                    null,
            });


            /*
                Keep the user on the SOS page briefly so they
                can clearly see that the emergency was accepted.
            */

            window.setTimeout(() => {

                navigate(
                    "/emergency",
                    {
                        replace: true,
                        state: {
                            sosSubmitted: true,
                            sosReport:
                                result.sosReport,
                            mlPrediction:
                                result.mlPrediction,
                        },
                    }
                );

            }, 1400);


        } catch (err) {

            console.error(
                "SOS submission error:",
                err
            );

            setError(
                err.message ||
                "Unable to submit SOS."
            );

        } finally {

            setSubmitting(false);
        }
    };


    /*
        ========================================================
        RENDER
        ========================================================
    */

    return (

        <div className="sos-page">


            {/* ==================================================
                TOP BAR
            ================================================== */}

            <header className="sos-topbar">

                <div className="sos-brand">

                    <div className="sos-brand-mark">
                        T
                    </div>

                    <div>

                        <strong>
                            TerraShield
                        </strong>

                        <span>
                            Citizen Safety Center
                        </span>

                    </div>

                </div>


                <button
                    type="button"
                    className="sos-dashboard-button"
                    onClick={() =>
                        navigate("/dashboard")
                    }
                >
                    <ArrowLeft size={16} />
                    Dashboard
                </button>

            </header>


            {/* ==================================================
                MAIN
            ================================================== */}

            <main className="sos-main">


                {/* ==================================================
                    LEFT INTRO PANEL
                ================================================== */}

                <section className="sos-intro">

                    <div className="sos-intro-badge">
                        <Siren size={17} />
                        EMERGENCY SOS
                    </div>


                    <h1>
                        Request emergency assistance
                    </h1>


                    <p className="sos-intro-text">

                        Tell the response authority what is
                        happening. Your location and emergency
                        details will be sent securely to the
                        response system.

                    </p>


                    <div className="sos-steps">

                        <div className="sos-step">

                            <div className="sos-step-number">
                                1
                            </div>

                            <div>

                                <strong>
                                    Describe the emergency
                                </strong>

                                <span>
                                    Tell us what happened and
                                    how many people need help.
                                </span>

                            </div>

                        </div>


                        <div className="sos-step">

                            <div className="sos-step-number">
                                2
                            </div>

                            <div>

                                <strong>
                                    Share your location
                                </strong>

                                <span>
                                    Your current GPS location
                                    is attached automatically.
                                </span>

                            </div>

                        </div>


                        <div className="sos-step">

                            <div className="sos-step-number">
                                3
                            </div>

                            <div>

                                <strong>
                                    Response begins
                                </strong>

                                <span>
                                    The authority receives the
                                    report for emergency action.
                                </span>

                            </div>

                        </div>

                    </div>


                    {/* LOCATION STATUS */}

                    <div
                        className={
                            `sos-location-status ${
                                location
                                    ? "available"
                                    : "unavailable"
                            }`
                        }
                    >

                        <div className="sos-location-icon">
                            <MapPin size={18} />
                        </div>


                        <div>

                            <strong>

                                {location
                                    ? "Location attached"
                                    : "Location required"}

                            </strong>


                            <span>

                                {location
                                    ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                                    : locationLoading
                                        ? "Detecting your location..."
                                        : "Location is unavailable"}

                            </span>


                            {locationAccuracy && (

                                <small>

                                    Accuracy ±
                                    {Math.round(
                                        locationAccuracy
                                    )}m

                                </small>

                            )}

                        </div>


                        {!location && !locationLoading && (

                            <button
                                type="button"
                                className="sos-location-retry"
                                onClick={
                                    getCurrentLocation
                                }
                            >
                                Retry
                            </button>

                        )}

                    </div>


                    {locationError && (

                        <div className="sos-location-error">

                            <Info size={16} />

                            <span>
                                {locationError}
                            </span>

                        </div>

                    )}


                    <div className="sos-safety-note">

                        <ShieldAlert size={17} />

                        <span>
                            Use SOS only for genuine
                            emergencies requiring response
                            assistance.
                        </span>

                    </div>

                </section>


                {/* ==================================================
                    FORM CARD
                ================================================== */}

                <section className="sos-form-card">


                    <div className="sos-form-heading">

                        <div>

                            <span>
                                EMERGENCY REPORT
                            </span>

                            <h2>
                                What is happening?
                            </h2>

                            <p>
                                Provide the details that will help
                                responders understand the situation.
                            </p>

                        </div>

                        <div className="sos-form-icon">
                            <ShieldAlert size={22} />
                        </div>

                    </div>


                    <form
                        onSubmit={handleSubmit}
                        className="sos-form"
                    >


                        {/* DESCRIPTION */}

                        <div className="sos-field sos-field-full">

                            <label htmlFor="description">
                                Describe your emergency
                                <span>*</span>
                            </label>

                            <textarea
                                id="description"
                                value={
                                    form.description
                                }
                                onChange={(event) =>
                                    updateField(
                                        "description",
                                        event.target.value
                                    )
                                }
                                placeholder="Example: Several people are trapped on the ground floor after part of a building collapsed."
                                rows={4}
                                required
                            />

                            <small>
                                Clearly mention the incident,
                                location details if useful, and
                                any immediate danger.
                            </small>

                        </div>


                        {/* PEOPLE */}

                        <div className="sos-form-section-title">

                            <Users size={17} />

                            <div>

                                <strong>
                                    People affected
                                </strong>

                                <span>
                                    Help responders understand
                                    how many people need assistance.
                                </span>

                            </div>

                        </div>


                        <div className="sos-field-grid">


                            <div className="sos-field">

                                <label htmlFor="peopleCount">
                                    People trapped
                                </label>

                                <input
                                    id="peopleCount"
                                    type="number"
                                    min="1"
                                    value={
                                        form.peopleCount
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "peopleCount",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div className="sos-field">

                                <label htmlFor="injured_people">
                                    Injured people
                                </label>

                                <input
                                    id="injured_people"
                                    type="number"
                                    min="0"
                                    value={
                                        form.injured_people
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "injured_people",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div className="sos-field">

                                <label htmlFor="critical_injuries">
                                    Critical injuries
                                </label>

                                <input
                                    id="critical_injuries"
                                    type="number"
                                    min="0"
                                    value={
                                        form.critical_injuries
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "critical_injuries",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div className="sos-field">

                                <label htmlFor="children_elderly">
                                    Children / elderly
                                </label>

                                <input
                                    id="children_elderly"
                                    type="number"
                                    min="0"
                                    value={
                                        form.children_elderly
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "children_elderly",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>


                        {/* INCIDENT CONDITIONS */}

                        <div className="sos-form-section-title">

                            <ShieldAlert size={17} />

                            <div>

                                <strong>
                                    Incident conditions
                                </strong>

                                <span>
                                    These details help prioritize
                                    the emergency response.
                                </span>

                            </div>

                        </div>


                        <div className="sos-form-grid">


                            <div className="sos-field">

                                <label htmlFor="water_level">
                                    Water level
                                    <span className="label-hint">
                                        0 = none, 10 = severe
                                    </span>
                                </label>

                                <input
                                    id="water_level"
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={
                                        form.water_level
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "water_level",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div className="sos-field">

                                <label htmlFor="building_damage">
                                    Building damage
                                    <span className="label-hint">
                                        0–10
                                    </span>
                                </label>

                                <input
                                    id="building_damage"
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={
                                        form.building_damage
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "building_damage",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div className="sos-field">

                                <label htmlFor="hours_trapped">
                                    Hours trapped
                                </label>

                                <input
                                    id="hours_trapped"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                        form.hours_trapped
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "hours_trapped",
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div className="sos-phone-field">

                                <label>
                                    <input
                                        type="checkbox"
                                        checked={
                                            Boolean(
                                                form.communication_available
                                            )
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                "communication_available",
                                                event.target.checked
                                                    ? 1
                                                    : 0
                                            )
                                        }
                                    />

                                    <span>
                                        I have a working phone
                                    </span>

                                </label>

                                <small>
                                    This helps responders know
                                    whether they can contact you.
                                </small>

                            </div>

                        </div>


                        {/* PHOTO */}

                        <div className="sos-photo-box">

                            <div className="sos-photo-icon">
                                <Camera size={19} />
                            </div>

                            <div className="sos-photo-copy">

                                <strong>
                                    Add a photo
                                </strong>

                                <span>
                                    Optional. A photo can help
                                    responders understand the
                                    situation faster.
                                </span>

                            </div>


                            <label className="sos-file-button">

                                Choose photo

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) =>
                                        setPhoto(
                                            event.target.files?.[0] ||
                                            null
                                        )
                                    }
                                />

                            </label>


                            {photo && (

                                <span className="sos-file-name">

                                    {photo.name}

                                </span>

                            )}

                        </div>


                        {/* ERROR */}

                        {error && (

                            <div className="sos-form-error">

                                <Info size={17} />

                                <span>
                                    {error}
                                </span>

                            </div>

                        )}


                        {/* SUCCESS */}

                        {success && (

                            <div className="sos-form-success">

                                <CheckCircle2 size={19} />

                                <div>

                                    <strong>
                                        SOS submitted successfully
                                    </strong>

                                    <span>

                                        Severity:
                                        {" "}
                                        {success.severity}

                                        {success.score !== null &&
                                            ` • Score ${success.score}`}

                                    </span>

                                </div>

                            </div>

                        )}


                        {/* SUBMIT */}

                        <button
                            type="submit"
                            className="sos-submit-button"
                            disabled={
                                submitting ||
                                !location
                            }
                        >

                            {submitting ? (

                                <>
                                    <span className="sos-spinner" />
                                    Sending emergency report...
                                </>

                            ) : (

                                <>
                                    <Send size={19} />
                                    Send Emergency SOS
                                </>

                            )}

                        </button>


                        <p className="sos-submit-note">

                            Your GPS location and emergency
                            information will be securely sent to
                            the response system.

                        </p>

                    </form>

                </section>

            </main>

        </div>
    );
}


export default SOSForm;
