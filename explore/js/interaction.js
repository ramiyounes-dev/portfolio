import * as THREE from '../modules/three.modules.js';
import {
    camera, renderer,
    pawnMeshes, highlightMeshes,
    clearHighlights, showMoveHighlights, showWallHighlights,
    highlightPawn, showGhostWall, hideGhostWall,
    setActiveTurnRing, setCameraForRole
} from './main.js';
import { board, state, on, emit, setMode, setGameMode, tryMovePawn, tryPlaceWall, applyRemoteMove, resetGame, replayMoves } from './game.js';
import { computeAIMove } from './ai.js';
import { net, onNet, netSend, connectToRoom } from './network.js';

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

const PLAYER_NAME = { A: 'Red', B: 'White' };

const HINTS = {
    'move':   'Click your pawn, then click a green square',
    'wall-H': 'Hover to preview, click to place horizontal wall',
    'wall-V': 'Hover to preview, click to place vertical wall',
};

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
    deselect();
    clearHighlightsAndHover();
    const ok = tryPlaceWall(wx, wy, orientation);
    if (ok && state.gameMode === 'online') {
        netSend({ type: 'wall', wx, wy, orientation });
        if (state.winner) netSend({ type: 'win', winner: state.winner });
    }
    updateHUD();
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
    }
});

on('reset', () => {
    winOverlay.classList.add('hidden');
    deselect();
    clearHighlightsAndHover();
    updateHUD();
    setActiveTurnRing('A');
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
        import('./network.js').then(({ disconnect }) => disconnect());
    }
    setCameraForRole('A');
    resetGame();
    state.scores = { A: 0, B: 0 };
    state.myRole = null;
    updateScores();
    youA.classList.add('hidden');
    youB.classList.add('hidden');
    document.getElementById('mode-buttons').classList.remove('hidden');
    document.getElementById('mode-sub').textContent = 'Choose a game mode';
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
btnReset.addEventListener('click', onResetClick);
btnWinReset.addEventListener('click', onResetClick);

renderer.domElement.addEventListener('click', onClick);
renderer.domElement.addEventListener('mousemove', onMouseMove);

updateHUD();
updateScores();
