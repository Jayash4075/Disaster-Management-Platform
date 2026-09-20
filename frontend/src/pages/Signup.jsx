import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/axios";

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
    const [userId, setUserId] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);

    // -----------------------------------------
    // HANDLE INPUT CHANGES
    // -----------------------------------------
    const handleChange = (e) => {
        setFormData((previous) => ({
            ...previous,
            [e.target.name]: e.target.value,
        }));

        setError("");
    };

    // -----------------------------------------
    // VALIDATE FORM
    // -----------------------------------------
    const validateForm = () => {
        const emailRegex =
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        const phoneRegex = /^[6-9]\d{9}$/;

        if (!formData.name.trim()) {
            setError("Please enter your full name");
            return false;
        }

        if (!emailRegex.test(formData.email.trim())) {
            setError("Please enter a valid email address");
            return false;
        }

        if (!phoneRegex.test(formData.phone.trim())) {
            setError("Please enter a valid 10-digit phone number");
            return false;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return false;
        }

        return true;
    };

    // -----------------------------------------
    // STEP 1:
    // CREATE UNVERIFIED USER + SEND OTP
    // -----------------------------------------
    const handleSendOTP = async () => {
        setError("");

        if (!validateForm()) {
            return;
        }

        setOtpLoading(true);

        try {
            const response = await api.post(
                "/api/auth/signup",
                {
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    phone: formData.phone.trim(),
                    password: formData.password,
                    role: formData.role,
                }
            );

            console.log(
                "Signup / OTP response:",
                response.data
            );

            const receivedUserId =
                response.data?.userId;

            if (!receivedUserId) {
                throw new Error(
                    "User ID was not returned by the server"
                );
            }

            // Save user ID for OTP verification
            setUserId(receivedUserId);

            // Show OTP section
            setOtpSent(true);

            // Clear old OTP
            setOtp("");

            toast.success(
                response.data?.message ||
                    "OTP sent to your email"
            );
        } catch (error) {
            console.error(
                "Send OTP error:",
                error.response?.data || error.message
            );

            const message =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Unable to send OTP. Please try again.";

            setError(message);

            toast.error(message);
        } finally {
            setOtpLoading(false);
        }
    };

    // -----------------------------------------
    // STEP 2:
    // VERIFY OTP
    // -----------------------------------------
    const handleVerifyOTP = async () => {
        setError("");

        if (!otp || otp.length !== 6) {
            setError("Please enter the 6-digit OTP");
            return;
        }

        if (!userId) {
            setError(
                "User ID is missing. Please request a new OTP."
            );
            return;
        }

        setOtpLoading(true);

        try {
            const response = await api.post(
                "/api/auth/verify-otp",
                {
                    userId: userId,
                    otp: otp.trim(),
                }
            );

            console.log(
                "Verify OTP response:",
                response.data
            );

            // -----------------------------------------
            // BACKEND RETURNS TOKEN + USER
            // -----------------------------------------
            if (response.data?.token) {
                localStorage.setItem(
                    "token",
                    response.data.token
                );
            }

            if (response.data?.user) {
                localStorage.setItem(
                    "user",
                    JSON.stringify(response.data.user)
                );
            }

            setOtpVerified(true);
            setError("");

            toast.success(
                response.data?.message ||
                    "Email verified successfully"
            );

        } catch (error) {
            console.error(
                "Verify OTP error:",
                error.response?.data || error.message
            );

            const message =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Invalid or expired OTP";

            setError(message);

            toast.error(message);

            setOtpVerified(false);
        } finally {
            setOtpLoading(false);
        }
    };

    // -----------------------------------------
    // STEP 3:
    // RESEND OTP
    // -----------------------------------------
    const handleResendOTP = async () => {
        setError("");

        if (!userId) {
            setError(
                "User ID is missing. Please start signup again."
            );
            return;
        }

        setOtpLoading(true);

        try {
            const response = await api.post(
                "/api/auth/resend-otp",
                {
                    userId: userId,
                }
            );

            setOtp("");

            toast.success(
                response.data?.message ||
                    "OTP resent successfully"
            );
        } catch (error) {
            console.error(
                "Resend OTP error:",
                error.response?.data || error.message
            );

            const message =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Failed to resend OTP";

            setError(message);

            toast.error(message);
        } finally {
            setOtpLoading(false);
        }
    };

    // -----------------------------------------
    // STEP 4:
    // CONTINUE AFTER VERIFICATION
    // -----------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        if (!otpVerified) {
            setError(
                "Please verify your email with OTP first"
            );
            return;
        }

        setLoading(true);

        try {
            const storedUser = JSON.parse(
                localStorage.getItem("user") || "null"
            );

            if (!storedUser) {
                setError(
                    "User information is missing. Please login again."
                );
                return;
            }

            toast.success(
                `Welcome, ${storedUser.name}!`
            );

            // Redirect according to role
            switch (storedUser.role) {
                case "authority":
                    navigate("/authority");
                    break;

                case "citizen":
                    navigate("/dashboard");
                    break;

                case "rescuer":
                    navigate("/rescuer");
                    break;

                case "ngo":
                    navigate("/ngo");
                    break;

                case "volunteer":
                    navigate("/volunteer");
                    break;

                default:
                    navigate("/dashboard");
            }
        } catch (error) {
            console.error(
                "Dashboard redirect error:",
                error
            );

            setError(
                "Account verified, but dashboard could not be opened."
            );
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

                    <span>
                        Emergency Response & Relief Platform
                    </span>
                </div>

                <div className="hero-content">

                    <h1>
                        One Platform.
                        <br />
                        One Response.
                    </h1>

                    <p>
                        ResQ brings citizens, rescuers,
                        authorities, NGOs and volunteers
                        together for coordinated disaster
                        response.
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

                        <p>
                            Register with ResQ
                        </p>

                    </div>

                    <form onSubmit={handleSubmit}>

                        {/* NAME */}
                        <div className="form-group">

                            <label>
                                Full Name
                            </label>

                            <input
                                type="text"
                                name="name"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                disabled={otpSent}
                            />

                        </div>

                        {/* EMAIL + PHONE */}
                        <div className="form-row">

                            <div className="form-group">

                                <label>
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    disabled={otpSent}
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Enter phone number"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    pattern="[6-9][0-9]{9}"
                                    title="Enter a valid 10-digit Indian mobile number"
                                    maxLength="10"
                                    required
                                    disabled={otpSent}
                                />

                            </div>

                        </div>

                        {/* PASSWORD */}
                        <div className="form-group">

                            <label>
                                Password
                            </label>

                            <input
                                type="password"
                                name="password"
                                placeholder="Minimum 6 characters"
                                value={formData.password}
                                onChange={handleChange}
                                minLength="6"
                                required
                                disabled={otpSent}
                            />

                        </div>

                        {/* ACCOUNT TYPE */}
                        <div className="form-group">

                            <label>
                                Account Type
                            </label>

                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                disabled={otpSent}
                            >

                                <option value="citizen">
                                    Citizen
                                </option>

                                <option value="rescuer">
                                    Rescuer
                                </option>

                                <option value="authority">
                                    Authority
                                </option>

                                <option value="ngo">
                                    NGO
                                </option>

                                <option value="volunteer">
                                    Volunteer
                                </option>

                            </select>

                        </div>

                        {/* SEND OTP */}
                        {!otpSent && (

                            <button
                                type="button"
                                className="primary-button"
                                onClick={handleSendOTP}
                                disabled={otpLoading}
                            >

                                {otpLoading
                                    ? "Sending OTP..."
                                    : "Send OTP"}

                            </button>

                        )}

                        {/* OTP SECTION */}
                        {otpSent && !otpVerified && (

                            <div className="otp-section">

                                <div className="otp-message">

                                    <p>
                                        We've sent a 6-digit
                                        OTP to
                                    </p>

                                    <strong>
                                        {formData.email}
                                    </strong>

                                </div>

                                <div className="form-group">

                                    <label>
                                        Enter OTP
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="6"
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={(e) => {

                                            const value =
                                                e.target.value.replace(
                                                    /\D/g,
                                                    ""
                                                );

                                            setOtp(value);
                                            setError("");

                                        }}
                                    />

                                </div>

                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={handleVerifyOTP}
                                    disabled={
                                        otpLoading ||
                                        otp.length !== 6
                                    }
                                >

                                    {otpLoading
                                        ? "Verifying..."
                                        : "Verify OTP"}

                                </button>

                                <button
                                    type="button"
                                    className="resend-button"
                                    onClick={handleResendOTP}
                                    disabled={otpLoading}
                                >
                                    Resend OTP
                                </button>

                            </div>

                        )}

                        {/* VERIFIED MESSAGE */}
                        {otpVerified && (

                            <div className="otp-verified">

                                ✓ Email verified successfully

                            </div>

                        )}

                        {/* CONTINUE */}
                        {otpVerified && (

                            <button
                                type="submit"
                                className="primary-button"
                                disabled={loading}
                            >

                                {loading
                                    ? "Opening dashboard..."
                                    : "Continue to Dashboard"}

                            </button>

                        )}

                        {/* ERROR */}
                        {error && (

                            <p className="error-text">
                                {error}
                            </p>

                        )}

                    </form>

                    <div className="auth-switch">

                        <p>

                            Already have an account?{" "}

                            <Link to="/login">
                                Sign In
                            </Link>

                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Signup;