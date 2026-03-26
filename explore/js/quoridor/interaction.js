import * as THREE from '../../modules/three.modules.js';
import {
    camera, renderer,
    pawnMeshes, highlightMeshes,
    clearHighlights, showMoveHighlights, showWallHighlights,
    highlightPawn, showGhostWall, hideGhostWall,
    setActiveTurnRing, setCameraForRole
} from './main.js';
import { board, state, on, emit, setMode, setGameMode, tryMovePawn, tryPlaceWall, applyRemoteMove, resetGame, replayMoves } from './game.js';
import { computeAIMove } from './ai.js';
import { net, onNet, netSend, connectToRoom } from '../network.js';

let selectedPlayer = null;

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

const hudTurn     = document.getElementById('hud-turn');
const hudHint     = document.getElementById('hud-hint');
const hudWallsA   = document.getElementById('hud-walls-a');
const hudWallsB   = document.getElementById('hud-walls-b');
const btnMove     = document.getElementById('btn-move');
const btnWallH    = document.getElementById('btn-wall-h');
const btnWallV    = document.getElementById('btn-wall-v');
const btnReset    = document.getElementById('btn-reset');
const winOverlay  = document.getElementById('win-overlay');
const winMsg      = document.getElementById('win-message');
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

const btnChangeMode   = document.getElementById('btn-change-mode');

const resetConfirm    = document.getElementById('reset-confirm');
const btnConfirmYes   = document.getElementById('btn-confirm-yes');
const btnConfirmNo    = document.getElementById('btn-confirm-no');

const btnWallConfirm = document.getElementById('btn-wall-confirm');

const PLAYER_NAME = { A: 'Red', B: 'White' };

const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const HINTS = {
    'move':   isTouch ? 'Tap your pawn, then tap a green square' : 'Click your pawn, then click a green square',
    'wall-H': isTouch ? 'Tap a green slot to preview, then Place Wall' : 'Hover to preview, click to place horizontal wall',
    'wall-V': isTouch ? 'Tap a green slot to preview, then Place Wall' : 'Hover to preview, click to place vertical wall',
};

let pendingWall = null;

function updateHUD() {
    const p = state.currentPlayer;
    hudTurn.textContent = `${PLAYER_NAME[p]}'s Turn`;
    hudTurn.style.color = p === 'A' ? '#ff6666' : '#eeeeee';
    hudWallsA.textContent = board.wallCounts.A;
    hudWallsB.textContent = board.wallCounts.B;
    updateButtons();
    updateHint();
    updateTurnHighlight();
}

function updateHint() {
    if (hudHint) hudHint.textContent = HINTS[state.mode] ?? '';
}

function updateButtons() {
    [btnMove, btnWallH, btnWallV].forEach(b => b.classList.remove('active'));
    if (state.mode === 'move')   btnMove.classList.add('active');
    if (state.mode === 'wall-H') btnWallH.classList.add('active');
    if (state.mode === 'wall-V') btnWallV.classList.add('active');

    const noWalls = board.wallCounts[state.currentPlayer] <= 0;
    btnWallH.disabled = noWalls;
    btnWallV.disabled = noWalls;

    const locked = isLocked();
    btnMove.disabled  = locked;
    btnWallH.disabled = locked || noWalls;
    btnWallV.disabled = locked || noWalls;
}

function updateTurnHighlight() {
    cardA.classList.toggle('is-turn', state.currentPlayer === 'A');
    cardB.classList.toggle('is-turn', state.currentPlayer === 'B');
}

function updateScores() {
    const s = state.scores;
    scoreA.innerHTML = `${s.A} <small>wins</small>`;
    scoreB.innerHTML = `${s.B} <small>wins</small>`;
}

function isLocked() {
    if (state.gameMode === 'online') {
        return !net.opponentConnected || state.currentPlayer !== net.myRole;
    }
    if (state.gameMode === 'ai') {
        return state.currentPlayer === state.aiPlayer;
    }
    return false;
}

function deselect() {
    if (selectedPlayer !== null) {
        highlightPawn(selectedPlayer, false);
        selectedPlayer = null;
    }
}

function clearHighlightsAndHover() {
    hideGhostWall();
    clearHighlights();
    cancelPendingWall();
}

function enterMoveMode() {
    setMode('move');
    clearHighlightsAndHover();
    deselect();
    updateButtons();
    updateHint();
}

function enterWallMode(orientation) {
    if (board.wallCounts[state.currentPlayer] <= 0) return;
    if (isLocked()) return;
    setMode(`wall-${orientation}`);
    deselect();
    clearHighlightsAndHover();
    const placements = board.getValidWallPlacements(orientation);
    showWallHighlights(placements);
    updateButtons();
    updateHint();
}

function onClick(event) {
    if (state.winner) return;
    if (isLocked()) return;

    const clickable = [pawnMeshes[state.currentPlayer], ...highlightMeshes].filter(Boolean);

    mouse.x =  (event.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(clickable, true);

    if (!hits.length) {
        if (isTouch && pendingWall) {
            hideGhostWall();
            cancelPendingWall();
            updateHint();
            return;
        }
        deselect();
        clearHighlightsAndHover();
        if (state.mode !== 'move') {
            setMode('move');
            updateButtons();
            updateHint();
        }
        return;
    }

    let obj = hits[0].object;
    while (obj && !obj.userData.type && obj.parent) obj = obj.parent;
    const ud = obj?.userData;
    if (!ud?.type) return;

    if      (ud.type === 'pawn')       handlePawnClick(ud.player);
    else if (ud.type === 'moveTarget') handleMoveTarget(ud.x, ud.y);
    else if (ud.type === 'wallTarget') handleWallTarget(ud.wx, ud.wy, ud.orientation);
}

function handlePawnClick(player) {
    if (state.mode !== 'move') return;
    if (player !== state.currentPlayer) return;

    if (selectedPlayer === player) {
        deselect();
        clearHighlightsAndHover();
    } else {
        deselect();
        clearHighlightsAndHover();
        highlightPawn(player, true);
        selectedPlayer = player;
        showMoveHighlights(board.getValidMoves(board.pawns[player]));
    }
}

function handleMoveTarget(x, y) {
    if (selectedPlayer === null) return;
    deselect();
    clearHighlightsAndHover();
    const ok = tryMovePawn(x, y);
    if (ok && state.gameMode === 'online') {
        netSend({ type: 'move', x, y });
        if (state.winner) netSend({ type: 'win', winner: state.winner });
    }
    updateHUD();
}

function handleWallTarget(wx, wy, orientation) {
    if (isTouch) {
        if (pendingWall && pendingWall.wx === wx && pendingWall.wy === wy && pendingWall.orientation === orientation) {
            confirmWallPlacement();
            return;
        }
        pendingWall = { wx, wy, orientation };
        showGhostWall(wx, wy, orientation, true);
        btnWallConfirm.classList.remove('hidden');
        hudHint.textContent = 'Tap Place Wall to confirm';
        return;
    }
    placeWallFinal(wx, wy, orientation);
}

function placeWallFinal(wx, wy, orientation) {
    deselect();
    clearHighlightsAndHover();
    cancelPendingWall();
    const ok = tryPlaceWall(wx, wy, orientation);
    if (ok && state.gameMode === 'online') {
        netSend({ type: 'wall', wx, wy, orientation });
        if (state.winner) netSend({ type: 'win', winner: state.winner });
    }
    updateHUD();
}

function confirmWallPlacement() {
    if (!pendingWall) return;
    placeWallFinal(pendingWall.wx, pendingWall.wy, pendingWall.orientation);
}

function cancelPendingWall() {
    pendingWall = null;
    btnWallConfirm.classList.add('hidden');
}

let hoverRafPending = false;

function onMouseMove(event) {
    if (state.winner || isLocked()) { hideGhostWall(); return; }
    if (state.mode !== 'wall-H' && state.mode !== 'wall-V') { hideGhostWall(); return; }

    if (hoverRafPending) return;
    hoverRafPending = true;
    requestAnimationFrame(() => {
        hoverRafPending = false;
        doHover(event);
    });
}

function doHover(event) {
    if (!highlightMeshes.length) { hideGhostWall(); return; }

    mouse.x =  (event.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(highlightMeshes, false);
    if (!hits.length) { hideGhostWall(); return; }

    const ud = hits[0].object.userData;
    if (ud.type !== 'wallTarget') { hideGhostWall(); return; }

    showGhostWall(ud.wx, ud.wy, ud.orientation, true);
}

on('win', ({ winner }) => {
    winMsg.textContent = `${PLAYER_NAME[winner]} wins!`;
    winOverlay.classList.remove('hidden');
    deselect();
    clearHighlightsAndHover();
    setActiveTurnRing(null);
    if (state.gameMode !== 'online') {
        state.scores[winner]++;
        updateScores();
        state.startingPlayer = state.startingPlayer === 'A' ? 'B' : 'A';
    }
});

on('reset', () => {
    winOverlay.classList.add('hidden');
    deselect();
    clearHighlightsAndHover();
    updateHUD();
    setActiveTurnRing(state.currentPlayer);
});

on('turnChange', () => {
    updateHUD();
    setActiveTurnRing(state.currentPlayer);
});
on('modeChange', () => { updateButtons(); updateHint(); });

on('aiTurn', ({ player }) => {
    setTimeout(() => {
        if (state.winner) return;
        const action = computeAIMove(board, player);
        if (!action) return;
        if (action.type === 'move') {
            tryMovePawn(action.x, action.y);
        } else if (action.type === 'wall') {
            tryPlaceWall(action.wx, action.wy, action.orientation);
        }
        updateHUD();
    }, 400);
});

onNet('move', (msg) => {
    applyRemoteMove(msg);
    updateHUD();
});

onNet('wall', (msg) => {
    applyRemoteMove(msg);
    updateHUD();
});

onNet('reset', () => {
    resetGame();
    updateHUD();
    setActiveTurnRing('A');
});

onNet('score', ({ scores }) => {
    state.scores = scores;
    updateScores();
});

onNet('state_sync', ({ moves }) => {
    replayMoves(moves);
    updateHUD();
    setActiveTurnRing(state.currentPlayer);
});

onNet('opponent_joined', () => {
    lobbyStatus.textContent = 'Opponent joined!';
    setTimeout(() => {
        modeOverlay.classList.add('hidden');
        updateHUD();
    }, 600);
});

onNet('opponent_left', () => {
    hudHint.textContent = 'Opponent disconnected...';
});

onNet('disconnected', () => {
    hudHint.textContent = 'Connection lost. Refresh to reconnect.';
});

let resetPending = false;

function showResetConfirm(prompt) {
    document.querySelector('#reset-confirm-box p').textContent = prompt || 'Are you sure you want to reset the board?';
    resetConfirm.classList.remove('hidden');
}

function hideResetConfirm() {
    resetConfirm.classList.add('hidden');
    resetPending = false;
}

function onResetClick() {
    if (state.gameMode === 'online') {
        if (resetPending) return;
        resetPending = true;
        netSend({ type: 'reset_request' });
        hudHint.textContent = 'Reset requested — waiting for opponent...';
    } else {
        showResetConfirm('Are you sure you want to reset the board?');
    }
}

function doLocalReset() {
    hideResetConfirm();
    resetGame();
}

btnConfirmYes.addEventListener('click', () => {
    hideResetConfirm();
    if (state.gameMode === 'online') {
        netSend({ type: 'reset_accept' });
        resetGame();
    } else {
        resetGame();
    }
});
btnConfirmNo.addEventListener('click', () => {
    if (state.gameMode === 'online') {
        netSend({ type: 'reset_decline' });
    }
    hideResetConfirm();
});

onNet('reset_request', () => {
    showResetConfirm('Opponent wants to reset. Accept?');
});

onNet('reset_accept', () => {
    resetPending = false;
    hudHint.textContent = '';
    resetGame();
    updateHUD();
});

onNet('reset_decline', () => {
    resetPending = false;
    hudHint.textContent = 'Opponent declined the reset.';
    setTimeout(() => { if (hudHint.textContent === 'Opponent declined the reset.') updateHint(); }, 3000);
});

function changeMode() {
    if (state.gameMode === 'online') {
        import('../network.js').then(({ disconnect }) => disconnect());
    }
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

/* ── Tutorial ── */
const btnHowToPlay   = document.getElementById('btn-how-to-play');
const tutorialPanel  = document.getElementById('tutorial-panel');
const tutSlides      = document.querySelectorAll('.tut-slide');
const tutPrev        = document.getElementById('tut-prev');
const tutNext        = document.getElementById('tut-next');
const tutBack        = document.getElementById('tut-back');
const tutDotsEl      = document.getElementById('tut-dots');
const tutControlsEl  = document.getElementById('tut-controls-content');

const TOTAL_SLIDES = tutSlides.length;
let currentSlide = 0;

// Build dots
for (let i = 0; i < TOTAL_SLIDES; i++) {
    const dot = document.createElement('span');
    dot.className = 'tut-dot' + (i === 0 ? ' active' : '');
    tutDotsEl.appendChild(dot);
}
const tutDots = tutDotsEl.querySelectorAll('.tut-dot');

// Build controls slide content (device-specific)
function buildControls() {
    const rows = isTouch ? [
        ['&#9758;', '<strong>Tap your pawn</strong> to select it, then tap a green square to move'],
        ['&#9638;', 'Use the <strong>bottom buttons</strong> to switch between Move and Wall modes'],
        ['&#9644;', 'In wall mode, <strong>tap a green slot</strong> to preview, then tap <strong>Place Wall</strong> to confirm'],
    ] : [
        ['&#9758;', '<strong>Click your pawn</strong> to select it, then click a green square to move'],
        ['&#9638;', 'Use the <strong>bottom buttons</strong> to switch between Move and Wall modes'],
        ['&#9644;', 'In wall mode, <strong>hover</strong> to preview a wall, then <strong>click</strong> to place it'],
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

// Swipe support for tutorial
let tutTouchStartX = 0;
tutorialPanel.addEventListener('touchstart', (e) => { tutTouchStartX = e.touches[0].clientX; }, { passive: true });
tutorialPanel.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tutTouchStartX;
    if (Math.abs(dx) > 40) {
        if (dx < 0 && currentSlide < TOTAL_SLIDES - 1) showSlide(currentSlide + 1);
        if (dx > 0 && currentSlide > 0) showSlide(currentSlide - 1);
    }
}, { passive: true });

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
    if (!code || code.length < 2) {
        lobbyStatus.textContent = 'Enter a room code (2+ characters)';
        return;
    }

    btnJoinRoom.disabled = true;
    lobbyStatus.textContent = 'Connecting...';

    try {
        const init = await connectToRoom(code);
        setGameMode('online');
        state.myRole = init.role;
        state.scores = init.scores;

        setCameraForRole(init.role);

        if (init.role === 'A') { youA.classList.remove('hidden'); }
        else                   { youB.classList.remove('hidden'); }

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
roomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoom();
});

btnMove.addEventListener('click', enterMoveMode);
btnWallH.addEventListener('click', () => enterWallMode('H'));
btnWallV.addEventListener('click', () => enterWallMode('V'));
btnWallConfirm.addEventListener('click', confirmWallPlacement);
btnReset.addEventListener('click', onResetClick);
btnWinReset.addEventListener('click', onResetClick);

renderer.domElement.addEventListener('click', onClick);
renderer.domElement.addEventListener('mousemove', onMouseMove);

if (isTouch) {
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        onClick({ clientX: touch.clientX, clientY: touch.clientY });
        e.preventDefault();
    }, { passive: false });
}

updateHUD();
updateScores();
