import * as THREE from '../../modules/three.modules.js';
import {
    camera, renderer, colTargets, pieceMeshes,
    showGhost, hideGhost, showLastMove, clearLastMove,
    showWinHighlight, clearWinHighlight, highlightTurnPieces
} from './main.js';
import { board, state, on, emit, setGameMode, tryDrop, applyRemoteDrop, resetGame, replayMoves } from './game.js';
import { computeAIMove } from './ai.js';
import { net, onNet, netSend, connectToRoom } from '../network.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/* ── DOM refs ── */
const hudTurn      = document.getElementById('hud-turn');
const hudHint      = document.getElementById('hud-hint');
const hudDiscsA    = document.getElementById('hud-discs-a');
const hudDiscsB    = document.getElementById('hud-discs-b');
const btnReset     = document.getElementById('btn-reset');
const winOverlay   = document.getElementById('win-overlay');
const winMsg       = document.getElementById('win-message');
const winSub       = document.getElementById('win-sub');
const btnWinReset  = document.getElementById('btn-win-reset');
const cardA        = document.getElementById('card-a');
const cardB        = document.getElementById('card-b');
const scoreA       = document.getElementById('score-a');
const scoreB       = document.getElementById('score-b');
const youA         = document.getElementById('you-a');
const youB         = document.getElementById('you-b');
const modeOverlay  = document.getElementById('mode-overlay');
const modeButtons  = document.querySelectorAll('.mode-btn');
const lobbyPanel   = document.getElementById('lobby-panel');
const roomInput    = document.getElementById('room-input');
const btnJoinRoom  = document.getElementById('btn-join-room');
const lobbyStatus  = document.getElementById('lobby-status');
const btnChangeMode   = document.getElementById('btn-change-mode');
const resetConfirm    = document.getElementById('reset-confirm');
const btnConfirmYes   = document.getElementById('btn-confirm-yes');
const btnConfirmNo    = document.getElementById('btn-confirm-no');
const btnDropConfirm  = document.getElementById('btn-drop-confirm');

const PLAYER_NAME = { A: 'Red', B: 'White' };
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

let pendingCol = null;

/* ── HUD ── */

function updateHUD() {
    const p = state.currentPlayer;
    hudTurn.textContent = state.draw ? 'Draw!' : `${PLAYER_NAME[p]}'s Turn`;
    hudTurn.style.color = state.draw ? '#aaaaaa' : (p === 'A' ? '#ff6666' : '#dddddd');
    hudDiscsA.textContent = board.discCount('A');
    hudDiscsB.textContent = board.discCount('B');
    updateHint();
    updateTurnHighlight();
    highlightTurnPieces(state.winner || state.draw ? null : p);
}

function updateHint() {
    if (isLocked()) {
        hudHint.textContent = state.gameMode === 'ai' ? 'AI is thinking...' : 'Waiting for opponent...';
        return;
    }
    hudHint.textContent = isTouch ? 'Tap a column to drop a disc' : 'Click a column to drop a disc';
}

function updateTurnHighlight() {
    cardA.classList.toggle('is-turn', !state.winner && !state.draw && state.currentPlayer === 'A');
    cardB.classList.toggle('is-turn', !state.winner && !state.draw && state.currentPlayer === 'B');
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

/* ── Click handling ── */

function getHoveredCol(event) {
    mouse.x =  (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(colTargets);
    if (hits.length > 0) return hits[0].object.userData.col;
    return -1;
}

function cancelPendingDrop() {
    pendingCol = null;
    hideGhost();
    btnDropConfirm.classList.add('hidden');
}

function confirmDrop() {
    if (pendingCol === null) return;
    const col = pendingCol;
    cancelPendingDrop();
    dropDisc(col);
}

function dropDisc(col) {
    const result = tryDrop(col);
    if (result.ok) {
        showLastMove(result.row, result.col);
        hideGhost();
        if (state.gameMode === 'online') {
            netSend({ type: 'drop', col });
            if (state.winner) netSend({ type: 'win', winner: state.winner });
            if (state.draw) netSend({ type: 'draw' });
        }
    }
    updateHUD();
}

function onClick(event) {
    if (state.winner || state.draw || isLocked()) return;
    const col = getHoveredCol(event);
    if (col < 0) {
        if (isTouch && pendingCol !== null) cancelPendingDrop();
        return;
    }
    if (!board.getValidColumns().includes(col)) return;

    if (isTouch) {
        if (pendingCol === col) {
            confirmDrop();
            return;
        }
        pendingCol = col;
        showGhost(col, state.currentPlayer);
        btnDropConfirm.classList.remove('hidden');
        hudHint.textContent = 'Tap again or press Drop Disc to confirm';
        return;
    }

    dropDisc(col);
}

function onMouseMove(event) {
    if (state.winner || state.draw || isLocked()) { hideGhost(); return; }
    const col = getHoveredCol(event);
    if (col >= 0 && board.getValidColumns().includes(col)) {
        showGhost(col, state.currentPlayer);
    } else {
        hideGhost();
    }
}

/* ── Game events ── */

on('win', ({ winner }) => {
    const cells = board.getWinningCells();
    if (cells) showWinHighlight(cells);
    hideGhost();
    if (state.gameMode !== 'online') {
        state.scores[winner]++;
        updateScores();
        state.startingPlayer = state.startingPlayer === 'A' ? 'B' : 'A';
    }
    setTimeout(() => {
        winMsg.textContent = `${PLAYER_NAME[winner]} wins!`;
        winSub.textContent = 'Four in a row!';
        winOverlay.classList.remove('hidden');
    }, 3000);
});

on('draw', () => {
    winMsg.textContent = 'Draw!';
    winSub.textContent = 'The board is full';
    winOverlay.classList.remove('hidden');
    hideGhost();
});

on('reset', () => {
    winOverlay.classList.add('hidden');
    clearLastMove();
    clearWinHighlight();
    cancelPendingDrop();
    updateHUD();
});

on('turnChange', () => { updateHUD(); });

on('aiTurn', ({ player }) => {
    hideGhost();
    setTimeout(() => {
        if (state.winner || state.draw) return;
        const col = computeAIMove(board, player);
        if (col === null) return;
        const result = tryDrop(col);
        if (result.ok) showLastMove(result.row, result.col);
        updateHUD();
    }, 400);
});

/* ── Network ── */

onNet('drop', (msg) => {
    applyRemoteDrop(msg.col);
    const row = -1;
    // Find where the disc landed
    for (let r = 0; r < 6; r++) {
        if (board.grid[r][msg.col]) {
            // The last placed disc in this column
        }
    }
    // Use board state to find the row
    for (let r = 5; r >= 0; r--) {
        if (board.grid[r][msg.col]) { showLastMove(r, msg.col); break; }
    }
    updateHUD();
});
onNet('reset', () => { resetGame(); updateHUD(); });
onNet('score', ({ scores }) => { state.scores = scores; updateScores(); });
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
        ['&#11015;', '<strong>Tap a column</strong> to drop a disc into it'],
        ['&#9679;', 'Discs <strong>fall to the lowest</strong> available space'],
        ['&#10004;', 'First to get <strong>four in a row</strong> wins'],
    ] : [
        ['&#11015;', '<strong>Click a column</strong> to drop a disc into it'],
        ['&#9679;', 'Discs <strong>fall to the lowest</strong> available space'],
        ['&#10004;', 'First to get <strong>four in a row</strong> wins'],
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
        const init = await connectToRoom(code);
        setGameMode('online');
        state.myRole = init.role;
        state.scores = init.scores;
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

btnDropConfirm.addEventListener('click', confirmDrop);
btnReset.addEventListener('click', onResetClick);
btnWinReset.addEventListener('click', onResetClick);
renderer.domElement.addEventListener('click', onClick);
renderer.domElement.addEventListener('mousemove', onMouseMove);
renderer.domElement.addEventListener('mouseleave', () => { if (!isTouch) hideGhost(); });

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
