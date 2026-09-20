import React from "react";
import "./RiskCard.css";

const RiskCard = ({
  riskLevel = "Low",
  riskScore = 25,
}) => {

  const getRiskClass = () => {
    if (riskLevel === "High") return "high";
    if (riskLevel === "Medium") return "medium";
    return "low";
  };

  return (
    <div className={`risk-card ${getRiskClass()}`}>

      <div className="risk-header">

        <div>
          <span className="risk-label">
            Current Risk Level
          </span>

          <h2>{riskLevel}</h2>
        </div>

        <div className="risk-icon">
          🛡️
        </div>

      </div>

      <div className="risk-meter">

        <div
          className="risk-meter-fill"
          style={{
            width: `${riskScore}%`,
          }}
        ></div>

      </div>

      <div className="risk-footer">
        <span>Risk Score</span>
        <strong>{riskScore}/100</strong>
      </div>

      <p>
        Based on current disaster and environmental
        conditions in your area.
      </p>

    </div>
  );
};

export default RiskCard;