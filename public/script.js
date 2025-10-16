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
    'a1': 'a1', 'a2': 'a2', /* ... */ 'h8': 'h8',
    'rook': 'r', 'knight': 'n', 'bishop': 'b', 'queen': 'q', 'king': 'k', 'pawn': 'p',
    'move': 'move', 'to': 'to', 'takes': 'takes', 'castle kingside': 'O-O', 'castle queenside': 'O-O-O',
    'check': '+', 'checkmate': '#', 'undo': 'undo',
    'read': 'read',
    'i': 'i', 'resign': 'resignation',
    'draw': 'draw', 
    'capture': 'takes'
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let isListening = false;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceButton.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
            isListening = false;
            voiceButton.textContent = 'Speak';
        } else {
            recognition.start();
            isListening = true;
            voiceButton.textContent = 'Listening...';
        }
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('[DEBUG] Recognized text:', transcript);
        voiceButton.textContent = 'Speak';
        isListening = false;
        processVoiceCommand(transcript);
    };

    recognition.onerror = (event) => {
        console.error('[ERROR] Voice recognition error:', event.error);
        voiceButton.textContent = 'Speak';
        isListening = false;
        moveMessages.innerHTML += `<p style="color: red;">Voice recognition error: ${event.error}</p>`;
        announceMove({ color: "w", san: `Error: ${event.error}` });
    };

    recognition.onend = () => {
        if (isListening) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('[ERROR] Error restarting recognition:', error);
                    moveMessages.innerHTML += `<p style="color: red;">Error restarting recognition</p>`;
                    announceMove({ color: "w", san: "Error restarting recognition" });
                    isListening = false;
                    voiceButton.textContent = 'Speak';
                }
            }, 500);
        } else {
            voiceButton.textContent = 'Speak';
        }
    };
} else {
    voiceButton.disabled = true;
    voiceButton.textContent = 'Voice not supported';
    moveMessages.innerHTML += `<p style="color: red;">Your browser does not support voice recognition</p>`;
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
            const utterance = new SpeechSynthesisUtterance("ChessTalk is ready. White begins.");
            utterance.lang = "en-US";
            
            const englishVoices = voices.filter(voice => voice.lang.includes('en'));
            if (englishVoices.length > 0) {
                utterance.voice = englishVoices[0];
                synth.speak(utterance);
            }
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
    utterance.lang = "en-US";
    utterance.text = `${move.color === "w" ? "Player 1" : "Player 2"} made the move ${move.san}`;
    utterance.pitch = 1.2;
    utterance.volume = 1.0; // Ensure maximum volume
    utterance.rate = 0.9; // Speak a bit slower for better clarity
    
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
        // Filter English voices
        const englishVoices = voices.filter(voice => voice.lang.includes('en'));
        
        // Try to find Google voices first, then any English voice
        const preferredVoice = englishVoices.find(voice => voice.name.includes('Google')) || 
                              englishVoices[0] || 
                              voices[0]; // Last option: any voice
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log(`Using voice: ${preferredVoice.name} (${preferredVoice.lang})`);
        } else {
            console.warn("No suitable voices found for English");
        }
        
        // Cancel any previous synthesis and speak
        synth.cancel();
        synth.speak(utterance);
    }
}

// Function to announce critical states by voice
function announceState(move) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = "en-US";
    utterance.text = `${move.color === "w" ? "Player 1" : "Player 2"}  ${move.san}`;
    utterance.pitch = 1.2;
    utterance.volume = 1.0; // Ensure maximum volume
    utterance.rate = 0.9; // Speak a bit slower for better clarity
    
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
        // Filter English voices
        const englishVoices = voices.filter(voice => voice.lang.includes('en'));
        
        // Try to find Google voices first, then any English voice
        const preferredVoice = englishVoices.find(voice => voice.name.includes('Google')) || 
                              englishVoices[0] || 
                              voices[0]; // Last option: any voice
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log(`Using voice: ${preferredVoice.name} (${preferredVoice.lang})`);
        } else {
            console.warn("No suitable voices found for English");
        }
        
        // Cancel any previous synthesis and speak
        synth.cancel();
        synth.speak(utterance);
    }
}

function updateStatus() {
    if (game.isCheckmate()) {
        statusElement.innerText = `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins 🎉`;
        setTimeout(() => {
            announceState({ color: game.turn() === "w" ? "b" : "w", san: "made Checkmate" });
        }, 5000);
        
    } else if (game.isCheck()) {
        statusElement.innerText = `Check! ${game.turn() === "w" ? "White's" : "Black's"} turn`;
        setTimeout(() => {
            announceState({ color: game.turn() === "w" ? "b" : "w", san: "made Check" });
        }, 5000);
        
    } else if (game.isDraw()) {
        statusElement.innerText = "Draw! The game has ended 🤝";
    } else {
        statusElement.innerText = `${game.turn() === "w" ? "White's" : "Black's"} turn`;
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
    const player = move.color === "w" ? "Player 1" : "Player 2";
    const message = `${player} made the move ${move.san}`;
    
    const p = document.createElement("p");
    p.innerText = message;
    moveMessages.appendChild(p);
}

function processVoiceCommand(command) {
    console.log("[DEBUG] Command received:", command);
    moveMessages.innerHTML += `<p>Command: ${command}</p>`;

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
                throw new Error("Could not identify piece or destination");
            }

            const moves = game.moves({ verbose: true });
            const validMove = moves.find(m => m.piece === piece && m.to === to);

            if (validMove) {
                handleMove(validMove.from, validMove.to);
                announceMove(validMove);
            } else {
                throw new Error(`Invalid move for ${piece} to ${to}`);
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
                announceMove({ color: result.color, san: `Castle ${move === 'O-O' ? 'kingside' : 'queenside'}` });
            } else {
                throw new Error("Castling not allowed");
            }
        }
        else if (normalized.includes('resignation')) {    
            
            surrenderConfirm.style.display = "flex";

            updateStatus();
            updateMoveList();
            
            announceState({ color: game.turn(), san: "Are you sure you want to resign?" });
            statusElement.innerText = "The player has requested to resign. Please confirm or cancel";
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
            announceState({ color: game.turn(), san: "has proposed a draw" });
            statusElement.innerText = "The player has requested a draw. Please confirm or cancel";
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
                
                announceState({ color: undone.color, san: `Move undone: ${undone.san}` });
            } else {
                throw new Error("No moves to undo");
            }
        }
        else if (normalized.includes('read')) {
            const history = game.history();
            const movesText = history.length ? history.join(', ') : 'No moves';
            const turno = game.turn() === 'w' ? 'w' : 'b';
            announceState({ color: turno, san: `these are the moves made: ${movesText}` });
        }
        else {
            throw new Error("Command not recognized");
        }
    } catch (error) {
        console.error("[ERROR] Error in command:", error.message);
        moveMessages.innerHTML += `<p style="color: red;">Error: ${error.message}</p>`;
        announceMove({ color: "w", san: `Error: ${error.message}` });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    announceMove({ color: "w", san: "Welcome to ChessTalk. White begins" });
    if (SpeechRecognition) {
        voiceButton.style.display = 'block';
    } else {
        moveMessages.innerHTML += `<p style="color: red;">Your browser does not support voice recognition</p>`;
        announceMove({ color: "w", san: "Browser does not support voice recognition" });
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'v' || event.key === 'V') {
        if (isListening) {
            recognition.stop();
            isListening = false;
            voiceButton.textContent = 'Speak';
        } else {
            recognition.start();
            isListening = true;
            voiceButton.textContent = 'Listening...';
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
      status.textContent = "Your turn";
      document.getElementById("voiceButton").disabled = false;
  
      // Simulates turn change (simple example)
      setTimeout(() => {
        status.textContent = "Opponent's turn";
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
  announceState({ color: game.turn(), san: "Are you sure you want to resign?" });
  statusElement.innerText = "The player has requested to resign. Please confirm or cancel";
});

confirmSurrender.addEventListener("click", () => {
  surrenderConfirm.style.display = "none";
  announceState({ color: game.turn(), san: "resigned" });
  statusElement.innerText = "The player has resigned 🏳️";
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
  statusElement.innerText = "You have exited the game";
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
    announceState({ color: game.turn(), san: "has proposed a draw" });
    statusElement.innerText = "The player has requested a draw. Please confirm or cancel";
  });
  
  acceptDraw.addEventListener("click", () => {
    drawConfirm.style.display = "none";
    statusElement.innerText = "Draw agreed! 🤝";
    announceState({ color: game.turn(), san: "accepted the draw" });
    drawOfferedBy = null;
    cg.set({ movable: { color: null, dests: new Map() } }); // Block board
  });
  
  rejectDraw.addEventListener("click", () => {
    drawConfirm.style.display = "none";
    //alert("You have rejected the draw. Continue the game.");
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
  
    statusElement.innerText = "White's turn";
    movesList.innerHTML = "";
    moveMessages.innerHTML = "";
  }
