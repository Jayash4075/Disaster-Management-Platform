import React from "react";
import { useNavigate } from "react-router-dom";
import "./SOSCard.css";

const SOSCard = () => {

  const navigate = useNavigate();

  const handleSOS = () => {
    const confirmed = window.confirm(
      "Are you sure you want to send an emergency SOS?"
    );

    if (confirmed) {
      navigate("/emergency");
    }
  };

  return (
    <div className="sos-card">

      <div className="sos-icon">
        SOS
      </div>

      <h2>Emergency SOS</h2>

      <p>
        If you are in immediate danger, press the button below
        to request emergency assistance.
      </p>

      <button
        className="sos-button"
        onClick={handleSOS}
      >
        🚨 SEND SOS
      </button>

      <div className="emergency-contacts">

        <div className="emergency-contact">
          <span>🚓</span>
          <strong>Police</strong>
          <small>112</small>
        </div>

        <div className="emergency-contact">
          <span>🚑</span>
          <strong>Ambulance</strong>
          <small>108</small>
        </div>

        <div className="emergency-contact">
          <span>🔥</span>
          <strong>Fire</strong>
          <small>101</small>
        </div>

      </div>

    </div>
  );
};

export default SOSCard;