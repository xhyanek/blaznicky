const socket = io();

let gameId = null;
let playerName = prompt("Enter your name:");
let playerIndex = null;

// Create a new game and join it
document.getElementById('create-game-button').addEventListener('click', () => {
    fetch('/createGame')
        .then(response => response.json())
        .then(data => {
            gameId = data.gameId;
            joinGame();
        });
});

// Join an existing game
document.getElementById('join-game-button').addEventListener('click', () => {
    gameId = prompt("Enter Game ID:");
    joinGame();
});

function joinGame() {
    socket.emit('joinGame', { gameId, playerName });
}

socket.on('wrong-game-id', () => {
    alert("The game id is wrong");
});

// Handle joined game event
socket.on('joinedGame', ({ gameId, gameData }, newPlayerIndex) => {
    console.log(`Joined game ${gameId}`);
    // Initialize game data, UI, etc.
    document.getElementById('create-game-container').style.display = "none"
    document.getElementById('game-container').style.display = "block"
    document.getElementById('game-id-container').innerHTML = `Game ID: ${gameId}`
    refreshPlayerList(gameData)
    playerIndex = newPlayerIndex
});

socket.on('newPlayerJoined', ({ gameData }) => {
    refreshPlayerList(gameData)
})

function refreshPlayerList(gameData) {
    document.getElementById('player-list-container').innerHTML = `Připojení šašci: ${gameData.players}`
}

// Handle line submission
document.getElementById('submit-button').addEventListener('click', () => {
    const inputLine = document.getElementById('input-line').value.trim();
    if (inputLine === "") return;

    socket.emit('submitLine', { gameId, line: inputLine, playerIndex });
    document.getElementById('input-line').value = '';
});

// Update UI when the last lines of poems are updated
socket.on('loadNextLine', (nextLine) => {
    document.getElementById('poem-container').innerHTML = nextLine;
});

socket.on('waitForNextLine', () => {
    document.getElementById('poem-container').innerHTML = "Komediant po tvé pravici ještě nedopsal svůj verš"
    disableInput();
});

socket.on('nextLineDelivered', () => {
    enableInput();
});

socket.on('all-lines-submitted', () => {
    document.getElementById('poem-container').innerHTML = "😎";
    disableInput();
});

function disableInput() {
    toggleInput(true);
}

function enableInput() {
    toggleInput(false);
}

function toggleInput(disabled) {
    document.getElementById('input-line').disabled = disabled;
    document.getElementById('submit-button').disabled = disabled;
}

// Display the final poems when the game is finished
socket.on('gameFinished', (finalPoems) => {
    const finalPoemsHTML = finalPoems.map(poem => poem.join('<br>')).join('<br><br>');
    document.getElementById('poem-container').innerHTML = finalPoemsHTML;
    disableInput()
});
