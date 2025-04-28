const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const gameRoutes = require('./routes/gameRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const path = require('path'); // Add path module

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(cors());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kingnanfo@gmail.com',
        pass: 'wqis cnxr oxoo agtn'
    }
});

app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/auth', authRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'build'))); // Adjust to 'dist' if needed

// Handle client-side routing (serve index.html for all non-API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

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