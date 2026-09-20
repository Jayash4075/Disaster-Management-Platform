import { useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";

const FIELD_GROUPS = [
    { label: "Habitation ID", name: "habitationId", type: "text" },
    { label: "Name", name: "name", type: "text" },
    { label: "Latitude", name: "latitude", type: "number", step: "any" },
    { label: "Longitude", name: "longitude", type: "number", step: "any" },
    { label: "Population", name: "population", type: "number" },
    { label: "Rainfall (mm)", name: "rainfall", type: "number" },
    { label: "River Level (m)", name: "riverLevel", type: "number" },
    { label: "Flood History (past events)", name: "floodHistory", type: "number" },
    { label: "Building Damage (0-10 scale)", name: "buildingDamage", type: "number" },
    { label: "Vulnerable Population", name: "vulnerablePopulation", type: "number" },
    { label: "Water Level (m)", name: "waterLevel", type: "number" },
    { label: "Road Access (0-10 scale)", name: "roadAccess", type: "number" },
    { label: "Hospital Distance (km)", name: "hospitalDistance", type: "number" },
    { label: "Shelter Capacity", name: "shelterCapacity", type: "number" },
    { label: "Available Water (liters)", name: "availableWater", type: "number" },
    { label: "Food Stock (units)", name: "foodStock", type: "number" },
    { label: "Medical Capacity (beds/units)", name: "medicalCapacity", type: "number" },
];

function CreateHabitation() {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setResult(null);
        setLoading(true);

        try {
            const response = await api.post("/api/habitations", formData);
            setResult(response.data.habitation);
            toast.success("Habitation created and assessed by ML");
        } catch (err) {
            console.error("Create habitation error:", err.response?.data || err);
            const message = err.response?.data?.message || "Failed to create habitation";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
            <h1>Add New Habitation</h1>
            <p>Enter raw environmental and infrastructure data. The system will run this through the ML risk model immediately.</p>

            <form onSubmit={handleSubmit}>
                {FIELD_GROUPS.map((field) => (
                    <div key={field.name} className="form-group" style={{ marginBottom: 14 }}>
                        <label>{field.label}</label>
                        <input
                            type={field.type}
                            name={field.name}
                            step={field.step}
                            onChange={handleChange}
                            required
                        />
                    </div>
                ))}

                {error && <p className="error-text">{error}</p>}

                <button type="submit" className="primary-button" disabled={loading}>
                    {loading ? "Assessing with ML..." : "Create & Assess Habitation"}
                </button>
            </form>

            {result && (
                <div style={{ marginTop: 24, padding: 16, border: "1px solid #ccc" }}>
                    <h2>Assessment Result</h2>
                    <p>Risk Score: <strong>{result.riskScore}</strong></p>
                    <p>Risk Level: <strong>{result.riskLevel}</strong></p>
                    <p>Relocation Priority: <strong>{result.relocationPriority}</strong></p>
                    {result.vulnerabilityScore == null && (
                        <p style={{ color: "#b45309" }}>
                            ⚠️ Vulnerability score unavailable — this habitation ID doesn't match a known village code in the ML dataset.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default CreateHabitation;