import { Chess } from "/chess.js";
import { Chessground } from "/chessground.js";

const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const movesList = document.getElementById("moves");
const moveMessages = document.getElementById("moveMessages");
const voiceButton = document.getElementById('voiceButton');

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
    // Squares
    'a1': 'a1', 'a2': 'a2', 'a3': 'a3', 'a4': 'a4', 'a5': 'a5', 'a6': 'a6', 'a7': 'a7', 'a8': 'a8',
    'b1': 'b1', 'b2': 'b2', 'b3': 'b3', 'b4': 'b4', 'b5': 'b5', 'b6': 'b6', 'b7': 'b7', 'b8': 'b8',
    'c1': 'c1', 'c2': 'c2', 'c3': 'c3', 'c4': 'c4', 'c5': 'c5', 'c6': 'c6', 'c7': 'c7', 'c8': 'c8',
    'd1': 'd1', 'd2': 'd2', 'd3': 'd3', 'd4': 'd4', 'd5': 'd5', 'd6': 'd6', 'd7': 'd7', 'd8': 'd8',
    'e1': 'e1', 'e2': 'e2', 'e3': 'e3', 'e4': 'e4', 'e5': 'e5', 'e6': 'e6', 'e7': 'e7', 'e8': 'e8',
    'f1': 'f1', 'f2': 'f2', 'f3': 'f3', 'f4': 'f4', 'f5': 'f5', 'f6': 'f6', 'f7': 'f7', 'f8': 'f8',
    'g1': 'g1', 'g2': 'g2', 'g3': 'g3', 'g4': 'g4', 'g5': 'g5', 'g6': 'g6', 'g7': 'g7', 'g8': 'g8',
    'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'h4': 'h4', 'h5': 'h5', 'h6': 'h6', 'h7': 'h7', 'h8': 'h8',
    
    // Pieces - English
    'rook': 'r', 'knight': 'n', 'bishop': 'b', 'queen': 'q', 'king': 'k', 'pawn': 'p',
    
    // Pieces - Spanish
    'torre': 'r', 'caballo': 'n', 'alfil': 'b', 'reina': 'q', 'dama': 'q', 'rey': 'k', 'peón': 'p', 'peon': 'p',
    
    // Commands - English
    'move': 'move', 'to': 'to', 'takes': 'takes', 'capture': 'takes',
    'castle kingside': 'O-O', 'castle queenside': 'O-O-O',
    'check': '+', 'checkmate': '#', 'undo': 'undo', 'read': 'read',
    'resign': 'resignation', 'draw': 'draw',
    
    // Commands - Spanish
    'mover': 'move', 'mueve': 'move', 'a': 'to', 'come': 'takes', 'captura': 'takes',
    'enroque corto': 'O-O', 'enroque largo': 'O-O-O',
    'jaque': '+', 'jaque mate': '#', 'deshacer': 'undo', 'leer': 'read',
    'rendirse': 'resignation', 'tablas': 'draw', 'empate': 'draw'
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let isListening = false;
let currentLanguage = 'en-US'; // Default language

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = currentLanguage;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Language selector
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
        announceMove({ color: "w", san: `Error: ${event.error}` });
    };

    recognition.onend = () => {
        if (isListening) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('[ERROR] Error restarting recognition:', error);
                    const errorMsg = currentLanguage === 'en-US' ? 
                        'Error restarting recognition' : 
                        'Error al reiniciar reconocimiento';
                    moveMessages.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
                    announceMove({ color: "w", san: errorMsg });
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
    const notSupported = 'Voice not supported / Voz no soportada';
    voiceButton.textContent = notSupported;
    moveMessages.innerHTML += `<p style="color: red;">Your browser does not support voice recognition / Tu navegador no soporta reconocimiento de voz</p>`;
    announceMove({ color: "w", san: "Browser does not support voice recognition" });
}

// Initialize the voice system when loading the page
function initSpeechSynthesis() {
    const synth = window.speechSynthesis;
    
    // Try to preload voices
    synth.getVoices();
    
    // Register event for when voices are available
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = function() {
            const voices = synth.getVoices();
            console.log(`Voices loaded: ${voices.length} available`);
            
            // Optional: announce that the game is ready
            const welcomeMsg = currentLanguage === 'en-US' ? 
                "ChessTalk is ready. White begins." :
                "ChessTalk está listo. Blancas comienzan.";
            const utterance = new SpeechSynthesisUtterance(welcomeMsg);
            utterance.lang = currentLanguage;
            
            const englishVoices = voices.filter(voice => voice.lang.includes('en'));
            if (englishVoices.length > 0) {
                utterance.voice = englishVoices[0];
            }
            synth.speak(utterance);
        };
    }
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

        updateStatus();
        updateMoveList();
        updateMoveMessages(move);
        announceMove(move);
        console.log("[DEBUG] New FEN:", game.fen());
    } else {
        cg.set({ fen: game.fen() });
    }
}

// Function to announce moves by voice
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
    
    // Get voices and configure after they are available
    let voices = synth.getVoices();
    if (voices.length === 0) {
        // If voices are not ready, wait for the voiceschanged event
        synth.onvoiceschanged = function() {
            voices = synth.getVoices();
            setVoiceAndSpeak();
        };
    } else {
        setVoiceAndSpeak();
    }
    
    function setVoiceAndSpeak() {
        // Filter voices for current language
        const languageCode = currentLanguage.split('-')[0]; // 'en' or 'es'
        const languageVoices = voices.filter(voice => voice.lang.includes(languageCode));
        
        // Try to find Google voices first, then any language-appropriate voice
        const preferredVoice = languageVoices.find(voice => voice.name.includes('Google')) || 
                              languageVoices[0] || 
                              voices[0];
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log(`Using voice: ${preferredVoice.name} (${preferredVoice.lang})`);
        } else {
            console.warn(`No suitable voices found for ${languageCode}`);
        }
        
        synth.cancel();
        synth.speak(utterance);
    }
}

// Function to announce critical states by voice
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
    
    // Get voices and configure after they are available
    let voices = synth.getVoices();
    if (voices.length === 0) {
        // If voices are not ready, wait for the voiceschanged event
        synth.onvoiceschanged = function() {
            voices = synth.getVoices();
            setVoiceAndSpeak();
        };
    } else {
        setVoiceAndSpeak();
    }
    
    function setVoiceAndSpeak() {
        // Filter voices for current language
        const languageCode = currentLanguage.split('-')[0]; // 'en' or 'es'
        const languageVoices = voices.filter(voice => voice.lang.includes(languageCode));
        
        // Try to find Google voices first, then any language-appropriate voice
        const preferredVoice = languageVoices.find(voice => voice.name.includes('Google')) || 
                              languageVoices[0] || 
                              voices[0];
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log(`Using voice: ${preferredVoice.name} (${preferredVoice.lang})`);
        } else {
            console.warn(`No suitable voices found for ${languageCode}`);
        }
        
        synth.cancel();
        synth.speak(utterance);
    }
}

function updateStatus() {
    if (game.isCheckmate()) {
        const msg = currentLanguage === 'en-US' ? 
            `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins 🎉` :
            `¡Jaque mate! ${game.turn() === "w" ? "Negras" : "Blancas"} ganan 🎉`;
        statusElement.innerText = msg;
        setTimeout(() => {
            const announceMsg = currentLanguage === 'en-US' ? "made Checkmate" : "hizo Jaque mate";
            announceState({ color: game.turn() === "w" ? "b" : "w", san: announceMsg });
        }, 5000);
        
    } else if (game.isCheck()) {
        const msg = currentLanguage === 'en-US' ? 
            `Check! ${game.turn() === "w" ? "White's" : "Black's"} turn` :
            `¡Jaque! Turno de ${game.turn() === "w" ? "Blancas" : "Negras"}`;
        statusElement.innerText = msg;
        setTimeout(() => {
            const announceMsg = currentLanguage === 'en-US' ? "made Check" : "hizo Jaque";
            announceState({ color: game.turn() === "w" ? "b" : "w", san: announceMsg });
        }, 5000);
        
    } else if (game.isDraw()) {
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

            console.log("[DEBUG] Detected piece:", piece, "Detected destination:", to);

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
                announceMove(validMove);
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
                updateStatus();
                updateMoveList();
                updateMoveMessages(result);
                const castleMsg = currentLanguage === 'en-US' ?
                    `Castle ${move === 'O-O' ? 'kingside' : 'queenside'}` :
                    `Enroque ${move === 'O-O' ? 'corto' : 'largo'}`;
                announceMove({ color: result.color, san: castleMsg });
            } else {
                const errorMsg = currentLanguage === 'en-US' ? 
                    "Castling not allowed" :
                    "Enroque no permitido";
                throw new Error(errorMsg);
            }
        }
        else if (normalized.includes('resignation')) {    
            
            surrenderConfirm.style.display = "flex";

            updateStatus();
            updateMoveList();
            
            const resignMsg = currentLanguage === 'en-US' ? 
                "Are you sure you want to resign?" :
                "¿Estás seguro de que quieres rendirte?";
            announceState({ color: game.turn(), san: resignMsg });
            const statusMsg = currentLanguage === 'en-US' ?
                "The player has requested to resign. Please confirm or cancel" :
                "El jugador ha solicitado rendirse. Por favor confirma o cancela";
            statusElement.innerText = statusMsg;
        }
        else if (normalized.includes('draw')) {    

            if (!drawOfferedBy) {
                drawOfferedBy = game.turn();
            
                // Simulates that the other player sees the offer
                const currentTurn = game.turn();
            
                if (drawOfferedBy !== currentTurn) {
                  drawConfirm.style.display = "flex";
                } else {
                  // Wait for turn change to show to the other player
                  const waitForTurnChange = setInterval(() => {
                    if (game.turn() !== drawOfferedBy) {
                      clearInterval(waitForTurnChange);
                      drawConfirm.style.display = "flex";
                    }
                  }, 300);
                }
            }

            updateStatus();
            updateMoveList();
            const drawMsg = currentLanguage === 'en-US' ? 
                "has proposed a draw" :
                "ha propuesto tablas";
            announceState({ color: game.turn(), san: drawMsg });
            const statusMsg = currentLanguage === 'en-US' ?
                "The player has requested a draw. Please confirm or cancel" :
                "El jugador ha solicitado tablas. Por favor confirma o cancela";
            statusElement.innerText = statusMsg;
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
            const turno = game.turn() === 'w' ? 'w' : 'b';
            const readMsg = currentLanguage === 'en-US' ? 
                `these are the moves made: ${movesText}` :
                `estos son los movimientos realizados: ${movesText}`;
            announceState({ color: turno, san: readMsg });
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
        announceMove({ color: "w", san: `${errorLabel}: ${error.message}` });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const welcomeMsg = currentLanguage === 'en-US' ? 
        "Welcome to ChessTalk. White begins" :
        "Bienvenido a ChessTalk. Blancas comienzan";
    announceMove({ color: "w", san: welcomeMsg });
    if (SpeechRecognition) {
        voiceButton.style.display = 'block';
    } else {
        moveMessages.innerHTML += `<p style="color: red;">Your browser does not support voice recognition / Tu navegador no soporta reconocimiento de voz</p>`;
        announceMove({ color: "w", san: "Browser does not support voice recognition" });
    }
});

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

console.log("[DEBUG] Chess game started:", game.fen());
initSpeechSynthesis();


document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("startButton");
    const startScreen = document.getElementById("start-screen");
    const container = document.getElementById("container");
    const status = document.getElementById("status");
  
    startButton.addEventListener("click", () => {
      startScreen.style.display = "none";
      container.style.display = "flex";
  
      resetGame();
  
      // Start the game
      const turnMsg = currentLanguage === 'en-US' ? "Your turn" : "Tu turno";
      status.textContent = turnMsg;
      document.getElementById("voiceButton").disabled = false;
  
      // Simulates turn change (simple example)
      setTimeout(() => {
        const opponentMsg = currentLanguage === 'en-US' ? "Opponent's turn" : "Turno del oponente";
        status.textContent = opponentMsg;
      }, 4000);
    });
  });
  
  const startScreen = document.getElementById("start-screen");
  const container = document.getElementById("container");
  
  // Resign button and its modal
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
  const statusMsg = currentLanguage === 'en-US' ?
      "The player has requested to resign. Please confirm or cancel" :
      "El jugador ha solicitado rendirse. Por favor confirma o cancela";
  statusElement.innerText = statusMsg;
});

confirmSurrender.addEventListener("click", () => {
  surrenderConfirm.style.display = "none";
  const resignedMsg = currentLanguage === 'en-US' ? "resigned" : "se rindió";
  announceState({ color: game.turn(), san: resignedMsg });
  const statusMsg = currentLanguage === 'en-US' ? 
      "The player has resigned 🏳️" :
      "El jugador se ha rendido 🏳️";
  statusElement.innerText = statusMsg;
  cg.set({ movable: { color: null, dests: new Map() } }); // Block board
});

cancelSurrender.addEventListener("click", () => {
  surrenderConfirm.style.display = "none";
});

// Exit to main menu button and its modal
const exitButton = document.getElementById("exitButton");
const exitConfirm = document.getElementById("exitConfirm");
const confirmExit = document.getElementById("confirmExit");
const cancelExit = document.getElementById("cancelExit");

exitButton.addEventListener("click", () => {
  exitConfirm.style.display = "flex";
});

confirmExit.addEventListener("click", () => {
  exitConfirm.style.display = "none";
  container.style.display = "none";
  startScreen.style.display = "flex";
  const exitMsg = currentLanguage === 'en-US' ? 
      "You have exited the game" :
      "Has salido del juego";
  statusElement.innerText = exitMsg;
  cg.set({ movable: { color: null, dests: new Map() } }); // Block board
});

cancelExit.addEventListener("click", () => {
  exitConfirm.style.display = "none";
});

  
// Request draw button and its modal
const drawButton = document.getElementById("drawButton");
const drawConfirm = document.getElementById("drawConfirm");
const acceptDraw = document.getElementById("acceptDraw");
const rejectDraw = document.getElementById("rejectDraw");

let drawOfferedBy = null;

drawButton.addEventListener("click", () => {
  if (!drawOfferedBy) {
    drawOfferedBy = game.turn();

    // Simulates that the other player sees the offer
    const currentTurn = game.turn();

    if (drawOfferedBy !== currentTurn) {
      drawConfirm.style.display = "flex";
    } else {
      // Wait for turn change to show to the other player
      const waitForTurnChange = setInterval(() => {
        if (game.turn() !== drawOfferedBy) {
          clearInterval(waitForTurnChange);
          drawConfirm.style.display = "flex";
        }
      }, 300);
    }
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
  const drawAgreedMsg = currentLanguage === 'en-US' ? 
      "Draw agreed! 🤝" :
      "¡Tablas acordadas! 🤝";
  statusElement.innerText = drawAgreedMsg;
  const acceptedMsg = currentLanguage === 'en-US' ? 
      "accepted the draw" :
      "aceptó las tablas";
  announceState({ color: game.turn(), san: acceptedMsg });
  drawOfferedBy = null;
  cg.set({ movable: { color: null, dests: new Map() } }); // Block board
});

rejectDraw.addEventListener("click", () => {
  drawConfirm.style.display = "none";
  drawOfferedBy = null;
});

function resetGame() {
  game.reset(); // Reset chess logic (Chess.js)
  cg.set({
    // Reset board visually
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

  const turnMsg = currentLanguage === 'en-US' ? "White's turn" : "Turno de Blancas";
  statusElement.innerText = turnMsg;
  movesList.innerHTML = "";
  moveMessages.innerHTML = "";
}
