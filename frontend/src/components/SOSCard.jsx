import React from "react";
import { useNavigate } from "react-router-dom";
import "./SOSCard.css";

const SOSCard = () => {

    const navigate = useNavigate();

    return (
        <div className="resq-sos-card">

            {/* =========================================
                LEFT
            ========================================= */}

            <div className="resq-sos-main">

                <div className="resq-sos-icon">
                    SOS
                </div>

                <div className="resq-sos-content">

                    <div className="resq-sos-label">
                        EMERGENCY ASSISTANCE
                    </div>

                    <h2>
                        Need immediate help?
                    </h2>

                    <p>
                        Send your emergency request with your
                        current location to the response team.
                    </p>

                </div>

            </div>


            {/* =========================================
                BUTTON
            ========================================= */}

            <div className="resq-sos-action">

                <button
                    className="resq-sos-button"
                    onClick={() => navigate("/sos-form")}
                >
                    <span>🚨</span>
                    Send Emergency SOS
                </button>

                <small>
                    Use only when you need urgent assistance.
                </small>

            </div>


            {/* =========================================
                EMERGENCY NUMBERS
            ========================================= */}

            <div className="resq-emergency-numbers">

                <div className="resq-emergency-number">
                    <span>🚓</span>

                    <div>
                        <strong>Police</strong>
                        <small>112</small>
                    </div>
                </div>


                <div className="resq-emergency-number">
                    <span>🚑</span>

                    <div>
                        <strong>Ambulance</strong>
                        <small>108</small>
                    </div>
                </div>


                <div className="resq-emergency-number">
                    <span>🔥</span>

                    <div>
                        <strong>Fire</strong>
                        <small>101</small>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default SOSCard;