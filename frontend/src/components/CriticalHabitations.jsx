import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import api from "../api/axios";

export default function CriticalHabitations() {
    const [habitations, setHabitations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHabitations = async () => {
            try {
                const response = await api.get(
                    "/api/habitations?priority=Immediate"
                );

                setHabitations(response.data || []);
            } catch (error) {
                console.error(
                    "Unable to load habitations:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        fetchHabitations();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-empty-state">
                Loading habitation data...
            </div>
        );
    }

    if (!habitations.length) {
        return (
            <div className="dashboard-empty-state">
                <AlertTriangle size={32} />

                <h3>
                    No habitation data available
                </h3>

                <p>
                    Critical habitation information will
                    appear here once the backend provides it.
                </p>
            </div>
        );
    }

    return (
        <div className="habitations-table-wrapper">
            <table className="habitations-table">
                <thead>
                    <tr>
                        <th>Habitation</th>
                        <th>District</th>
                        <th>Risk Score</th>
                        <th>Population</th>
                        <th>Priority</th>
                    </tr>
                </thead>

                <tbody>
                    {habitations.map((habitation) => (
                        <tr key={habitation.id}>
                            <td>
                                {habitation.name}
                            </td>

                            <td>
                                {habitation.district}
                            </td>

                            <td>
                                {habitation.riskScore}
                            </td>

                            <td>
                                {habitation.population?.toLocaleString()}
                            </td>

                            <td>
                                <span className="priority-badge immediate">
                                    {habitation.priority}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}