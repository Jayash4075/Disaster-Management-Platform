const jwt = require("jsonwebtoken");

const User = require("../models/user.js");

const { sendOTP } = require("../utils/mailer");

const { isDomainValid } = require("../utils/validateEmail");

const generateToken = (userId, role) => {
    return jwt.sign(
        {
            id: userId,
            role: role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );
};

// Correct email regex
const emailRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ==========================================
// SIGNUP
// ==========================================
// Creates an unverified user and sends OTP
module.exports.signup = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            phone,
            longitude,
            latitude,
        } = req.body;

        // -----------------------------
        // Required fields
        // -----------------------------
        if (
            !name ||
            !email ||
            !phone ||
            !password
        ) {
            return res.status(400).json({
                message: "Missing required fields",
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        // -----------------------------
        // Email validation
        // -----------------------------
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Invalid email format",
            });
        }

        // -----------------------------
        // Check email domain
        // -----------------------------
        const domainValid =
            await isDomainValid(normalizedEmail);

        if (!domainValid) {
            return res.status(400).json({
                message:
                    "Email domain does not exist. Please check your email address.",
            });
        }

        // -----------------------------
        // Phone validation
        // -----------------------------
        const phoneRegex = /^[6-9]\d{9}$/;

        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                message:
                    "Invalid phone number format",
            });
        }

        // -----------------------------
        // Check existing user
        // -----------------------------
        const existingUser =
            await User.findOne({
                email: normalizedEmail,
            });

        if (existingUser) {

            // Already verified
            if (existingUser.isVerified) {
                return res.status(409).json({
                    message:
                        "Email already registered",
                });
            }

            // -----------------------------
            // Existing but unverified user
            // Generate new OTP
            // -----------------------------
            const otp = Math.floor(
                100000 +
                Math.random() * 900000
            ).toString();

            const otpExpiry = new Date(
                Date.now() + 5 * 60 * 1000
            );

            existingUser.otp = otp;
            existingUser.otpExpiry = otpExpiry;

            await existingUser.save();

            try {
                await sendOTP(
                    normalizedEmail,
                    otp
                );
            } catch (mailErr) {

                console.error(
                    "OTP resend failed:",
                    mailErr
                );

                return res.status(500).json({
                    message:
                        "Failed to send OTP. Please check your email address and try again.",
                });
            }

            return res.status(200).json({
                message:
                    "Account already exists but is not verified. A new OTP has been sent.",
                userId: existingUser._id,
            });
        }

        // -----------------------------
        // Generate OTP
        // -----------------------------
        const otp = Math.floor(
            100000 +
            Math.random() * 900000
        ).toString();

        const otpExpiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // -----------------------------
        // Create user
        // -----------------------------
        const user = await User.create({
            name: name.trim(),

            email: normalizedEmail,

            password,

            role: role || "citizen",

            phone,

            location: {
                type: "Point",

                coordinates: [
                    longitude !== undefined
                        ? Number(longitude)
                        : 0,

                    latitude !== undefined
                        ? Number(latitude)
                        : 0,
                ],
            },

            otp,

            otpExpiry,

            isVerified: false,
        });

        // -----------------------------
        // Send OTP
        // -----------------------------
        try {
            await sendOTP(
                normalizedEmail,
                otp
            );
        } catch (mailErr) {

            // Remove user if email failed
            await User.findByIdAndDelete(
                user._id
            );

            console.error(
                "OTP send failed:",
                mailErr
            );

            return res.status(500).json({
                message:
                    "Failed to send OTP. Please check your email address and try again.",
            });
        }

        // -----------------------------
        // SUCCESS
        // -----------------------------
        return res.status(201).json({
            message:
                "OTP sent to email. Please verify to continue.",

            userId: user._id,
        });

    } catch (err) {

        console.error(
            "Signup error:",
            err
        );

        return res.status(500).json({
            message: "Signup failed",
            error: err.message,
        });
    }
};

// ==========================================
// VERIFY OTP
// ==========================================
module.exports.verifyOTP = async (
    req,
    res
) => {
    try {

        const {
            userId,
            otp,
        } = req.body;

        // -----------------------------
        // Validate request
        // -----------------------------
        if (!userId || !otp) {
            return res.status(400).json({
                message:
                    "User ID and OTP are required",
            });
        }

        // -----------------------------
        // Find user
        // -----------------------------
        const user =
            await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // -----------------------------
        // Already verified
        // -----------------------------
        if (user.isVerified) {
            return res.status(400).json({
                message:
                    "User already verified",
            });
        }

        // -----------------------------
        // Compare OTP
        // -----------------------------
        if (
            String(user.otp) !==
            String(otp)
        ) {
            return res.status(400).json({
                message: "Invalid OTP",
            });
        }

        // -----------------------------
        // Check expiry
        // -----------------------------
        if (
            !user.otpExpiry ||
            user.otpExpiry < new Date()
        ) {
            return res.status(400).json({
                message:
                    "OTP expired. Please request a new one.",
            });
        }

        // -----------------------------
        // Verify user
        // -----------------------------
        user.isVerified = true;

        user.otp = undefined;

        user.otpExpiry = undefined;

        await user.save();

        // -----------------------------
        // Generate token
        // -----------------------------
        const token = generateToken(
            user._id,
            user.role
        );

        // -----------------------------
        // SUCCESS
        // -----------------------------
        return res.status(200).json({
            message:
                "Verified successfully",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (err) {

        console.error(
            "OTP verification error:",
            err
        );

        return res.status(500).json({
            message:
                "OTP verification failed",
            error: err.message,
        });
    }
};

// ==========================================
// RESEND OTP
// ==========================================
module.exports.resendOTP = async (
    req,
    res
) => {
    try {

        const {
            userId,
        } = req.body;

        // -----------------------------
        // Validate user ID
        // -----------------------------
        if (!userId) {
            return res.status(400).json({
                message:
                    "User ID is required",
            });
        }

        // -----------------------------
        // Find user
        // -----------------------------
        const user =
            await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // -----------------------------
        // Already verified
        // -----------------------------
        if (user.isVerified) {
            return res.status(400).json({
                message:
                    "User already verified",
            });
        }

        // -----------------------------
        // Generate new OTP
        // -----------------------------
        const otp = Math.floor(
            100000 +
            Math.random() * 900000
        ).toString();

        user.otp = otp;

        user.otpExpiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

        await user.save();

        // -----------------------------
        // Send email
        // -----------------------------
        try {
            await sendOTP(
                user.email,
                otp
            );
        } catch (mailErr) {

            console.error(
                "Resend OTP mail error:",
                mailErr
            );

            return res.status(500).json({
                message:
                    "Failed to resend OTP. Please try again.",
            });
        }

        return res.status(200).json({
            message:
                "OTP resent successfully",
        });

    } catch (err) {

        console.error(
            "Resend OTP error:",
            err
        );

        return res.status(500).json({
            message:
                "Failed to resend OTP",
            error: err.message,
        });
    }
};

// ==========================================
// LOGIN
// ==========================================
module.exports.login = async (
    req,
    res
) => {
    try {

        const {
            email,
            password,
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required",
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const user =
            await User.findOne({
                email: normalizedEmail,
            }).select("+password");

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid email or password",
            });
        }

        // -----------------------------
        // Email verification check
        // -----------------------------
        if (!user.isVerified) {
            return res.status(403).json({
                message:
                    "Please verify your email before logging in",
                userId: user._id,
            });
        }

        // -----------------------------
        // Password check
        // -----------------------------
        const isMatch =
            await user.comparePassword(
                password
            );

        if (!isMatch) {
            return res.status(401).json({
                message:
                    "Invalid email or password",
            });
        }

        // -----------------------------
        // Generate token
        // -----------------------------
        const token = generateToken(
            user._id,
            user.role
        );

        return res.status(200).json({
            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (err) {

        console.error(
            "Login error:",
            err
        );

        return res.status(500).json({
            message: "Login failed",
            error: err.message,
        });
    }
};

// ==========================================
// GET CURRENT USER
// ==========================================
module.exports.getMe = async (
    req,
    res
) => {
    try {

        const user =
            await User.findById(
                req.user.id
            );

        return res.status(200).json({
            user,
        });

    } catch (err) {

        console.error(
            "Get user error:",
            err
        );

        return res.status(500).json({
            message:
                "Failed to fetch user",
            error: err.message,
        });
    }
};