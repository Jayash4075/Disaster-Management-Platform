const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false,
        },
        role: {
            type: String,
            enum: ['citizen', 'rescuer', 'authority', 'ngo', 'volunteer'],
            required: true,
            default: 'citizen',
        },
        phone: {
            type: String,
            required: [true, 'Phone no. is required'],
        },
        otp: { type: String },
        otpExpiry: { type: Date },
        isVerified: { type: Boolean, default: false },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number],
                default: [0, 0],
            },
        },
    },
    {timestamps: true}
);
userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return ;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare a plain password against the stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;