const jwt = require('jsonwebtoken');
const User = require('../models/user.js');
const { sendOTP } = require('../utils/mailer');
const { isDomainValid } = require('../utils/validateEmail');

const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

module.exports.signup = async (req, res) => {
    try {
        const { name, email, password, role, phone, longitude, latitude } = req.body;
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ message: 'missing required fields' });
        }
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        const domainValid = await isDomainValid(email);
        if (!domainValid) {
            return res.status(400).json({ message: 'Email domain does not exist. Please check your email address.' });
        }
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: 'Invalid phone number format' });
        }
        const existingUser = await User.findOne({ email });
            if (existingUser) {
                if (existingUser.isVerified) {
                    return res.status(409).json({ message: 'email already registered' });
                }

                // Unverified account exists — resend OTP instead of blocking
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

                existingUser.otp = otp;
                existingUser.otpExpiry = otpExpiry;
                await existingUser.save();

                try {
                    await sendOTP(email, otp);
                } catch (mailErr) {
                    console.error('OTP resend failed:', mailErr);
                    return res.status(500).json({ message: 'Failed to send OTP. Please check your email address and try again.' });
                }

                return res.status(200).json({
                    message: 'Account already exists but is not verified. A new OTP has been sent.',
                    userId: existingUser._id
                });
            }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'citizen',
            phone,
            location: {
                type: 'Point',
                coordinates: [
                    longitude !== undefined ? longitude : 0,
                    latitude !== undefined ? latitude : 0,
                ],
            },
            otp,
            otpExpiry,
            isVerified: false
        });

        try {
            await sendOTP(email, otp);
        } 
        catch (mailErr) {
            await User.findByIdAndDelete(user._id);
            console.error('OTP send failed:', mailErr);
            return res.status(500).json({ message: 'Failed to send OTP. Please check your email address and try again.' });
        }

        res.status(201).json({
            message: 'OTP sent to email. Please verify to continue.',
            userId: user._id
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Signup failed', error: err.message });
    }
};

module.exports.verifyOTP = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        if (!userId || !otp) {
            return res.status(400).json({ message: 'User ID and OTP are required' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = generateToken(user._id, user.role);
        res.status(200).json({
            message: 'Verified successfully',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'OTP verification failed', error: err.message });
    }
};

module.exports.resendOTP = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        await sendOTP(user.email, otp);
        res.status(200).json({ message: 'OTP resent successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to resend OTP', error: err.message });
    }
};

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Please verify your email before logging in', userId: user._id });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = generateToken(user._id, user.role);

        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

module.exports.getMe = async (req, res) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({ user });
};