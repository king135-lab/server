// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const gameRoutes = require('./routes/gameRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kingnanfo@gmail.com', // Replace with your Gmail
        pass: 'wqis cnxr oxoo agtn'     // Replace with your App Password
    }
});

app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/auth', authRoutes);

mongoose
    .connect('mongodb+srv://adem:adem@np.g88gat7.mongodb.net/?retryWrites=true&w=majority&appName=np', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});