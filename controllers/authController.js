// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = 'your_jwt_secret_here';
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
        const verificationUrl = `https://np-game.vercel.app/api/auth/verify/${verificationToken}`;
        await transporter.sendMail({
            to: email,
            subject: 'Verify Your Email',
            html: `
<div style="text-align: center; padding: 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <p style="color: #333333; font-size: 16px; margin-bottom: 30px;">Almost there! Just one click to verify your email and start your journey ✨</p>
    
    <a href="${verificationUrl}" 
       style="display: inline-block; 
              padding: 15px 30px;
              background: linear-gradient(135deg, #4CAF50, #45a049);
              color: white; 
              text-decoration: none; 
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              letter-spacing: 0.5px;
              box-shadow: 0 4px 12px rgba(76, 175, 80, 0.25);
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;">
        Verify Your Email Now
    </a>

    <p style="color: #666666; font-size: 14px; margin-top: 30px;">
        Link not working? <br>
        Copy this URL: ${verificationUrl}
    </p>
</div>
`
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
        res.redirect(`https://np-game.vercel.app/?token=${jwtToken}`);
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
        const verificationUrl = `https://np-game.vercel.app/api/auth/verify/${verificationToken}`;
        await transporter.sendMail({
            to: email,
            subject: 'Verify Your Email',
            html: `
<div style="text-align: center; padding: 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <p style="color: #333333; font-size: 16px; margin-bottom: 30px;">Almost there! Just one click to verify your email and start your journey ✨</p>
    
    <a href="${verificationUrl}" 
       style="display: inline-block; 
              padding: 15px 30px;
              background: linear-gradient(135deg, #4CAF50, #45a049);
              color: white; 
              text-decoration: none; 
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              letter-spacing: 0.5px;
              box-shadow: 0 4px 12px rgba(76, 175, 80, 0.25);
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;">
        Verify Your Email Now
    </a>

    <p style="color: #666666; font-size: 14px; margin-top: 30px;">
        Link not working? <br>
        Copy this URL: ${verificationUrl}
    </p>
</div>
`
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
        const resetUrl = `https://np-game.vercel.app/reset-password/${resetToken}`;
        await transporter.sendMail({
            to: email,
            subject: 'Password Reset',
            html: `
<div style="text-align: center; padding: 25px 15px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; border-radius: 10px;">
    <h2 style="color: #FF5733; font-size: 24px; margin-bottom: 15px;">🔑 Password Reset Request</h2>
    
    <p style="color: #444444; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
        Need a fresh start? Let's get you back in action!<br>
        Click the button below to reset your password within the next 30 minutes.
    </p>

    <a href="${resetUrl}" 
       style="display: inline-block;
              padding: 16px 32px;
              background: linear-gradient(135deg, #FF6B6B, #FF5733);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              letter-spacing: 0.5px;
              box-shadow: 0 4px 15px rgba(255, 87, 51, 0.3);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              border: none;
              cursor: pointer;
              margin-bottom: 25px;">
        Reset Password Now
    </a>

    <div style="border-top: 1px solid #eeeeee; padding-top: 25px;">
        <p style="color: #666666; font-size: 14px; line-height: 1.5;">
            If you didn't request this reset, please secure your account immediately.<br>
            <small style="color: #999999;">Link valid for 30 minutes: ${resetUrl}</small>
        </p>
    </div>
</div>
`
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