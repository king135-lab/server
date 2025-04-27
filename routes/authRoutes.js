// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail, resendVerification, requestPasswordReset, resetPassword } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.get('/verify/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password/:token', resetPassword);

module.exports = router;