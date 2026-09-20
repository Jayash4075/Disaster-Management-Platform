import React from "react";
import "./AlertCard.css";

const AlertCard = ({
  title,
  description,
  severity = "warning",
  time = "Recently",
}) => {
  return (
    <div className={`alert-card ${severity}`}>

      <div className="alert-card-icon">
        {severity === "danger" && "🚨"}
        {severity === "warning" && "⚠️"}
        {severity === "info" && "ℹ️"}
        {severity === "safe" && "✅"}
      </div>

      <div className="alert-card-content">

        <div className="alert-card-header">
          <h3>{title}</h3>
          <span>{time}</span>
        </div>

        <p>{description}</p>

      </div>

    </div>
  );
};

export default AlertCard;