import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomeRoute } from "../utils/roleRoutes";

function NotFoundPage() {
    const navigate = useNavigate();
    const { user, token } = useAuth();

    const homePath = token ? getHomeRoute(user?.role) : "/login";
    const label = token ? "Back to dashboard" : "Go to login";

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            fontFamily: "sans-serif",
            textAlign: "center",
            padding: 24
        }}>
            <h1 style={{ fontSize: 22 }}>This page isn't ready yet</h1>
            <p style={{ color: "#666", maxWidth: 400 }}>
                We're still building this section. Head back and we'll take you
                where you need to go.
            </p>
            <button
                onClick={() => navigate(homePath)}
                style={{
                    background: "#204E6D",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 20px",
                    fontWeight: 600,
                    cursor: "pointer"
                }}
            >
                {label}
            </button>
        </div>
    );
}

export default NotFoundPage;