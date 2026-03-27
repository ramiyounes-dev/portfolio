import * as THREE from '../../modules/three.modules.js';
import {
    camera, renderer, pieceMeshes, highlightMeshes,
    clearHighlights, showMoveHighlights, highlightPiece, highlightTurnPieces, setCameraForRole,
    showLastMove, clearLastMove
} from './main.js';
import { board, state, on, emit, setGameMode, tryMove, applyRemoteMove, finishTurn, resetGame, replayMoves } from './game.js';
import { computeAIMove } from './ai.js';
import { net, onNet, netSend, connectToRoom } from '../network.js';

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

/* ── DOM refs ── */
const hudTurn     = document.getElementById('hud-turn');
const hudHint     = document.getElementById('hud-hint');
const hudPiecesA  = document.getElementById('hud-pieces-a');
const hudPiecesB  = document.getElementById('hud-pieces-b');
const btnReset    = document.getElementById('btn-reset');
const winOverlay  = document.getElementById('win-overlay');
const winMsg      = document.getElementById('win-message');
const winSub      = document.getElementById('win-sub');
const btnWinReset = document.getElementById('btn-win-reset');
const cardA       = document.getElementById('card-a');
const cardB       = document.getElementById('card-b');
const scoreA      = document.getElementById('score-a');
const scoreB      = document.getElementById('score-b');
const youA        = document.getElementById('you-a');
const youB        = document.getElementById('you-b');
const modeOverlay  = document.getElementById('mode-overlay');
const modeButtons  = document.querySelectorAll('.mode-btn');
const lobbyPanel   = document.getElementById('lobby-panel');
const roomInput    = document.getElementById('room-input');
const btnJoinRoom  = document.getElementById('btn-join-room');
const lobbyStatus  = document.getElementById('lobby-status');
const btnChangeMode = document.getElementById('btn-change-mode');
const resetConfirm  = document.getElementById('reset-confirm');
const btnConfirmYes = document.getElementById('btn-confirm-yes');
const btnConfirmNo  = document.getElementById('btn-confirm-no');

const PLAYER_NAME = { A: 'Red', B: 'White' };
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

let selectedPiece = null;
let currentPieceMoves = null;
let captureState = null;       // { from, sequences, stepIndex, currentPos }
let autoHighlightedPieces = [];

/* ── HUD ── */

function updateHUD() {
    const p = state.currentPlayer;
    hudTurn.textContent = `${PLAYER_NAME[p]}'s Turn`;
    hudTurn.style.color = p === 'A' ? '#ff6666' : '#eeeeee';
    hudPiecesA.textContent = board.pieceCount('A');
    hudPiecesB.textContent = board.pieceCount('B');
    updateHint();
    updateTurnHighlight();
    highlightTurnPieces(state.winner ? null : p);
}

function updateHint() {
    if (isLocked()) {
        hudHint.textContent = state.gameMode === 'ai' ? 'AI is thinking...' : 'Waiting for opponent...';
        return;
    }
    if (captureState) {
        hudHint.textContent = isTouch ? 'Tap the next square to continue capturing' : 'Click the next square to continue capturing';
        return;
    }
    const legal = board.getLegalMoves(state.currentPlayer);
    if (legal.type === 'capture') {
        hudHint.textContent = isTouch ? 'Tap a highlighted piece to capture (mandatory)' : 'Click a highlighted piece to capture (mandatory)';
    } else {
        hudHint.textContent = isTouch ? 'Tap a piece, then tap where to move' : 'Click a piece, then click where to move';
    }
}

function updateTurnHighlight() {
    cardA.classList.toggle('is-turn', state.currentPlayer === 'A');
    cardB.classList.toggle('is-turn', state.currentPlayer === 'B');
}

function updateScores() {
    scoreA.innerHTML = `${state.scores.A} <small>wins</small>`;
    scoreB.innerHTML = `${state.scores.B} <small>wins</small>`;
}

function isLocked() {
    if (state.gameMode === 'online') return !net.opponentConnected || state.currentPlayer !== net.myRole;
    if (state.gameMode === 'ai') return state.currentPlayer === state.aiPlayer;
    return false;
}

/* ── Auto-highlight mandatory captures ── */

function autoHighlightCaptures() {
    clearAutoHighlights();
    if (isLocked() || state.winner || captureState) return;
    const legal = board.getLegalMoves(state.currentPlayer);
    if (legal.type !== 'capture') return;

    const seen = new Set();
    for (const m of legal.moves) {
        const k = `${m.from.row},${m.from.col}`;
        if (!seen.has(k)) {
            seen.add(k);
            autoHighlightedPieces.push({ row: m.from.row, col: m.from.col });
            highlightPiece(m.from.row, m.from.col, true);
        }
    }

    if (autoHighlightedPieces.length === 1) {
        const p = autoHighlightedPieces[0];
        selectPieceForCapture(p.row, p.col, legal.moves);
    }
}

function clearAutoHighlights() {
    for (const p of autoHighlightedPieces) highlightPiece(p.row, p.col, false);
    autoHighlightedPieces = [];
}

/* ── Selection ── */

function deselect() {
    clearAutoHighlights();
    if (selectedPiece) { highlightPiece(selectedPiece.row, selectedPiece.col, false); selectedPiece = null; currentPieceMoves = null; }
    clearHighlights();
}

function selectPieceForCapture(row, col, allMoves) {
    const sequences = allMoves.filter(m => m.from.row === row && m.from.col === col);
    if (sequences.length === 0) return;

    clearAutoHighlights();
    if (selectedPiece) highlightPiece(selectedPiece.row, selectedPiece.col, false);
    clearHighlights();

    selectedPiece = { row, col };
    highlightPiece(row, col, true);

    captureState = { from: { row, col }, sequences, stepIndex: 0, currentPos: { row, col } };
    showCaptureStepTargets();
    updateHint();
}

function showCaptureStepTargets() {
    clearHighlights();
    const seen = new Set();
    const targets = [];
    for (const seq of captureState.sequences) {
        const step = seq.path[captureState.stepIndex];
        const k = `${step.row},${step.col}`;
        if (!seen.has(k)) { seen.add(k); targets.push(step); }
    }
    showMoveHighlights(targets);
}

/* ── Click handling ── */

function onClick(event) {
    if (state.winner || isLocked()) return;

    mouse.x =  (event.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const clickable = [...Object.values(pieceMeshes), ...highlightMeshes].filter(Boolean);
    const hits = raycaster.intersectObjects(clickable, true);

    if (!hits.length) {
        if (!captureState) deselect();
        return;
    }

    let obj = hits[0].object;
    while (obj && !obj.userData?.type && obj.parent) obj = obj.parent;
    const ud = obj?.userData;
    if (!ud?.type) return;

    if (ud.type === 'piece' && (!captureState || captureState.stepIndex === 0)) handlePieceClick(ud);
    else if (ud.type === 'moveTarget') handleMoveTarget(ud);
}

function handlePieceClick(ud) {
    if (ud.player !== state.currentPlayer) return;

    if (captureState) captureState = null;

    const legal = board.getLegalMoves(state.currentPlayer);

    if (legal.type === 'capture') {
        const sequences = legal.moves.filter(m => m.from.row === ud.row && m.from.col === ud.col);
        if (sequences.length === 0) return;
        if (selectedPiece && selectedPiece.row === ud.row && selectedPiece.col === ud.col) { deselect(); autoHighlightCaptures(); return; }
        deselect();
        selectPieceForCapture(ud.row, ud.col, legal.moves);
    } else {
        const moves = legal.moves.filter(m => m.from.row === ud.row && m.from.col === ud.col);
        if (moves.length === 0) return;
        if (selectedPiece && selectedPiece.row === ud.row && selectedPiece.col === ud.col) { deselect(); return; }
        deselect();
        selectedPiece = { row: ud.row, col: ud.col };
        highlightPiece(ud.row, ud.col, true);
        currentPieceMoves = moves;
        showMoveHighlights(moves.map(m => m.to));
    }
}

function handleMoveTarget(ud) {
    if (captureState) { handleCaptureStep(ud); return; }
    if (!selectedPiece || !currentPieceMoves) return;

    const move = currentPieceMoves.find(m => m.to.row === ud.row && m.to.col === ud.col);
    if (!move) return;

    const from = { ...selectedPiece };
    deselect();
    const ok = tryMove(move);
    if (ok) {
        showLastMove(from, move.to);
        if (state.gameMode === 'online') {
            netSend({ type: 'move', move });
            if (state.winner) netSend({ type: 'win', winner: state.winner });
        }
    }
    updateHUD();
    if (!state.winner) autoHighlightCaptures();
}

function handleCaptureStep(ud) {
    const { stepIndex, sequences, currentPos } = captureState;

    const matching = sequences.filter(s => {
        const step = s.path[stepIndex];
        return step.row === ud.row && step.col === ud.col;
    });
    if (matching.length === 0) return;

    captureState.sequences = matching;

    const capturedPos = matching[0].captured[stepIndex];
    const piece = board.grid[currentPos.row][currentPos.col];
    board.grid[currentPos.row][currentPos.col] = null;
    board.grid[capturedPos.row][capturedPos.col] = null;
    board.grid[ud.row][ud.col] = piece;

    captureState.currentPos = { row: ud.row, col: ud.col };
    captureState.stepIndex++;

    emit('boardChange', null);

    if (captureState.stepIndex >= matching[0].path.length) {
        const promoRow = piece.player === 'A' ? 7 : 0;
        if (ud.row === promoRow && !piece.king) {
            piece.king = true;
            emit('boardChange', null);
        }

        const from = captureState.from;
        const fullMove = matching[0];
        selectedPiece = null;
        captureState = null;
        clearHighlights();

        showLastMove(from, { row: ud.row, col: ud.col });

        if (state.gameMode === 'online') {
            netSend({ type: 'move', move: fullMove });
        }

        finishTurn();

        if (state.winner && state.gameMode === 'online') {
            netSend({ type: 'win', winner: state.winner });
        }

        updateHUD();
        if (!state.winner) autoHighlightCaptures();
    } else {
        selectedPiece = { row: ud.row, col: ud.col };
        highlightPiece(ud.row, ud.col, true);
        showCaptureStepTargets();
        updateHint();
    }
}

/* ── Game events ── */

on('win', ({ winner }) => {
    const loser = winner === 'A' ? 'B' : 'A';
    winMsg.textContent = `${PLAYER_NAME[winner]} wins!`;
    winSub.textContent = board.pieceCount(loser) === 0 ? 'All pieces captured' : 'Opponent blocked';
    winOverlay.classList.remove('hidden');
    deselect();
    captureState = null;
    if (state.gameMode !== 'online') {
        state.scores[winner]++;
        updateScores();
        state.startingPlayer = state.startingPlayer === 'A' ? 'B' : 'A';
    }
});

on('reset', () => {
    winOverlay.classList.add('hidden');
    deselect();
    captureState = null;
    clearLastMove();
    updateHUD();
    autoHighlightCaptures();
});

on('turnChange', () => {
    updateHUD();
    autoHighlightCaptures();
});

on('aiTurn', ({ player }) => {
    setTimeout(() => {
        if (state.winner) return;
        const move = computeAIMove(board, player);
        if (!move) return;
        const from = { ...move.from };
        const to = move.captured ? move.path[move.path.length - 1] : move.to;
        tryMove(move);
        showLastMove(from, to);
        updateHUD();
        if (!state.winner) autoHighlightCaptures();
    }, 400);
});

/* ── Network ── */

onNet('move', (msg) => {
    const move = msg.move;
    const from = { ...move.from };
    const to = move.captured ? move.path[move.path.length - 1] : move.to;
    applyRemoteMove(move);
    showLastMove(from, to);
    updateHUD();
    if (!state.winner) autoHighlightCaptures();
});
onNet('reset', () => { resetGame(); updateHUD(); });
onNet('score', ({ scores, nextStarter }) => { state.scores = scores; if (nextStarter) state.startingPlayer = nextStarter; updateScores(); });
onNet('state_sync', ({ moves }) => { replayMoves(moves); updateHUD(); });
onNet('opponent_joined', () => {
    lobbyStatus.textContent = 'Opponent joined!';
    setTimeout(() => { modeOverlay.classList.add('hidden'); updateHUD(); }, 600);
});
onNet('opponent_left', () => { hudHint.textContent = 'Opponent disconnected...'; });
onNet('disconnected', () => { hudHint.textContent = 'Connection lost. Refresh to reconnect.'; });

/* ── Reset ── */

let resetPending = false;

function showResetConfirm(prompt) {
    document.querySelector('#reset-confirm-box p').textContent = prompt || 'Are you sure you want to reset the board?';
    resetConfirm.classList.remove('hidden');
}

function hideResetConfirm() { resetConfirm.classList.add('hidden'); resetPending = false; }

function onResetClick() {
    if (state.gameMode === 'online') {
        if (resetPending) return;
        resetPending = true;
        netSend({ type: 'reset_request' });
        hudHint.textContent = 'Reset requested \u2014 waiting for opponent...';
    } else {
        showResetConfirm();
    }
}

btnConfirmYes.addEventListener('click', () => {
    hideResetConfirm();
    if (state.gameMode === 'online') netSend({ type: 'reset_accept' });
    resetGame();
});
btnConfirmNo.addEventListener('click', () => {
    if (state.gameMode === 'online') netSend({ type: 'reset_decline' });
    hideResetConfirm();
});

onNet('reset_request', () => showResetConfirm('Opponent wants to reset. Accept?'));
onNet('reset_accept', () => { resetPending = false; hudHint.textContent = ''; resetGame(); updateHUD(); });
onNet('reset_decline', () => {
    resetPending = false; hudHint.textContent = 'Opponent declined the reset.';
    setTimeout(() => { if (hudHint.textContent === 'Opponent declined the reset.') updateHint(); }, 3000);
});

/* ── Tutorial ── */

const btnHowToPlay  = document.getElementById('btn-how-to-play');
const tutorialPanel = document.getElementById('tutorial-panel');
const tutSlides     = document.querySelectorAll('.tut-slide');
const tutPrev       = document.getElementById('tut-prev');
const tutNext       = document.getElementById('tut-next');
const tutBack       = document.getElementById('tut-back');
const tutDotsEl     = document.getElementById('tut-dots');
const tutControlsEl = document.getElementById('tut-controls-content');

const TOTAL_SLIDES = tutSlides.length;
let currentSlide = 0;

for (let i = 0; i < TOTAL_SLIDES; i++) {
    const dot = document.createElement('span');
    dot.className = 'tut-dot' + (i === 0 ? ' active' : '');
    tutDotsEl.appendChild(dot);
}
const tutDots = tutDotsEl.querySelectorAll('.tut-dot');

function buildControls() {
    const rows = isTouch ? [
        ['&#9758;', '<strong>Tap a piece</strong> to select, then tap a green square to move or capture'],
        ['&#10003;', 'Captures are <strong>mandatory</strong> \u2014 you must take the path with the most captures'],
        ['&#9813;', 'Reach the far row to promote to a <strong>King</strong>'],
    ] : [
        ['&#9758;', '<strong>Click a piece</strong> to select, then click a green square to move or capture'],
        ['&#10003;', 'Captures are <strong>mandatory</strong> \u2014 you must take the path with the most captures'],
        ['&#9813;', 'Reach the far row to promote to a <strong>King</strong>'],
    ];
    tutControlsEl.innerHTML = rows.map(([icon, label]) =>
        `<div class="tut-ctrl-row"><div class="tut-ctrl-icon">${icon}</div><div class="tut-ctrl-label">${label}</div></div>`
    ).join('');
}
buildControls();

function showSlide(idx) {
    currentSlide = idx;
    tutSlides.forEach((s, i) => s.classList.toggle('hidden', i !== idx));
    tutDots.forEach((d, i) => d.classList.toggle('active', i === idx));
    tutPrev.disabled = idx === 0;
    tutNext.disabled = idx === TOTAL_SLIDES - 1;
}

function openTutorial() {
    document.getElementById('mode-buttons').classList.add('hidden');
    document.getElementById('mode-sub').classList.add('hidden');
    btnHowToPlay.classList.add('hidden');
    tutorialPanel.classList.remove('hidden');
    showSlide(0);
}

function closeTutorial() {
    tutorialPanel.classList.add('hidden');
    document.getElementById('mode-buttons').classList.remove('hidden');
    document.getElementById('mode-sub').classList.remove('hidden');
    btnHowToPlay.classList.remove('hidden');
}

btnHowToPlay.addEventListener('click', openTutorial);
tutBack.addEventListener('click', closeTutorial);
tutPrev.addEventListener('click', () => { if (currentSlide > 0) showSlide(currentSlide - 1); });
tutNext.addEventListener('click', () => { if (currentSlide < TOTAL_SLIDES - 1) showSlide(currentSlide + 1); });

let tutTouchStartX = 0;
tutorialPanel.addEventListener('touchstart', (e) => { tutTouchStartX = e.touches[0].clientX; }, { passive: true });
tutorialPanel.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tutTouchStartX;
    if (Math.abs(dx) > 40) {
        if (dx < 0 && currentSlide < TOTAL_SLIDES - 1) showSlide(currentSlide + 1);
        if (dx > 0 && currentSlide > 0) showSlide(currentSlide - 1);
    }
}, { passive: true });

/* ── Mode selection ── */

function changeMode() {
    if (state.gameMode === 'online') import('../network.js').then(({ disconnect }) => disconnect());
    setCameraForRole('A');
    state.startingPlayer = 'A';
    resetGame();
    state.scores = { A: 0, B: 0 };
    state.myRole = null;
    updateScores();
    youA.classList.add('hidden');
    youB.classList.add('hidden');
    document.getElementById('mode-buttons').classList.remove('hidden');
    document.getElementById('mode-sub').textContent = 'Choose a game mode';
    document.getElementById('mode-sub').classList.remove('hidden');
    btnHowToPlay.classList.remove('hidden');
    tutorialPanel.classList.add('hidden');
    lobbyPanel.classList.add('hidden');
    lobbyStatus.textContent = '';
    roomInput.value = '';
    btnJoinRoom.disabled = false;
    modeOverlay.classList.remove('hidden');
}

btnChangeMode.addEventListener('click', changeMode);

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode === 'online') {
            document.getElementById('mode-buttons').classList.add('hidden');
            document.getElementById('mode-sub').textContent = 'Enter a room code to play online';
            lobbyPanel.classList.remove('hidden');
            roomInput.focus();
            return;
        }
        setGameMode(mode);
        modeOverlay.classList.add('hidden');
        resetGame();
    });
});

async function joinRoom() {
    const code = roomInput.value.trim().toUpperCase();
    if (!code || code.length < 2) { lobbyStatus.textContent = 'Enter a room code (2+ characters)'; return; }
    btnJoinRoom.disabled = true;
    lobbyStatus.textContent = 'Connecting...';
    try {
        const init = await connectToRoom('DM-' + code);
        setGameMode('online');
        state.myRole = init.role;
        state.scores = init.scores;
        state.startingPlayer = init.startingPlayer || 'A';
        setCameraForRole(init.role);
        if (init.role === 'A') youA.classList.remove('hidden'); else youB.classList.remove('hidden');
        updateScores();
        if (init.opponentConnected) {
            lobbyStatus.textContent = `You are ${PLAYER_NAME[init.role]}. Game on!`;
            setTimeout(() => modeOverlay.classList.add('hidden'), 600);
        } else {
            lobbyStatus.textContent = `You are ${PLAYER_NAME[init.role]}. Waiting for opponent...`;
        }
    } catch (err) {
        lobbyStatus.textContent = err.message || 'Connection failed';
        btnJoinRoom.disabled = false;
    }
}

btnJoinRoom.addEventListener('click', joinRoom);
roomInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinRoom(); });

/* ── Controls ── */

btnReset.addEventListener('click', onResetClick);
btnWinReset.addEventListener('click', onResetClick);
renderer.domElement.addEventListener('click', onClick);

if (isTouch) {
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        onClick({ clientX: t.clientX, clientY: t.clientY });
        e.preventDefault();
    }, { passive: false });
}

updateHUD();
updateScores();
