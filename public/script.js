const socket = io();

let gameId = null;
let playerName = prompt("Enter your name:");
let playerIndex = null;
let roundCount = null;
let linesSubmitted = 0;

const honk = new Audio("/sounds/clown-horn-44595.mp3");
const spring = new Audio("/sounds/funny-spring-jump-140378.mp3");
honk.volume = 0.1
spring.volume = 0.1

document.getElementById('swap-themes-button').addEventListener('click', () => {
    honk.currentTime = 1
    honk.play()

    document.body.classList.toggle('dark')
})

// Create a new game and join it
document.getElementById('create-game-button').addEventListener('click', () => {
    let numberOfRounds = parseInt(prompt("number of rounds"), 10);
    if (isNaN(numberOfRounds)) {
        alert("Number of rounds must be a number");
        return;
    }
    socket.emit('create-game', { numberOfRounds, playerName })
    /* fetch('/createGame')
        .then(response => response.json())
        .then(data => {
            gameId = data.gameId;
            joinGame();
        }); */
});

socket.on('game-created', ({newGameId}) => {
    console.log(newGameId)
    gameId = newGameId
    joinGame()
})

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

socket.on('already-running', () => {
    alert("The game is already running :(");
});

// Handle joined game event
socket.on('joinedGame', ({ roomId, gameData }, newPlayerIndex) => {
    console.log(`Joined game ${gameId}`);
    console.log(roomId)
    console.log(gameId)
    gameId = roomId;
    // Initialize game data, UI, etc.
    if (Math.random() < 0.02) {
        document.getElementById('waiting-image').src = "images/toon.gif"
        document.getElementById('waiting-image').style.maxWidth = '50%'
    }
    roundCount = gameData.poemLength
    document.getElementById('round-counter').innerHTML = `0/${roundCount}`;
    document.getElementById('create-game-container').style.display = "none"
    document.getElementById('game-container').style.display = "block"
    document.getElementById('game-id-container').innerHTML = `Game ID: ${gameId}`
    refreshPlayerList(gameData)
    playerIndex = newPlayerIndex
    if (gameData.admin === playerName) {
        document.getElementById('start-game-button').style.display = "block"
    }
});

socket.on('newPlayerJoined', ({ gameData }) => {
    refreshPlayerList(gameData)
})

function refreshPlayerList(gameData) {
    document.getElementById('player-list-container').innerHTML = `Připojení šašci: ${gameData.players}`
}

document.getElementById('start-game-button').addEventListener('click', () => {
    socket.emit('start-game', { gameId })
});

socket.on('game-started', () => {
    document.getElementById('waiting-screen').style.display = "none"
    document.getElementById('game-info-container').style.display = "none"
    document.getElementById('input-container').style.display = "block"
})

// Handle line submission
document.getElementById('submit-button').addEventListener('click', () => {
    // audio
    spring.currentTime = 0
    spring.play()

    // submission logic
    const inputLine = document.getElementById('input-line').value.trim();
    if (inputLine === "") return;

    socket.emit('submitLine', { gameId, line: inputLine, playerIndex });
    document.getElementById('input-line').value = '';
    linesSubmitted++;
    document.getElementById('round-counter').innerHTML = `${linesSubmitted}/${roundCount}`;
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
socket.on('displayAll', (finalPoems) => {
    const finalPoemsHTML = finalPoems.map(poem => poem.join('<br>')).join('<br>----------------------------------------<br>');
    document.getElementById('final-poem-container').innerHTML = finalPoemsHTML;
    disableInput()
    displayEndScreen()
});

socket.on('displaySingle', (poem) => {
    document.getElementById('final-poem-container').innerHTML = poem.join('<br>');
    disableInput()
    displayEndScreen()
});

function displayEndScreen() {
    document.getElementById('game-container').style.display = "none";
    document.getElementById('end-game-container').style.display = "block";
}

document.getElementById('download-poems-button').addEventListener('click', () => {
    download("poems.txt", document.getElementById('final-poem-container').innerHTML.replaceAll("<br>", "\n"))
})

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}

// todo player disconnecting
// todo poem display