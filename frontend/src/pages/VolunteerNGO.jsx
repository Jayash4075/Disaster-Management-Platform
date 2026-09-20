import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./VolunteerNGO.css";

function VolunteerNGO() {

    const navigate = useNavigate();

    // =========================================
    // LOCATION
    // =========================================

    const [location, setLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationError, setLocationError] = useState("");

    // =========================================
    // NGO DATA
    // =========================================

    const [ngos, setNgos] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");


    // =========================================
    // GET CURRENT LOCATION
    // =========================================

    const getCurrentLocation = () => {

        setLocationLoading(true);
        setLocationError("");

        if (!navigator.geolocation) {

            setLocationError(
                "Geolocation is not supported by your browser."
            );

            setLocationLoading(false);

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
                    longitude
                });

                setLocationLoading(false);

                // Fetch NGOs using the location
                fetchNGOs(latitude, longitude);

            },

            (error) => {

                console.error(
                    "Location error:",
                    error
                );

                setLocationLoading(false);

                if (
                    error.code ===
                    error.PERMISSION_DENIED
                ) {

                    setLocationError(
                        "Location permission denied. Please allow location access."
                    );

                } else {

                    setLocationError(
                        "Unable to determine your location."
                    );

                }

            },

            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            }

        );
    };


    // =========================================
    // FETCH LOCATION-BASED NGOs
    // =========================================

    const fetchNGOs = async (
        latitude,
        longitude
    ) => {

        try {

            setLoading(true);

            /*
             * This endpoint will be connected
             * to your backend.
             *
             * Example:
             *
             * GET /api/ngos?lat=25.3176&lng=82.9739
             */

            const response = await fetch(

                `http://localhost:5000/api/ngos?lat=${latitude}&lng=${longitude}`

            );


            if (!response.ok) {

                throw new Error(
                    "Failed to fetch NGOs"
                );

            }


            const data =
                await response.json();


            setNgos(
                data.ngos || []
            );

        }

        catch (error) {

            console.error(
                "NGO API error:",
                error
            );

            /*
             * Do NOT add hard-coded NGOs here.
             *
             * If backend isn't available,
             * simply show no results.
             */

            setNgos([]);

        }

        finally {

            setLoading(false);

        }

    };


    // =========================================
    // GET LOCATION WHEN PAGE OPENS
    // =========================================

    useEffect(() => {

        getCurrentLocation();

    }, []);


    // =========================================
    // SEARCH
    // =========================================

    const filteredNGOs = ngos.filter(
        (ngo) =>
            ngo.name
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||

            ngo.services
                ?.toLowerCase()
                .includes(search.toLowerCase())
    );


    // =========================================
    // RENDER
    // =========================================

    return (

        <div className="ngo-page">


            {/* =====================================
                NAVBAR
            ===================================== */}

            <nav className="ngo-navbar">

                <div
                    className="ngo-logo"
                    onClick={() =>
                        navigate("/dashboard")
                    }
                >
                    Res<span>Q</span>
                </div>


                <div className="ngo-nav-links">

                    <button
                        onClick={() =>
                            navigate("/dashboard")
                        }
                    >
                        Dashboard
                    </button>


                    <button
                        onClick={() =>
                            navigate("/resources")
                        }
                    >
                        Resources
                    </button>


                    <button className="active">
                        Volunteers & NGOs
                    </button>

                </div>


                <button
                    className="ngo-back-btn"
                    onClick={() =>
                        navigate("/dashboard")
                    }
                >
                    ← Dashboard
                </button>

            </nav>


            {/* =====================================
                MAIN CONTENT
            ===================================== */}

            <main className="ngo-container">


                {/* HEADER */}

                <section className="ngo-header">

                    <div>

                        <p className="ngo-label">
                            COMMUNITY SUPPORT
                        </p>

                        <h1>
                            Volunteers & NGOs
                        </h1>

                        <p>
                            Find nearby organizations and
                            volunteers who can provide help
                            during emergencies.
                        </p>

                    </div>


                    {/* LOCATION */}

                    <div className="ngo-location">

                        <span>📍</span>

                        <div>

                            <small>
                                Your Location
                            </small>

                            <strong>

                                {locationLoading
                                    ? "Detecting..."
                                    : location
                                        ? "Location detected"
                                        : "Location unavailable"
                                }

                            </strong>

                        </div>

                    </div>

                </section>


                {/* LOCATION ERROR */}

                {locationError && (

                    <div className="ngo-location-error">

                        ⚠️ {locationError}

                        <button
                            onClick={getCurrentLocation}
                        >
                            Try Again
                        </button>

                    </div>

                )}


                {/* SEARCH */}

                <section className="ngo-search-section">

                    <div className="ngo-search">

                        <span>🔍</span>

                        <input
                            type="text"
                            placeholder="Search NGOs or services..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />

                    </div>


                    <button className="ngo-filter-btn">
                        ☰ Filter
                    </button>

                </section>


                {/* QUICK ACTIONS */}

                <section className="ngo-actions">

                    <div className="ngo-action-card">

                        <div className="ngo-action-icon">
                            🤝
                        </div>

                        <div>

                            <h3>
                                Need Help?
                            </h3>

                            <p>
                                Request assistance from
                                nearby volunteers.
                            </p>

                        </div>

                        <button>
                            Request Help →
                        </button>

                    </div>


                    <div className="ngo-action-card">

                        <div className="ngo-action-icon">
                            🙋
                        </div>

                        <div>

                            <h3>
                                Want to Volunteer?
                            </h3>

                            <p>
                                Offer your skills and help
                                people during emergencies.
                            </p>

                        </div>

                        <button>
                            Become a Volunteer →
                        </button>

                    </div>

                </section>


                {/* NGOs */}

                <section className="ngo-list-section">

                    <div className="ngo-section-heading">

                        <div>

                            <h2>
                                NGOs Near You
                            </h2>

                            <p>
                                Showing organizations based
                                on your current location.
                            </p>

                        </div>

                    </div>


                    {/* LOADING */}

                    {loading && (

                        <div className="ngo-message">

                            <span>🔄</span>

                            <p>
                                Finding NGOs near you...
                            </p>

                        </div>

                    )}


                    {/* NO LOCATION */}

                    {!locationLoading &&
                        !location &&
                        !loading && (

                            <div className="ngo-message">

                                <span>📍</span>

                                <h3>
                                    Location required
                                </h3>

                                <p>
                                    Allow location access to
                                    find NGOs near you.
                                </p>

                            </div>

                        )}


                    {/* NO RESULTS */}

                    {location &&
                        !loading &&
                        filteredNGOs.length === 0 && (

                            <div className="ngo-message">

                                <span>🏢</span>

                                <h3>
                                    No NGOs found nearby
                                </h3>

                                <p>
                                    There are currently no
                                    registered NGOs matching
                                    your search near your
                                    location.
                                </p>

                            </div>

                        )}


                    {/* NGO CARDS */}

                    {filteredNGOs.length > 0 && (

                        <div className="ngo-grid">

                            {filteredNGOs.map(
                                (ngo) => (

                                    <div
                                        className="ngo-card"
                                        key={ngo.id}
                                    >

                                        <div className="ngo-card-top">

                                            <div className="ngo-icon">
                                                🏢
                                            </div>

                                            <span>
                                                {ngo.available
                                                    ? "Available"
                                                    : "Unavailable"
                                                }
                                            </span>

                                        </div>


                                        <h3>
                                            {ngo.name}
                                        </h3>


                                        <p className="ngo-services">

                                            {ngo.services}

                                        </p>


                                        <div className="ngo-details">

                                            <span>
                                                📍{" "}
                                                {ngo.distance}
                                                {" "}away
                                            </span>

                                            {ngo.phone && (

                                                <span>
                                                    📞{" "}
                                                    {ngo.phone}
                                                </span>

                                            )}

                                        </div>


                                        <button
                                            onClick={() =>
                                                alert(
                                                    "NGO details will be available here."
                                                )
                                            }
                                        >
                                            View Details →
                                        </button>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </section>


                {/* EMERGENCY */}

                <section className="ngo-emergency">

                    <div>

                        <span>
                            🆘
                        </span>

                        <div>

                            <h3>
                                Need immediate emergency help?
                            </h3>

                            <p>
                                If you are in immediate danger,
                                use ResQ SOS to request emergency
                                assistance.
                            </p>

                        </div>

                    </div>


                    <button
                        onClick={() =>
                            navigate("/sos")
                        }
                    >
                        Activate SOS
                    </button>

                </section>


            </main>

        </div>

    );
}

export default VolunteerNGO;