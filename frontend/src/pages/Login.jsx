import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await api.post("/api/auth/login", { email, password });
            const data = response.data;

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("role", data.user.role);

            toast.success(`Welcome back, ${data.user.name}!`);

            if (data.user.role === "authority") {
                navigate("/authority");
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            console.error("Login error:", err.response?.data || err.message);

            // handle unverified-user case from your authController
            if (err.response?.status === 403 && err.response?.data?.userId) {
                toast.error("Please verify your email first");
                navigate("/signup", { state: { userId: err.response.data.userId, resumeOtp: true } });
                return;
            }

            const message = err.response?.data?.message || "Login failed. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">

            {/* LEFT SIDE */}
            <div className="auth-left">
                <div className="resq-brand">
                    <h2>ResQ</h2>
                    <span>Emergency Response & Relief Platform</span>
                </div>

                <div className="hero-content">
                    <h1>
                        Emergency Response
                        <br />
                        & Relief Platform
                    </h1>
                    <p>
                        A unified platform connecting citizens,
                        rescuers, authorities, NGOs and volunteers
                        for faster and coordinated emergency response.
                    </p>
                </div>

                <div className="footer-text">
                    जन सेवा • आपदा प्रबंधन • सुरक्षित भारत
                </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="auth-right">
                <div className="auth-card">
                    <div className="card-header">
                        <h1>Welcome Back</h1>
                        <p>Sign in to your ResQ account</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && <p className="error-text">{error}</p>}

                        <button type="submit" className="primary-button" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <div className="auth-switch">
                        <p>
                            Don't have an account?{" "}
                            <Link to="/signup">Create an account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;