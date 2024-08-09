const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid'); // To generate unique IDs

// Setup the Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

const POEM_LENGTH = 2;
const DISPLAY_SINGLE = false;

// Serve static files from the "public" directory
app.use(express.static('public'));

let games = {}; // Store the game sessions

// Create a new game
/* app.get('/createGame', (req, res) => {
    //const gameId = uuidv4();
    const gameId = uuidv4().substring(0, 5);
    games[gameId] = {
        players: [],
        playerSockets: [],
        currentPoemIndices: [],
        poems: [],
        poemLength: POEM_LENGTH,
        displaySingle: DISPLAY_SINGLE,
        running: false
    };
    res.json({ gameId });
}); */

// Socket connection
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('create-game', ({ numberOfRounds, playerName }) => {
        const gameId = uuidv4().substring(0, 5);
        games[gameId] = {
            players: [],
            playerSockets: [],
            currentPoemIndices: [],
            poems: [],
            poemLength: numberOfRounds,
            displaySingle: DISPLAY_SINGLE,
            running: false,
            admin: playerName
        };

        // big time duplication -- socket.on('joinGame')
        console.log(gameId)
        socket.emit('game-created', { newGameId: gameId })
    })

    // Join a game room
    socket.on('joinGame', ({ gameId, playerName }) => {
        //if gameId exists
        socket.join(gameId);
        const game = games[gameId];
        if (!game) {
            socket.emit('wrong-game-id')
            return;
        }
        const newPlayerIndex = game.players.length
        game.players.push(playerName);
        game.playerSockets.push(socket.id);
        game.currentPoemIndices.push(newPlayerIndex)
        game.poems.push([])

        // if (game && !game.players.includes(playerName)) {
        //     game.players.push(playerName);
        //     //console.log(socket.id)
        //     game.playerSockets.push(socket.id);
        //     game.currentPoemIndices.push(newPlayerIndex)
        //     game.poems.push([])
        // } else {
        //     console.log("two players with the same name: todo solve")
        // }

        socket.to(gameId).emit('newPlayerJoined', {gameData: game})
        socket.emit('joinedGame', { roomId: gameId, gameData: game }, newPlayerIndex);
    });

    socket.on('start-game', ({ gameId }) => {
        io.to(gameId).emit('game-started')
    })

    // Handle a new line submission
    socket.on('submitLine', ({ gameId, line, playerIndex }) => {
        console.log("tady")
        console.log(games)
        console.log(gameId)
        const game = games[gameId];
        if (!game) return;

        game.poems[game.currentPoemIndices[playerIndex]].push(line);
        let previousPoemIndex = game.currentPoemIndices[playerIndex];
        game.currentPoemIndices[playerIndex] = (game.currentPoemIndices[playerIndex] + 1) % game.players.length;

        if (game.poems.every(poem => poem.length == game.poemLength)) {
            if (game.displaySingle) {
                // random int between 1 and 11
                let randomInt = 1 + Math.floor(Math.random() * 11);
                for (let i = 0; i < game.players.length; i++) {
                    let socketId = game.playerSockets[i];
                    io.to(socketId).emit('displaySingle', game.poems[(i + randomInt) % game.players.length]);
                }
            } else {
                io.to(gameId).emit('displayAll', game.poems);
            }
            // delete game probably
            delete games[gameId];
            return;
        }

        if (game.poems[previousPoemIndex].length >= game.poemLength) {
            // Player submitted all lines
            socket.emit('all-lines-submitted')
        } else {
            // notify the next player that the line is finished in case they're waiting
            let nextPlayerIndex = (playerIndex + game.currentPoemIndices.length - 1) % game.currentPoemIndices.length
            if (((game.currentPoemIndices[playerIndex] - 1 + game.players.length) % game.players.length) == game.currentPoemIndices[nextPlayerIndex]) {
                io.to(game.playerSockets[nextPlayerIndex]).emit('loadNextLine', line)
                io.to(game.playerSockets[nextPlayerIndex]).emit('nextLineDelivered')
            }

            // load the next line
            if (game.currentPoemIndices[(playerIndex + 1) % game.players.length] != game.currentPoemIndices[playerIndex]
                    || game.players.length === 1) {
                // wait for the next player to submit
                displayNextLine(game, playerIndex, socket.id)
            } else {
                socket.emit('waitForNextLine')
            }
        }
        console.log(game)
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

function displayNextLine(game, playerIndex, room) {
    let nextPoemIndex = game.currentPoemIndices[playerIndex]
    io.to(room).emit('loadNextLine', game.poems[nextPoemIndex][game.poems[nextPoemIndex].length - 1])
}

// Start the server
server.listen(port, () => console.log(`Listening on port ${port}`));
