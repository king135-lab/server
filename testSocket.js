// testSocket.js
const io = require('socket.io-client');
const socket = io('https://server-obl1.onrender.com'); // Connect to the server

// When the connection is established, join the game
socket.on('connect', () => {
    console.log('Connected to the server');

    // Join the game with gameId
    socket.emit('joinGame', '5b87vob');

    // Submit a guess
    socket.emit('submitGuess', '5b87vob', '42');
});

// Listen for updates from the server
socket.on('gameUpdate', (data) => {
    console.log('Game update:', data);
});
