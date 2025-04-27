// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = 'b7876b97c072867f9e179d215ba295ec92b47f74472dc124d6c1d8b42327e0e9dd466333120e3af6bb566536b73b4b140b7347ab67770a4c1afb3fcab5cfeddcba216d65bfd7db2e90ae05b2919255acac733a5101e4e82a97ef86bee4e09de088bb3481efd776287d896944f8d20f3a700fabbc17fa2132caa1075c8f933cf35d14f7265f76f6a09911d39e7603934aeddccdc44fe01c27f8131aeabe78960f18bec36dde1261e124784362f8b62cddc4a333be74f1682c793f053014c03b0323390e5a3c523dbbbcd39d51b39e32ad6e8061444c328869181c02aee924935e62afb88f7d46c3881f7582a5e1fbcb810bf44ea4ecc2e8f7ec3c01203fef0fdebdbd1d4abab840e1ff176758e1b92a87c4651c898e3c9279026ca0014416ead942aba7e6567b0caceea772b3ca30e52cb33f507549d2ea23fa62c824f7078e744492f11cba0a02b51bb037e3ee0ed1c945f09349a41270f99c84066e71109a82b68000861935882da75788ad30008bfb9edb3e48dfb29d93d5da54c4d2d7eeee6ca1fc7c331ad13560fadd2936350bd26909631fb4ef4b48a5c6bba927b89b249a54107efad60e034b531d12b94087af8705340dc89d12f6139c75b16d2a2608a9825c9e70b1bc1dfb83972753c444b016a00160eeb64d54a33b4c3b6c584e19f6ccee72f67e1011530aa62abda236aeb0b29e059dafd103129c476c1ec696f0';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kingnanfo@gmail.com',
        pass: 'wqis cnxr oxoo agtn'
    }
});

const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please provide username, email, and password' });
        }
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with that email or username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            verificationToken
        });
        await newUser.save();
        const verificationUrl = `https://server-obl1.onrender.com/api/auth/verify/${verificationToken}`;
        await transporter.sendMail({
            to: email,
            subject: 'Verify Your Email',
            html: `Click <a href="${verificationUrl}">here</a> to verify your email.`
        });
        return res.status(201).json({ message: 'User created. Please verify your email.' });
    } catch (err) {
        console.error('Error during signup:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        if (!user.isVerified) {
            return res.status(400).json({ message: 'Please verify your email first' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: { username: user.username, email: user.email }
        });
    } catch (err) {
        console.error('Error during login:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();
        const jwtToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.redirect(`http://localhost:3000/?token=${jwtToken}`);
    } catch (err) {
        console.error('Error during verification:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();
        const verificationUrl = `http://localhost:5000/api/auth/verify/${verificationToken}`;
        await transporter.sendMail({
            to: email,
            subject: 'Verify Your Email',
            html: `Click <a href="${verificationUrl}">here</a> to verify your email.`
        });
        res.status(200).json({ message: 'Verification email resent' });
    } catch (err) {
        console.error('Error resending verification:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
        await transporter.sendMail({
            to: email,
            subject: 'Password Reset',
            html: `Click <a href="${resetUrl}">here</a> to reset your password.`
        });
        res.status(200).json({ message: 'Password reset email sent' });
    } catch (err) {
        console.error('Error requesting password reset:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    signup,
    login,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword
};
