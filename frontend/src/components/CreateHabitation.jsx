import { useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";

const CONDITION_FIELDS = [
    { label: "Rainfall (mm)", name: "rainfall" },
    { label: "River Level (m)", name: "riverLevel" },
    { label: "Flood History (past events)", name: "floodHistory" },
    { label: "Building Damage (0-10)", name: "buildingDamage" },
    { label: "Vulnerable Population", name: "vulnerablePopulation" },
    { label: "Water Level (m)", name: "waterLevel" },
    { label: "Road Access (0-10)", name: "roadAccess" },
    { label: "Hospital Distance (km)", name: "hospitalDistance" },
    { label: "Shelter Capacity", name: "shelterCapacity" },
    { label: "Available Water (litres)", name: "availableWater" },
    { label: "Food Stock (units)", name: "foodStock" },
    { label: "Medical Capacity", name: "medicalCapacity" },
];

function HabitationRiskAssessment() {
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedVillage, setSelectedVillage] = useState(null);
    const [conditions, setConditions] = useState({});
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSearch = async (value) => {
        setQuery(value);
        if (value.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const response = await api.get(`/api/habitations/ml-villages/search?q=${encodeURIComponent(value)}`);
            setSearchResults(response.data.data?.villages || []);
        } catch (err) {
            console.error("Village search error:", err);
        }
    };

    const handleSelectVillage = (village) => {
        setSelectedVillage(village);
        setSearchResults([]);
        setQuery(village.village_name);
        setResult(null);
    };

    const handleConditionChange = (e) => {
        setConditions({ ...conditions, [e.target.name]: e.target.value });
    };

    const handleAssess = async (e) => {
        e.preventDefault();
        if (!selectedVillage) {
            setError("Please select a village first");
            return;
        }
        setError("");
        setLoading(true);

        try {
            const response = await api.post("/api/habitations/assess-village", {
                villageCode: selectedVillage.village_code,
                villageName: selectedVillage.village_name,
                population: selectedVillage.population,
                ...conditions
            });
            setResult(response.data.habitation);
            toast.success("Risk assessed successfully");
        } catch (err) {
            console.error("Assess village error:", err.response?.data || err);
            const message = err.response?.data?.message || "Assessment failed";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
            <h1>Village Risk Assessment</h1>

            <div style={{ marginBottom: 16, position: "relative" }}>
                <label>Search Village</label>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="e.g. Rampur"
                />
                {searchResults.length > 0 && (
                    <ul style={{ border: "1px solid #ccc", listStyle: "none", padding: 0, margin: 0 }}>
                        {searchResults.map((v) => (
                            <li
                                key={v.village_code}
                                onClick={() => handleSelectVillage(v)}
                                style={{ padding: 8, cursor: "pointer" }}
                            >
                                {v.village_name} — Pop: {v.population}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {selectedVillage && (
                <div style={{ marginBottom: 16, padding: 12, background: "#f8fafc" }}>
                    <strong>{selectedVillage.village_name}</strong>
                    <p>Population: {selectedVillage.population}</p>
                    <p>Vulnerability: {selectedVillage.vulnerability_category} ({selectedVillage.vulnerability_score_100})</p>
                </div>
            )}

            <form onSubmit={handleAssess}>
                <h3>Current Conditions</h3>
                {CONDITION_FIELDS.map((field) => (
                    <div key={field.name} style={{ marginBottom: 10 }}>
                        <label>{field.label}</label>
                        <input type="number" name={field.name} onChange={handleConditionChange} required />
                    </div>
                ))}

                {error && <p style={{ color: "red" }}>{error}</p>}

                <button type="submit" disabled={loading || !selectedVillage}>
                    {loading ? "Assessing..." : "Assess Risk"}
                </button>
            </form>

            {result && (
                <div style={{ marginTop: 20, padding: 16, border: "1px solid #ccc" }}>
                    <h2>Result</h2>
                    <p>Risk Score: <strong>{result.riskScore}</strong></p>
                    <p>Risk Level: <strong>{result.riskLevel}</strong></p>
                    <p>Relocation Priority: <strong>{result.relocationPriority}</strong></p>
                </div>
            )}
        </div>
    );
}

export default HabitationRiskAssessment;