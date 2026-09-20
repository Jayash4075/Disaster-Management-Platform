import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import api from "../api/axios";

export default function RelocationOverview() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCapacity = async () => {
            try {
                const response = await api.get(
                    "/api/relocation/capacity"
                );

                setData(response.data);
            } catch (error) {
                console.error(
                    "Unable to load relocation capacity:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        fetchCapacity();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-empty-state">
                Loading relocation capacity...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="dashboard-empty-state">
                <ShieldCheck size={32} />

                <h3>
                    Relocation data unavailable
                </h3>

                <p>
                    Safe-site capacity information will appear
                    when the backend provides it.
                </p>
            </div>
        );
    }

    return (
        <div className="relocation-capacity-grid">
            <div className="capacity-item">
                <span>Capacity Utilization</span>
                <strong>
                    {data.utilization ?? "—"}%
                </strong>
            </div>

            <div className="capacity-item">
                <span>Ready Sites</span>
                <strong>
                    {data.readySites ?? "—"}
                </strong>
            </div>

            <div className="capacity-item">
                <span>Sites Requiring Assessment</span>
                <strong>
                    {data.assessmentRequired ?? "—"}
                </strong>
            </div>
        </div>
    );
}