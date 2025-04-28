// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = 'a34f8597b4b7d5212b8143eca333b5d4fa4ae073d7155ecf17f49e5bfa97479a00d586be6a5aa02f8be14176532f1b78dd8da82c9221e0ebd1fd618f99fa7827206c2c7d21c2ed93f3f115d8881af360c5930454fa02969277618a80d4189c5304a46fdabaa273fb1fe64f99ee84d063f3799e08b3745da8544fdbb8cce42427efba26cc814b3e661a7edcdca8c1b45bb3c0aa817b9fa8eb61dd27751feac148604250ae8021b3660190ddb32b8471528fe6fbcc2aa92388460e2f8c5bab5c2c09df2b5dfacc23a62ccd4a7a75584eada738624efe67dce11f6cc9865adc5e6d507036d010bec7b9e4ba93ea91c1372bc04e0d7869684e4dd0c86cc4c51353b167274aabb32ec451b4781ce79ea465a8ffada0cfa64ffa65701ed05c780b9cfa4717d8343520eee5dc715877cb11054197c99a138b386811e2d688c195dac56a409cc04c76be09f8d93cd88f947989edd803af780f3ce0b48e4cb5be7ce519bf7ccecf60bc96c145fb65aa717528036b3c0e91d33da902a59dd94a277c20c900b52daf620d697f0fadc119695f776083ec938eb1c0e7f68c3adf947f10ff815fe92578eafec69c5a4845e7c5ce15ad49da8e87bbd73268f118af1b7f0c1581a811d7a4878ad9e2026e03996fde4a7e0ed80e09aca5334fbd717fb3a1c986e492fb89cbbc77e20d2e66042ea03ead0ab68a30bcd40abc4e30d7ceb5cdbfc6f92c';
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
        res.redirect(`https://server-obl1.onrender.com/?token=${jwtToken}`);
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
        const verificationUrl = `https://server-obl1.onrender.com/api/auth/verify/${verificationToken}`;
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
        const resetUrl = `https://server-obl1.onrender.com/reset-password/${resetToken}`;
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