import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";

function Signup() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "citizen",
    });

    const [otp, setOtp] = useState("");
    const [userId, setUserId] = useState(null);   // from signup response, needed for verify-otp
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);   // FIX: was missing entirely

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);

    // FIX: countdown effect for resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError("");
    };

    const validateForm = () => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const phoneRegex = /^[6-9]\d{9}$/;

        if (!formData.name.trim()) {
            setError("Please enter your full name");
            return false;
        }
        if (!emailRegex.test(formData.email)) {
            setError("Please enter a valid email address");
            return false;
        }
        if (!phoneRegex.test(formData.phone)) {
            setError("Please enter a valid 10-digit phone number");
            return false;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return false;
        }
        return true;
    };

    // STEP 1: Create account (backend creates user as unverified + sends OTP in same call)
    const handleSignup = async (e) => {
        e.preventDefault();
        setError("");

        if (!validateForm()) return;

        setLoading(true);

        try {
            const response = await api.post("/api/auth/signup", formData);
            const data = response.data;

            // backend returns { message, userId } — no token yet, account isn't verified
            setUserId(data.userId);
            setOtpSent(true);
            setResendCooldown(30); // FIX: start cooldown right after first OTP send too
            toast.success(data.message || "OTP sent to your email");
        } catch (error) {
            console.error("Signup error:", error.response?.data || error.message);
            const message =
                error.response?.data?.message ||
                "Unable to create account. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // STEP 2: Verify OTP — this is what actually logs the user in
    const handleVerifyOTP = async () => {
        setError("");

        if (!otp || otp.length !== 6) {
            setError("Please enter the 6-digit OTP");
            return;
        }

        setOtpLoading(true);

        try {
            const response = await api.post("/api/auth/verify-otp", {
                userId,
                otp,
            });
            const data = response.data;

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("role", data.user.role);

            setOtpVerified(true);
            toast.success(`Welcome, ${data.user.name}!`);
            navigate("/dashboard");
        } catch (error) {
            console.error("Verify OTP error:", error.response?.data || error.message);
            const message =
                error.response?.data?.message || "Invalid or expired OTP";
            setError(message);
            toast.error(message);
        } finally {
            setOtpLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        setError("");
        setOtpLoading(true);

        try {
            const response = await api.post("/api/auth/resend-otp", { userId });
            toast.success(response.data?.message || "OTP resent successfully");
            setResendCooldown(30); // FIX: was missing — this is what the button needs
        } catch (error) {
            console.error("Resend OTP error:", error.response?.data || error.message);
            const message =
                error.response?.data?.message || "Failed to resend OTP";
            setError(message);
            toast.error(message);
        } finally {
            setOtpLoading(false);
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
                    <h1>One Platform.<br />One Response.</h1>
                    <p>
                        ResQ brings citizens, rescuers, authorities, NGOs and volunteers
                        together for coordinated disaster response.
                    </p>
                </div>

                <div className="footer-text">
                    जन सेवा • आपदा प्रबंधन • सुरक्षित भारत
                </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="auth-right">
                <div className="auth-card signup-card">
                    <div className="card-header">
                        <h1>Create Account</h1>
                        <p>Register with ResQ</p>
                    </div>

                    <form onSubmit={handleSignup}>

                        {/* NAME */}
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                name="name"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={otpSent}
                                required
                            />
                        </div>

                        {/* EMAIL + PHONE */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                                    title="Enter a valid email address"
                                    disabled={otpSent}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Enter phone number"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    pattern="[6-9][0-9]{9}"
                                    title="Enter a valid 10-digit Indian mobile number"
                                    maxLength="10"
                                    disabled={otpSent}
                                    required
                                />
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                name="password"
                                placeholder="Minimum 6 characters"
                                value={formData.password}
                                onChange={handleChange}
                                minLength="6"
                                disabled={otpSent}
                                required
                            />
                        </div>

                        {/* ACCOUNT TYPE */}
                        <div className="form-group">
                            <label>Account Type</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                disabled={otpSent}
                            >
                                <option value="citizen">Citizen</option>
                                <option value="rescuer">Rescuer</option>
                                <option value="authority">Authority</option>
                                <option value="ngo">NGO</option>
                                <option value="volunteer">Volunteer</option>
                            </select>
                        </div>

                        {/* CREATE ACCOUNT BUTTON — only shown before OTP is sent */}
                        {!otpSent && (
                            <button type="submit" className="primary-button" disabled={loading}>
                                {loading ? "Creating account..." : "Create Account"}
                            </button>
                        )}

                        {/* OTP SECTION — shown after signup succeeds */}
                        {otpSent && !otpVerified && (
                            <div className="otp-section">
                                <div className="otp-message">
                                    <p>We've sent a 6-digit OTP to</p>
                                    <strong>{formData.email}</strong>
                                    <p style={{ fontSize: "0.85em", marginTop: "4px" }}>
                                        (Check your spam folder if you don't see it)
                                    </p>
                                </div>

                                <div className="form-group">
                                    <label>Enter OTP</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="6"
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, "");
                                            setOtp(value);
                                            setError("");
                                        }}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={handleVerifyOTP}
                                    disabled={otpLoading || otp.length !== 6}
                                >
                                    {otpLoading ? "Verifying..." : "Verify OTP"}
                                </button>

                                <button
                                    type="button"
                                    className="resend-button"
                                    onClick={handleResendOTP}
                                    disabled={otpLoading || resendCooldown > 0}
                                >
                                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                                </button>
                            </div>
                        )}

                        {/* ERROR */}
                        {error && <p className="error-text">{error}</p>}

                    </form>

                    <div className="auth-switch">
                        <p>
                            Already have an account? <Link to="/login">Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Signup;