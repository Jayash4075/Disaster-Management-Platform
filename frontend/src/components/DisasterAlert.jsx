import React from "react";
import "./DisasterAlert.css";

const DisasterAlert = ({
  disaster = "Heavy Rainfall",
  severity = "Moderate",
  location = "Your Area",
}) => {

  return (
    <div className="disaster-alert">

      <div className="disaster-alert-icon">
        ⚠️
      </div>

      <div className="disaster-alert-content">

        <div className="disaster-alert-title">
          <h3>{disaster}</h3>

          <span className={`severity ${severity.toLowerCase()}`}>
            {severity}
          </span>
        </div>

        <p>
          <span>📍</span>
          {location}
        </p>

      </div>

    </div>
  );
};

export default DisasterAlert;