import { Chess } from "/chess.js";
import { Chessground } from "/chessground.js";

const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const movesList = document.getElementById("moves");
const moveMessages = document.getElementById("moveMessages");
const voiceButton = document.getElementById('voiceButton');

// Timer elements
const timerWhite = document.getElementById('timer-white');
const timerBlack = document.getElementById('timer-black');
const timeDisplayWhite = timerWhite.querySelector('.time-display');
const timeDisplayBlack = timerBlack.querySelector('.time-display');

// Timer variables
let whiteTime = 600;
let blackTime = 600;
let selectedTime = 600;
let timerInterval = null;
let isTimerActive = false;

// Initialize Chess.js
const game = new Chess();

// Initialize Chessground
const cg = Chessground(boardElement, {
    draggable: { enabled: true },
    movable: {
        color: "white",
        free: false,
        dests: getValidMoves(),
        events: {
            after: (orig, dest) => handleMove(orig, dest)
        }
    },
    highlight: { lastMove: true, check: true }
});

const voiceCommands = {
    'a1': 'a1', 'a2': 'a2', 'a3': 'a3', 'a4': 'a4', 'a5': 'a5', 'a6': 'a6', 'a7': 'a7', 'a8': 'a8',
    'b1': 'b1', 'b2': 'b2', 'b3': 'b3', 'b4': 'b4', 'b5': 'b5', 'b6': 'b6', 'b7': 'b7', 'b8': 'b8',
    'c1': 'c1', 'c2': 'c2', 'c3': 'c3', 'c4': 'c4', 'c5': 'c5', 'c6': 'c6', 'c7': 'c7', 'c8': 'c8',
    'd1': 'd1', 'd2': 'd2', 'd3': 'd3', 'd4': 'd4', 'd5': 'd5', 'd6': 'd6', 'd7': 'd7', 'd8': 'd8',
    'e1': 'e1', 'e2': 'e2', 'e3': 'e3', 'e4': 'e4', 'e5': 'e5', 'e6': 'e6', 'e7': 'e7', 'e8': 'e8',
    'f1': 'f1', 'f2': 'f2', 'f3': 'f3', 'f4': 'f4', 'f5': 'f5', 'f6': 'f6', 'f7': 'f7', 'f8': 'f8',
    'g1': 'g1', 'g2': 'g2', 'g3': 'g3', 'g4': 'g4', 'g5': 'g5', 'g6': 'g6', 'g7': 'g7', 'g8': 'g8',
    'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'h4': 'h4', 'h5': 'h5', 'h6': 'h6', 'h7': 'h7', 'h8': 'h8',
    'rook': 'r', 'knight': 'n', 'bishop': 'b', 'queen': 'q', 'king': 'k', 'pawn': 'p',
    'torre': 'r', 'caballo': 'n', 'alfil': 'b', 'reina': 'q', 'dama': 'q', 'rey': 'k', 'peón': 'p', 'peon': 'p',
    'move': 'move', 'to': 'to', 'takes': 'takes', 'capture': 'takes',
    'castle kingside': 'O-O', 'castle queenside': 'O-O-O',
    'check': '+', 'checkmate': '#', 'undo': 'undo', 'read': 'read',
    'resign': 'resignation', 'draw': 'draw',
    'mover': 'move', 'mueve': 'move', 'a': 'to', 'come': 'takes', 'captura': 'takes',
    'enroque corto': 'O-O', 'enroque largo': 'O-O-O',
    'jaque': '+', 'jaque mate': '#', 'deshacer': 'undo', 'leer': 'read',
    'rendirse': 'resignation', 'tablas': 'draw', 'empate': 'draw'
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;
let currentLanguage = 'en-US';

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = currentLanguage;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const languageSelector = document.createElement('select');
    languageSelector.id = 'languageSelector';
    languageSelector.innerHTML = `
        <option value="en-US">English</option>
        <option value="es-ES">Español</option>
    `;
    languageSelector.style.cssText = 'margin: 10px; padding: 5px; font-size: 14px;';
    languageSelector.addEventListener('change', (e) => {
        currentLanguage = e.target.value;
        recognition.lang = currentLanguage;
        const langName = currentLanguage === 'en-US' ? 'English' : 'Español';
        moveMessages.innerHTML += `<p style="color: blue;">Language changed to ${langName}</p>`;
    });
    voiceButton.parentNode.insertBefore(languageSelector, voiceButton);

    voiceButton.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
            isListening = false;
            voiceButton.textContent = currentLanguage === 'en-US' ? 'Speak' : 'Hablar';
        } else {
            recognition.start();
            isListening = true;
            voiceButton.textContent = currentLanguage === 'en-US' ? 'Listening...' : 'Escuchando...';
        }
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('[DEBUG] Recognized text:', transcript);
        voiceButton.textContent = currentLanguage === 'en-US' ? 'Speak' : 'Hablar';
        isListening = false;
        processVoiceCommand(transcript);
    };

    recognition.onerror = (event) => {
        console.error('[ERROR] Voice recognition error:', event.error);
        voiceButton.textContent = currentLanguage === 'en-US' ? 'Speak' : 'Hablar';
        isListening = false;
        const errorMsg = currentLanguage === 'en-US' ? 
            `Voice recognition error: ${event.error}` : 
            `Error de reconocimiento de voz: ${event.error}`;
        moveMessages.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
    };

    recognition.onend = () => {
        if (isListening) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('[ERROR] Error restarting recognition:', error);
                    isListening = false;
                    voiceButton.textContent = currentLanguage === 'en-US' ? 'Speak' : 'Hablar';
                }
            }, 500);
        } else {
            voiceButton.textContent = currentLanguage === 'en-US' ? 'Speak' : 'Hablar';
        }
    };
} else {
    voiceButton.disabled = true;
    voiceButton.textContent = 'Voice not supported / Voz no soportada';
}

// Timer functions
function formatTime(seconds) {
    if (seconds === 0 && selectedTime === 0) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    timeDisplayWhite.textContent = formatTime(whiteTime);
    timeDisplayBlack.textContent = formatTime(blackTime);
    
    // Remove all warning/danger classes first
    timerWhite.classList.remove('timer-warning', 'timer-danger');
    timerBlack.classList.remove('timer-warning', 'timer-danger');
    
    // Add warning/danger classes based on time
    if (selectedTime > 0) {
        if (whiteTime <= 10 && whiteTime > 0) {
            timerWhite.classList.add('timer-danger');
        } else if (whiteTime <= 30) {
            timerWhite.classList.add('timer-warning');
        }
        
        if (blackTime <= 10 && blackTime > 0) {
            timerBlack.classList.add('timer-danger');
        } else if (blackTime <= 30) {
            timerBlack.classList.add('timer-warning');
        }
    }
}

function startTimer() {
    if (selectedTime === 0) return; // No timer for unlimited games
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    isTimerActive = true;
    timerInterval = setInterval(() => {
        if (game.turn() === 'w') {
            whiteTime--;
            if (whiteTime <= 0) {
                whiteTime = 0;
                stopTimer();
                endGameByTimeout('white');
            }
        } else {
            blackTime--;
            if (blackTime <= 0) {
                blackTime = 0;
                stopTimer();
                endGameByTimeout('black');
            }
        }
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerActive = false;
}

function switchTimerActive() {
    timerWhite.classList.remove('timer-active');
    timerBlack.classList.remove('timer-active');
    
    if (game.turn() === 'w') {
        timerWhite.classList.add('timer-active');
    } else {
        timerBlack.classList.add('timer-active');
    }
}

function endGameByTimeout(loser) {
    const winner = loser === 'white' ? 'Black' : 'White';
    const msg = currentLanguage === 'en-US' ? 
        `Time's up! ${winner} wins! 🏆` :
        `¡Se acabó el tiempo! ¡${winner === 'White' ? 'Blancas' : 'Negras'} ganan! 🏆`;
    statusElement.innerText = msg;
    
    const timeoutMsg = currentLanguage === 'en-US' ? 
        `${loser === 'white' ? 'White' : 'Black'} ran out of time` :
        `${loser === 'white' ? 'Blancas' : 'Negras'} se quedó sin tiempo`;
    announceState({ color: loser === 'white' ? 'w' : 'b', san: timeoutMsg });
    
    cg.set({ movable: { color: null, dests: new Map() } });
}

function getValidMoves() {
    const dests = new Map();
    game.board().forEach((row, y) => {
        row.forEach((piece, x) => {
            if (piece && piece.color === game.turn()) {
                const square = String.fromCharCode(97 + x) + (8 - y);
                const moves = game.moves({ square, verbose: true });
                if (moves.length) {
                    dests.set(square, moves.map(m => m.to));
                }
            }
        });
    });
    return dests;
}

function handleMove(orig, dest) {
    const move = game.move({ from: orig, to: dest, promotion: "q" });

    if (move) {
        cg.set({
            fen: game.fen(),
            turnColor: game.turn() === "w" ? "white" : "black",
            movable: {
                color: game.turn() === "w" ? "white" : "black",
                dests: getValidMoves()
            }
        });

        switchTimerActive();
        updateStatus();
        updateMoveList();
        updateMoveMessages(move);
        announceMove(move);
        
        // Start timer on first move
        if (!isTimerActive && selectedTime > 0) {
            startTimer();
        }
        
        console.log("[DEBUG] New FEN:", game.fen());
    } else {
        cg.set({ fen: game.fen() });
    }
}

function announceMove(move) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = currentLanguage;
    
    const player = currentLanguage === 'en-US' ? 
        (move.color === "w" ? "Player 1" : "Player 2") :
        (move.color === "w" ? "Jugador 1" : "Jugador 2");
    const madeMove = currentLanguage === 'en-US' ? "made the move" : "hizo el movimiento";
    
    utterance.text = `${player} ${madeMove} ${move.san}`;
    utterance.pitch = 1.2;
    utterance.volume = 1.0;
    utterance.rate = 0.9;
    
    let voices = synth.getVoices();
    if (voices.length === 0) {
        synth.onvoiceschanged = function() {
            voices = synth.getVoices();
            setVoiceAndSpeak();
        };
    } else {
        setVoiceAndSpeak();
    }
    
    function setVoiceAndSpeak() {
        const languageCode = currentLanguage.split('-')[0];
        const languageVoices = voices.filter(voice => voice.lang.includes(languageCode));
        const preferredVoice = languageVoices.find(voice => voice.name.includes('Google')) || 
                              languageVoices[0] || 
                              voices[0];
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        synth.cancel();
        synth.speak(utterance);
    }
}

function announceState(move) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = currentLanguage;
    
    const player = currentLanguage === 'en-US' ? 
        (move.color === "w" ? "Player 1" : "Player 2") :
        (move.color === "w" ? "Jugador 1" : "Jugador 2");
    
    utterance.text = `${player} ${move.san}`;
    utterance.pitch = 1.2;
    utterance.volume = 1.0;
    utterance.rate = 0.9;
    
    let voices = synth.getVoices();
    if (voices.length === 0) {
        synth.onvoiceschanged = function() {
            voices = synth.getVoices();
            setVoiceAndSpeak();
        };
    } else {
        setVoiceAndSpeak();
    }
    
    function setVoiceAndSpeak() {
        const languageCode = currentLanguage.split('-')[0];
        const languageVoices = voices.filter(voice => voice.lang.includes(languageCode));
        const preferredVoice = languageVoices.find(voice => voice.name.includes('Google')) || 
                              languageVoices[0] || 
                              voices[0];
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        synth.cancel();
        synth.speak(utterance);
    }
}

function updateStatus() {
    if (game.isCheckmate()) {
        stopTimer();
        const msg = currentLanguage === 'en-US' ? 
            `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins 🎉` :
            `¡Jaque mate! ${game.turn() === "w" ? "Negras" : "Blancas"} ganan 🎉`;
        statusElement.innerText = msg;
        setTimeout(() => {
            const announceMsg = currentLanguage === 'en-US' ? "made Checkmate" : "hizo Jaque mate";
            announceState({ color: game.turn() === "w" ? "b" : "w", san: announceMsg });
        }, 1000);
        
    } else if (game.isCheck()) {
        const msg = currentLanguage === 'en-US' ? 
            `Check! ${game.turn() === "w" ? "White's" : "Black's"} turn` :
            `¡Jaque! Turno de ${game.turn() === "w" ? "Blancas" : "Negras"}`;
        statusElement.innerText = msg;
        setTimeout(() => {
            const announceMsg = currentLanguage === 'en-US' ? "made Check" : "hizo Jaque";
            announceState({ color: game.turn() === "w" ? "b" : "w", san: announceMsg });
        }, 1000);
        
    } else if (game.isDraw()) {
        stopTimer();
        const msg = currentLanguage === 'en-US' ? 
            "Draw! The game has ended 🤝" :
            "¡Tablas! El juego ha terminado 🤝";
        statusElement.innerText = msg;
    } else {
        const msg = currentLanguage === 'en-US' ? 
            `${game.turn() === "w" ? "White's" : "Black's"} turn` :
            `Turno de ${game.turn() === "w" ? "Blancas" : "Negras"}`;
        statusElement.innerText = msg;
    }
}

function updateMoveList() {
    movesList.innerHTML = "";
    const history = game.history({ verbose: true });
    let currentMove = "";
    
    history.forEach((move, index) => {
        if (index % 2 === 0) {
            currentMove = `${Math.floor(index / 2) + 1}. ${move.san}`;
        } else {
            currentMove += ` ${move.san}`;
            const li = document.createElement("li");
            li.innerText = currentMove;
            movesList.appendChild(li);
        }
    });

    if (history.length % 2 === 1) {
        const li = document.createElement("li");
        li.innerText = currentMove;
        movesList.appendChild(li);
    }
}

function updateMoveMessages(move) {
    const player = currentLanguage === 'en-US' ?
        (move.color === "w" ? "Player 1" : "Player 2") :
        (move.color === "w" ? "Jugador 1" : "Jugador 2");
    const madeMove = currentLanguage === 'en-US' ? "made the move" : "hizo el movimiento";
    const message = `${player} ${madeMove} ${move.san}`;
    
    const p = document.createElement("p");
    p.innerText = message;
    moveMessages.appendChild(p);
}

function processVoiceCommand(command) {
    console.log("[DEBUG] Command received:", command);
    const commandLabel = currentLanguage === 'en-US' ? "Command" : "Comando";
    moveMessages.innerHTML += `<p>${commandLabel}: ${command}</p>`;

    const lowerCommand = command.toLowerCase();
    const parts = lowerCommand.split(' ');
    const normalizedParts = parts.map(part => voiceCommands[part] || part);
    const normalized = normalizedParts.join(' ');
    console.log("[DEBUG] Normalized command:", normalized);

    try {
        if (normalized.includes('move') || normalized.includes('to')) {
            let piece = null;
            let to = null;

            for (let i = 1; i < parts.length; i++) {
                if (voiceCommands[parts[i]] && ['r', 'n', 'b', 'q', 'k', 'p'].includes(voiceCommands[parts[i]])) {
                    piece = voiceCommands[parts[i]];
                    break;
                }
            }

            for (let i = parts.length - 1; i >= 0; i--) {
                if (/^[a-h][1-8]$/.test(parts[i])) {
                    to = parts[i];
                    break;
                }
                if (i > 0 && /^[a-h]$/.test(parts[i-1]) && /^[1-8]$/.test(parts[i])) {
                    to = parts[i-1] + parts[i];
                    break;
                }
            }

            if (!piece || !to) {
                const errorMsg = currentLanguage === 'en-US' ? 
                    "Could not identify piece or destination" :
                    "No se pudo identificar la pieza o el destino";
                throw new Error(errorMsg);
            }

            const moves = game.moves({ verbose: true });
            const validMove = moves.find(m => m.piece === piece && m.to === to);

            if (validMove) {
                handleMove(validMove.from, validMove.to);
            } else {
                const errorMsg = currentLanguage === 'en-US' ? 
                    `Invalid move for ${piece} to ${to}` :
                    `Movimiento inválido para ${piece} a ${to}`;
                throw new Error(errorMsg);
            }
        }
        else if (normalized.includes('o-o')) {
            const move = normalized.includes('o-o-o') ? 'O-O-O' : 'O-O';
            const result = game.move(move);
            if (result) {
                cg.set({
                    fen: game.fen(),
                    turnColor: game.turn() === "w" ? "white" : "black",
                    movable: {
                        color: game.turn() === "w" ? "white" : "black",
                        dests: getValidMoves()
                    }
                });
                switchTimerActive();
                updateStatus();
                updateMoveList();
                updateMoveMessages(result);
                const castleMsg = currentLanguage === 'en-US' ?
                    `Castle ${move === 'O-O' ? 'kingside' : 'queenside'}` :
                    `Enroque ${move === 'O-O' ? 'corto' : 'largo'}`;
                announceMove({ color: result.color, san: castleMsg });
                
                if (!isTimerActive && selectedTime > 0) {
                    startTimer();
                }
            } else {
                const errorMsg = currentLanguage === 'en-US' ? 
                    "Castling not allowed" :
                    "Enroque no permitido";
                throw new Error(errorMsg);
            }
        }
        else if (normalized.includes('resignation')) {    
            surrenderConfirm.style.display = "flex";
            const resignMsg = currentLanguage === 'en-US' ? 
                "Are you sure you want to resign?" :
                "¿Estás seguro de que quieres rendirte?";
            announceState({ color: game.turn(), san: resignMsg });
        }
        else if (normalized.includes('draw')) {    
            if (!drawOfferedBy) {
                drawOfferedBy = game.turn();
                drawConfirm.style.display = "flex";
            }
            const drawMsg = currentLanguage === 'en-US' ? 
                "has proposed a draw" :
                "ha propuesto tablas";
            announceState({ color: game.turn(), san: drawMsg });
        } 
        else if (normalized.includes('undo')) {
            const undone = game.undo();
            if (undone) {
                cg.set({
                    fen: game.fen(),
                    turnColor: game.turn() === "w" ? "white" : "black",
                    movable: {
                        color: game.turn() === "w" ? "white" : "black",
                        dests: getValidMoves()
                    }
                });
                switchTimerActive();
                const undoMsg = currentLanguage === 'en-US' ? 
                    `Move undone: ${undone.san}` :
                    `Movimiento deshecho: ${undone.san}`;
                announceState({ color: undone.color, san: undoMsg });
            } else {
                const errorMsg = currentLanguage === 'en-US' ? 
                    "No moves to undo" :
                    "No hay movimientos para deshacer";
                throw new Error(errorMsg);
            }
        }
        else if (normalized.includes('read')) {
            const history = game.history();
            const movesText = history.length ? history.join(', ') : (currentLanguage === 'en-US' ? 'No moves' : 'Sin movimientos');
            const readMsg = currentLanguage === 'en-US' ? 
                `these are the moves made: ${movesText}` :
                `estos son los movimientos realizados: ${movesText}`;
            announceState({ color: game.turn(), san: readMsg });
        }
        else {
            const errorMsg = currentLanguage === 'en-US' ? 
                "Command not recognized" :
                "Comando no reconocido";
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error("[ERROR] Error in command:", error.message);
        const errorLabel = currentLanguage === 'en-US' ? "Error" : "Error";
        moveMessages.innerHTML += `<p style="color: red;">${errorLabel}: ${error.message}</p>`;
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'v' || event.key === 'V') {
        if (isListening) {
            recognition.stop();
            isListening = false;
            voiceButton.textContent = currentLanguage === 'en-US' ? 'Speak' : 'Hablar';
        } else {
            recognition.start();
            isListening = true;
            voiceButton.textContent = currentLanguage === 'en-US' ? 'Listening...' : 'Escuchando...';
        }
    }
});

// Start screen logic
document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("startButton");
    const startScreen = document.getElementById("start-screen");
    const container = document.getElementById("container");
    const timeOptions = document.querySelectorAll('.time-option');
    
    // Time selection
    timeOptions.forEach(option => {
        option.addEventListener('click', () => {
            timeOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedTime = parseInt(option.dataset.time);
            whiteTime = selectedTime;
            blackTime = selectedTime;
        });
    });
    
    // Default selection (10 minutes)
    timeOptions[1].classList.add('selected');
  
    startButton.addEventListener('click', () => {
        startScreen.style.display = "none";
        container.style.display = "flex";
        
        resetGame();
        updateTimerDisplay();
        switchTimerActive();
        
        const turnMsg = currentLanguage === 'en-US' ? "White's turn" : "Turno de Blancas";
        statusElement.textContent = turnMsg;
        voiceButton.disabled = false;
    });

    // Tutorial functionality
    const tutorialButton = document.getElementById("tutorialButton");
    const tutorialScreen = document.getElementById("tutorial-screen");
    const closeTutorial = document.getElementById("closeTutorial");
    const startFromTutorial = document.getElementById("startFromTutorial");
    const prevPage = document.getElementById("prevPage");
    const nextPage = document.getElementById("nextPage");
    const tutorialPage = document.getElementById("tutorialPage");
    
    let currentPage = 1;
    const totalPages = 5;
    let tutorialSpeechSynth = window.speechSynthesis;

    // Tutorial page texts for voice reading
    const tutorialTexts = {
        1: "Welcome to Phantom Moves! This is a revolutionary chess game where you can play using voice commands. No need to touch the board, just speak your moves and watch them happen. You can use voice control with your microphone to give chess commands in English or Spanish. Choose from timed games of 5, 10, or 15 minutes, or play without time limits. Switch between English and Spanish at any time during the game.",
        2: "Basic Voice Commands. To make a move, use this format: Move, piece name, to, square coordinate. For example: Move knight to e4. The chess pieces you can say are: Pawn in English, or peón in Spanish. Rook in English, or torre in Spanish. Knight in English, or caballo in Spanish. Bishop in English, or alfil in Spanish. Queen in English, or reina or dama in Spanish. And King in English, or rey in Spanish.",
        3: "Advanced Commands. For castling, you can say: Castle kingside, or O O. In Spanish: enroque corto. For queenside castling, say: Castle queenside, or O O O. In Spanish: enroque largo. To read all moves made so far, say: Read. In Spanish: leer. To undo the last move, say: Undo. In Spanish: deshacer. To offer a draw, say: Draw. In Spanish: tablas or empate. And to resign, say: Resign. In Spanish: rendirse.",
        4: "How to Play. Step 1: Select your time control. Choose your preferred game duration: 5, 10, or 15 minutes per player, or unlimited time. Step 2: Start the game. Click Start Game to begin. White moves first. Step 3: Activate voice recognition. Click the Speak button or press the V key to start listening. Step 4: Speak your move. Say your command clearly, for example: Move pawn to e4. Step 5: Alternate turns. Players take turns speaking their moves. The timer switches automatically. Pro tip: You can also drag pieces with your mouse if you prefer traditional play.",
        5: "Tips and Tricks. For voice recognition: Speak clearly and at a moderate pace. Use a quiet environment for best results. Wait for the Listening indicator before speaking. Press V key for quick voice activation. For timer management: The timer turns orange when you have 30 seconds left. The timer turns red and pulses when you have 10 seconds left. Make your moves quickly when time is running low. For language switching: Use the language selector to switch between English and Spanish. All voice commands and announcements will update automatically. You can change language at any time during the game. For move validation: Only legal moves will be executed. If a move is invalid, you will see an error message. The game detects check, checkmate, and stalemate automatically. You are now ready to play! Click Start Game to begin your voice-controlled chess adventure."
    };

    function speakTutorialPage(pageNumber) {
        // Cancel any ongoing speech
        tutorialSpeechSynth.cancel();
        
        // Create utterance for the current page
        const utterance = new SpeechSynthesisUtterance(tutorialTexts[pageNumber]);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Get voices and set preferred voice
        let voices = tutorialSpeechSynth.getVoices();
        if (voices.length === 0) {
            tutorialSpeechSynth.onvoiceschanged = function() {
                voices = tutorialSpeechSynth.getVoices();
                setVoiceAndSpeak();
            };
        } else {
            setVoiceAndSpeak();
        }
        
        function setVoiceAndSpeak() {
            const englishVoices = voices.filter(voice => voice.lang.includes('en'));
            const preferredVoice = englishVoices.find(voice => voice.name.includes('Google')) || 
                                  englishVoices[0] || 
                                  voices[0];
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            
            tutorialSpeechSynth.speak(utterance);
        }
    }

    function updateTutorialPage() {
        // Hide all pages
        document.querySelectorAll('.tutorial-page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show current page
        const currentPageElement = document.querySelector(`[data-page="${currentPage}"]`);
        currentPageElement.classList.add('active');
        
        // Scroll to top of tutorial content
        document.querySelector('.tutorial-content').scrollTop = 0;
        
        // Update page indicator
        tutorialPage.textContent = `Page ${currentPage} of ${totalPages}`;
        
        // Update button states
        prevPage.disabled = currentPage === 1;
        nextPage.disabled = currentPage === totalPages;
        
        // Read the page content with voice
        speakTutorialPage(currentPage);
    }

    tutorialButton.addEventListener('click', () => {
        startScreen.style.display = "none";
        tutorialScreen.style.display = "block";
        currentPage = 1;
        updateTutorialPage();
    });

    closeTutorial.addEventListener('click', () => {
        tutorialSpeechSynth.cancel(); // Stop any ongoing speech
        tutorialScreen.style.display = "none";
        startScreen.style.display = "flex";
    });

    startFromTutorial.addEventListener('click', () => {
        tutorialSpeechSynth.cancel(); // Stop any ongoing speech
        tutorialScreen.style.display = "none";
        container.style.display = "flex";
        
        resetGame();
        updateTimerDisplay();
        switchTimerActive();
        
        const turnMsg = currentLanguage === 'en-US' ? "White's turn" : "Turno de Blancas";
        statusElement.textContent = turnMsg;
        voiceButton.disabled = false;
    });

    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateTutorialPage();
        }
    });

    nextPage.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            updateTutorialPage();
        }
    });
});

const startScreen = document.getElementById("start-screen");
const container = document.getElementById("container");

// Resign button
const surrenderButton = document.getElementById("surrenderButton");
const surrenderConfirm = document.getElementById("surrenderConfirm");
const confirmSurrender = document.getElementById("confirmSurrender");
const cancelSurrender = document.getElementById("cancelSurrender");

surrenderButton.addEventListener("click", () => {
    surrenderConfirm.style.display = "flex";
    const resignMsg = currentLanguage === 'en-US' ? 
        "Are you sure you want to resign?" :
        "¿Estás seguro de que quieres rendirte?";
    announceState({ color: game.turn(), san: resignMsg });
});

confirmSurrender.addEventListener("click", () => {
    surrenderConfirm.style.display = "none";
    stopTimer();
    const resignedMsg = currentLanguage === 'en-US' ? "resigned" : "se rindió";
    announceState({ color: game.turn(), san: resignedMsg });
    const statusMsg = currentLanguage === 'en-US' ? 
        "The player has resigned 🏳️" :
        "El jugador se ha rendido 🏳️";
    statusElement.innerText = statusMsg;
    cg.set({ movable: { color: null, dests: new Map() } });
});

cancelSurrender.addEventListener("click", () => {
    surrenderConfirm.style.display = "none";
});

// Exit button
const exitButton = document.getElementById("exitButton");
const exitConfirm = document.getElementById("exitConfirm");
const confirmExit = document.getElementById("confirmExit");
const cancelExit = document.getElementById("cancelExit");

exitButton.addEventListener("click", () => {
    exitConfirm.style.display = "flex";
});

confirmExit.addEventListener("click", () => {
    exitConfirm.style.display = "none";
    stopTimer();
    container.style.display = "none";
    startScreen.style.display = "flex";
    cg.set({ movable: { color: null, dests: new Map() } });
});

cancelExit.addEventListener("click", () => {
    exitConfirm.style.display = "none";
});

// Draw button
const drawButton = document.getElementById("drawButton");
const drawConfirm = document.getElementById("drawConfirm");
const acceptDraw = document.getElementById("acceptDraw");
const rejectDraw = document.getElementById("rejectDraw");

let drawOfferedBy = null;

drawButton.addEventListener("click", () => {
    if (!drawOfferedBy) {
        drawOfferedBy = game.turn();
        drawConfirm.style.display = "flex";
    }
    const drawMsg = currentLanguage === 'en-US' ? 
        "has proposed a draw" :
        "ha propuesto tablas";
    announceState({ color: game.turn(), san: drawMsg });
    const statusMsg = currentLanguage === 'en-US' ?
        "The player has requested a draw. Please confirm or cancel" :
        "El jugador ha solicitado tablas. Por favor confirma o cancela";
    statusElement.innerText = statusMsg;
});

acceptDraw.addEventListener("click", () => {
    drawConfirm.style.display = "none";
    stopTimer();
    const drawAgreedMsg = currentLanguage === 'en-US' ? 
        "Draw agreed! 🤝" :
        "¡Tablas acordadas! 🤝";
    statusElement.innerText = drawAgreedMsg;
    const acceptedMsg = currentLanguage === 'en-US' ? 
        "accepted the draw" :
        "aceptó las tablas";
    announceState({ color: game.turn(), san: acceptedMsg });
    drawOfferedBy = null;
    cg.set({ movable: { color: null, dests: new Map() } });
});

rejectDraw.addEventListener("click", () => {
    drawConfirm.style.display = "none";
    drawOfferedBy = null;
    const rejectedMsg = currentLanguage === 'en-US' ? 
        "Draw rejected. Game continues." :
        "Tablas rechazadas. El juego continúa.";
    statusElement.innerText = rejectedMsg;
});

function resetGame() {
    game.reset();
    cg.set({
        fen: game.fen(),
        turnColor: "white",
        movable: {
            color: "white",
            dests: getValidMoves()
        },
        highlight: {
            lastMove: true,
            check: true
        }
    });

    stopTimer();
    whiteTime = selectedTime;
    blackTime = selectedTime;
    updateTimerDisplay();
    switchTimerActive();
    
    const turnMsg = currentLanguage === 'en-US' ? "White's turn" : "Turno de Blancas";
    statusElement.innerText = turnMsg;
    movesList.innerHTML = "";
    moveMessages.innerHTML = "";
    drawOfferedBy = null;
}

console.log("[DEBUG] Chess game started:", game.fen());