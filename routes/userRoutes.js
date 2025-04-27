// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ wins: -1 })
            .select('username wins losses draws');
        res.json(users);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;