import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import "./AuthorityDashboard.css";

const TEAM_TYPES = [
    "MEDICAL",
    "FIRE",
    "POLICE",
    "NDRF",
    "DISASTER_RESPONSE",
    "SEARCH_AND_RESCUE",
    "OTHER",
];

function CreateRescueTeam() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        organization: "",
        teamType: "SEARCH_AND_RESCUE",
        members: 5,
        capabilities: "",
        equipment: "",
        latitude: "",
        longitude: "",
        maxCapacity: 10,
        responseRadius: 20,
        rating: 4,
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setForm((prev) => ({
                    ...prev,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6),
                }));
                toast.success("Location captured.");
            },
            () => toast.error("Could not get location.")
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.name.trim() || !form.organization.trim()) {
            setError("Team name and organization are required.");
            return;
        }
        if (!form.latitude || !form.longitude) {
            setError("Latitude and longitude are required.");
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                name: form.name.trim(),
                organization: form.organization.trim(),
                teamType: form.teamType,
                members: Number(form.members),
                capabilities: form.capabilities
                    ? form.capabilities.split(",").map((s) => s.trim()).filter(Boolean)
                    : [],
                equipment: form.equipment
                    ? form.equipment.split(",").map((s) => s.trim()).filter(Boolean)
                    : [],
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
                availability: true,
                currentStatus: "AVAILABLE",
                maxCapacity: Number(form.maxCapacity),
                responseRadius: Number(form.responseRadius),
                rating: Number(form.rating),
            };

            await api.post("/api/rescue-teams", payload);

            toast.success(`${payload.name} created and marked available.`);
            navigate("/authority");
        } catch (err) {
            console.error("Create rescue team error:", err.response?.data || err.message);
            const message = err.response?.data?.message || "Failed to create rescue team.";
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="authority-page">
            
            <header className="authority-header">
                <div>
                    <h1>ResQ — Create Rescue Team</h1>
                    <p>Register a new team for dispatch</p>
                </div>
                <button className="refresh-btn" onClick={() => navigate("/authority")}>
                    ← Back to Dashboard
                </button>
            </header>

            <main className="authority-list">
                <div className="sos-report-card">
                    {error && <p className="authority-error">⚠️ {error}</p>}

                    <form onSubmit={handleSubmit} className="sos-form">
                        <div className="field-row">
                            <div>
                                <label>Team Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="e.g. Alpha Rescue Squad"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div>
                                <label>Organization</label>
                                <input
                                    type="text"
                                    name="organization"
                                    placeholder="e.g. District Disaster Response"
                                    value={form.organization}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="field-row">
                            <div>
                                <label>Team Type</label>
                                <select name="teamType" value={form.teamType} onChange={handleChange}>
                                    {TEAM_TYPES.map((type) => (
                                        <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Members</label>
                                <input
                                    type="number"
                                    name="members"
                                    min="1"
                                    value={form.members}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label>Capabilities (comma-separated)</label>
                            <input
                                type="text"
                                name="capabilities"
                                placeholder="e.g. water rescue, first aid"
                                value={form.capabilities}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label>Equipment (comma-separated)</label>
                            <input
                                type="text"
                                name="equipment"
                                placeholder="e.g. boats, medical kits"
                                value={form.equipment}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="field-row">
                            <div>
                                <label>Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="latitude"
                                    value={form.latitude}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div>
                                <label>Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="longitude"
                                    value={form.longitude}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            className="cancel-assign"
                            style={{ alignSelf: "flex-start" }}
                            onClick={handleUseMyLocation}
                        >
                            📍 Use My Current Location
                        </button>

                        <div className="field-row">
                            <div>
                                <label>Max Capacity</label>
                                <input
                                    type="number"
                                    name="maxCapacity"
                                    min="1"
                                    value={form.maxCapacity}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label>Response Radius (km)</label>
                                <input
                                    type="number"
                                    name="responseRadius"
                                    min="0"
                                    value={form.responseRadius}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label>Rating (0–5)</label>
                            <input
                                type="number"
                                name="rating"
                                min="0"
                                max="5"
                                step="0.1"
                                value={form.rating}
                                onChange={handleChange}
                            />
                        </div>

                        <button type="submit" className="assign-btn" disabled={submitting}>
                            {submitting ? "Creating..." : "Create Rescue Team"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default CreateRescueTeam;