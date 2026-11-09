/* Quoridor: gameplay and input.
   Move mode: your legal squares are shown, tap one. Wall mode: the wall follows the pointer and snaps to the grid;
   click to place (desktop) or drag, then confirm (touch). Rotate with R, the wheel, or the Rotate button.
   The AI thinks in a worker, so the page never freezes. */

import * as view from './main.js';
import { board, state, setMode, setGameMode, tryMovePawn, tryPlaceWall, applyRemoteMove, resetGame, replayMoves } from './game.js';
import { computeAIMove } from './ai.js';
import { boardFrom } from './serialize.js';
import { createShell, NAME } from '../shared/shell.js';
import howto from '../../party/howto/quoridor.js';
import { bindPointer, verb, coarse } from '../shared/pointer.js';
import { createAI } from '../shared/aiRunner.js';
import { wait } from '../shared/anim.js';
import { net } from '../network.js';

const ai = createAI(new URL('./ai.worker.js', import.meta.url), p => computeAIMove(boardFrom(p), p.player, p.difficulty));

const $ = id => document.getElementById(id);
const btnMove = $('btn-move'), btnWall = $('btn-wall'), btnRotate = $('btn-rotate'), btnConfirm = $('btn-wall-confirm');

let animating = false;
let aiThinking = false;
let orient = 'H';
let pending = null;       // touch: aimed wall waiting for confirmation { wx, wy, o, valid }
let flash = null;         // temporary hint (invalid wall)

const shell = createShell({
    gameId: 'quoridor',
    title: { en: 'Quoridor', fr: 'Quoridor' },
    howto,
    onStart(mode, extra = {}) { state.difficulty = extra.difficulty || 'hard'; setGameMode(mode); view.setSide('A'); startNewGame(); },
    onJoin(init) {
        setGameMode('online');
        state.myRole = init.role;
        state.scores = init.scores || { A: 0, B: 0 };
        state.startingPlayer = init.startingPlayer || 'A';
        view.setSide(init.role);
        startNewGame();
    },
    onReset() { startNewGame(); },
    onMenu() { setGameMode('local'); view.setSide('A'); state.scores = { A: 0, B: 0 }; state.startingPlayer = 'A'; startNewGame({ silent: true }); },
    onOpponent() { refresh(); },
    refreshHint() { refresh(); },
});

/* ---------- Turn helpers ---------- */
const over = () => !!state.winner;
function isMyTurn() {
    if (over()) return false;
    if (state.gameMode === 'online') return net.opponentConnected && state.currentPlayer === net.myRole;
    if (state.gameMode === 'ai') return state.currentPlayer !== state.aiPlayer;
    return true;
}
const canAct = () => isMyTurn() && !animating && !shell.isDialogOpen();
const wallMode = () => state.mode !== 'move';

function winTitle(w) {
    if (state.gameMode === 'ai') return w === state.aiPlayer ? 'The AI wins' : 'You win!';
    if (state.gameMode === 'online') return w === state.myRole ? 'You win!' : `${NAME[w]} wins`;
    return `${NAME[w]} wins!`;
}

/* ---------- HUD + buttons ---------- */
function refresh() {
    const p = state.currentPlayer;
    shell.setCounts(board.wallCounts.A, board.wallCounts.B);
    shell.setScores(state.scores);
    if (state.gameMode === 'ai') shell.setBadges('You', 'AI');
    else if (state.gameMode === 'online') shell.setBadges(state.myRole === 'A' ? 'You' : '', state.myRole === 'B' ? 'You' : '');
    else shell.setBadges('', '');

    const mine = canAct();
    const noWalls = board.wallCounts[p] <= 0;
    btnMove.disabled = !mine;
    btnWall.disabled = !mine || noWalls;
    btnRotate.disabled = !mine || !wallMode();
    btnMove.classList.toggle('active', !wallMode());
    btnWall.classList.toggle('active', wallMode());
    btnMove.setAttribute('aria-pressed', String(!wallMode()));
    btnWall.setAttribute('aria-pressed', String(wallMode()));
    btnConfirm.classList.toggle('hidden', !(mine && wallMode() && pending && pending.valid));
    view.setTurn(over() ? null : p);

    if (over()) { shell.setTurn(state.winner, { over: true, label: winTitle(state.winner) }); shell.setHint(''); return; }

    let label = null;
    if (state.gameMode === 'ai') label = p === state.aiPlayer ? 'AI\'s turn' : 'Your turn';
    if (state.gameMode === 'online') label = p === state.myRole ? 'Your turn' : `${NAME[p]}'s turn`;
    shell.setTurn(p, { label, mine: isMyTurn() });

    if (flash) return shell.setHint(flash);
    if (state.gameMode === 'online' && !net.opponentConnected) return shell.setHint('Waiting for your opponent to join...');
    if (aiThinking) return shell.setHint('The AI is thinking...');
    if (!isMyTurn()) return shell.setHint(state.gameMode === 'online' ? 'Waiting for your opponent\'s move...' : '');
    if (wallMode()) {
        return shell.setHint(coarse
            ? (pending ? (pending.valid ? 'Tap Place wall to confirm, or drag to move it' : 'Drag the wall to a free spot') : 'Drag on the board to aim your wall')
            : 'Click to place the wall · R or scroll rotates · Esc cancels');
    }
    shell.setHint(noWalls ? `${verb} a dot to move. No walls left` : `${verb} a dot to move, or place a wall`);
}

function showMoves() {
    if (canAct() && !wallMode()) view.showTargets(board.getValidMoves(board.pawns[state.currentPlayer]));
    else view.clearTargets();
}

function flashHint(text) {
    flash = text;
    refresh();
    const mine = text;
    setTimeout(() => { if (flash === mine) { flash = null; refresh(); } }, 1600);
}

/* ---------- Modes ---------- */
function enterMove() {
    setMode('move');
    pending = null;
    view.hideGhost();
    showMoves();
    refresh();
}

function enterWall() {
    if (!canAct() || board.wallCounts[state.currentPlayer] <= 0) return;
    setMode(`wall-${orient}`);
    pending = null;
    view.clearTargets();
    refresh();
}

function rotate() {
    if (!wallMode()) return;
    orient = orient === 'H' ? 'V' : 'H';
    setMode(`wall-${orient}`);
    if (pending) aim(pending.wx, pending.wy, true);
    else if (lastHover) aim(lastHover.wx, lastHover.wy, false);
    refresh();
}

function wallValidity(wx, wy, o) {
    const conflict = board.wallConflict(wx, wy, o);
    if (conflict) return { valid: false, reason: 'Walls cannot overlap or cross' };
    if (!board.isValidWallPlacement(wx, wy, o)) return { valid: false, reason: 'That wall would close every path to the goal' };
    return { valid: true };
}

/** Preview a wall; when keep is true it becomes the pending (touch) choice. */
function aim(wx, wy, keep) {
    const v = wallValidity(wx, wy, orient);
    view.showGhost(wx, wy, orient, v.valid);
    if (keep) pending = { wx, wy, o: orient, valid: v.valid, reason: v.reason };
    return v;
}

/* ---------- Playing ---------- */
async function moveMine(to) {
    const player = state.currentPlayer;
    const gen = state.gen;
    if (!tryMovePawn(to.x, to.y)) return;
    if (state.gameMode === 'online') {
        shell.netSend({ type: 'move', x: to.x, y: to.y });
        if (state.winner) shell.netSend({ type: 'win', winner: state.winner });
    }
    view.clearTargets();
    animating = true;
    refresh();
    await view.hopPawn(player, to);
    animating = false;
    if (gen === state.gen) afterMove();
}

async function placeMine(wx, wy, o) {
    const player = state.currentPlayer;
    const v = wallValidity(wx, wy, o);
    if (!v.valid) { flashHint(v.reason); return; }
    const gen = state.gen;
    if (!tryPlaceWall(wx, wy, o)) return;
    if (state.gameMode === 'online') shell.netSend({ type: 'wall', wx, wy, orientation: o });
    pending = null;
    view.hideGhost();
    animating = true;
    refresh();
    await view.flyWall(player, wx, wy, o);
    animating = false;
    if (gen === state.gen) afterMove();
}

function afterMove() {
    pending = null;
    view.hideGhost();
    if (over()) {
        view.clearTargets();
        if (state.gameMode !== 'online') {
            state.scores[state.winner]++;
            state.startingPlayer = state.startingPlayer === 'A' ? 'B' : 'A';
        }
        refresh();
        const gen = state.gen;
        view.cheer(state.winner);
        wait(1000).then(() => { if (gen === state.gen) shell.showWin({ winner: state.winner, title: winTitle(state.winner), sub: 'Reached the other side' }); });
        return;
    }
    refresh();
    showMoves();
    maybeAI();
}

/* ---------- AI ---------- */
function snapshot() {
    return { walls: [...board.walls], wallOwners: board.wallOwners, wallCounts: board.wallCounts, pawns: board.pawns };
}

async function maybeAI() {
    if (state.gameMode !== 'ai' || over() || state.currentPlayer !== state.aiPlayer || aiThinking) return;
    const gen = state.gen;
    aiThinking = true;
    refresh();
    const action = await ai.think({ ...snapshot(), player: state.aiPlayer, difficulty: state.difficulty }, 650);
    aiThinking = false;
    if (gen !== state.gen || state.gameMode !== 'ai' || state.currentPlayer !== state.aiPlayer || over() || !action) { refresh(); return; }
    await applyAction(state.aiPlayer, action, () => action.type === 'move' ? tryMovePawn(action.x, action.y) : tryPlaceWall(action.wx, action.wy, action.orientation));
}

/** Apply an AI or remote action to the board, animate it, then hand over the turn. */
async function applyAction(player, action, apply) {
    const gen = state.gen;
    if (!apply()) { refresh(); return; }
    animating = true;
    refresh();
    if (action.type === 'move') await view.hopPawn(player, { x: action.x, y: action.y });
    else await view.flyWall(player, action.wx, action.wy, action.orientation);
    animating = false;
    if (gen === state.gen) afterMove();
}

/* ---------- New game ---------- */
function startNewGame({ silent = false } = {}) {
    resetGame();
    animating = false;
    aiThinking = false;
    pending = null;
    flash = null;
    orient = 'H';
    setMode('move');
    view.hideGhost();
    view.placePawns(board.pawns);
    view.resetWalls(board);
    shell.hideWin();
    refresh();
    if (silent) { view.clearTargets(); return; }
    showMoves();
    maybeAI();
}

/* ---------- Pointer ---------- */
let lastHover = null;
const TOUCH_LIFT = 56;   // aim above the finger so the wall stays visible

bindPointer(view.canvas, {
    hover(e) {
        if (!canAct()) { view.canvas.style.cursor = 'default'; return; }
        if (wallMode()) {
            const s = view.slotAt(e.clientX, e.clientY);
            lastHover = s;
            if (s) aim(s.wx, s.wy, false); else view.hideGhost();
            view.canvas.style.cursor = s ? 'pointer' : 'default';
            return;
        }
        const c = view.cellAt(e.clientX, e.clientY);
        const ok = c && board.getValidMoves(board.pawns[state.currentPlayer]).some(m => m.x === c.x && m.y === c.y);
        view.canvas.style.cursor = ok ? 'pointer' : 'default';
    },
    leave() { if (wallMode() && !pending) view.hideGhost(); lastHover = null; },
    down(e) {
        if (!canAct() || !wallMode() || e.pointerType === 'mouse') return;
        const s = view.slotAt(e.clientX, e.clientY - TOUCH_LIFT);
        if (s) { aim(s.wx, s.wy, true); refresh(); }
    },
    drag(e) {
        if (!canAct() || !wallMode() || e.pointerType === 'mouse') return;
        const s = view.slotAt(e.clientX, e.clientY - TOUCH_LIFT);
        if (s && (!pending || s.wx !== pending.wx || s.wy !== pending.wy)) { aim(s.wx, s.wy, true); refresh(); }
    },
    tap(e, d) {
        if (!canAct()) return;
        if (wallMode()) {
            if (d.type === 'mouse') {
                const s = view.slotAt(e.clientX, e.clientY);
                if (s) placeMine(s.wx, s.wy, orient);
            }
            return;   // touch: aiming happens on down/drag, confirming with the button
        }
        const c = view.cellAt(e.clientX, e.clientY);
        if (!c) return;
        const ok = board.getValidMoves(board.pawns[state.currentPlayer]).some(m => m.x === c.x && m.y === c.y);
        if (ok) moveMine(c);
    },
});

view.canvas.addEventListener('wheel', e => {
    if (!canAct() || !wallMode()) return;
    e.preventDefault();
    rotate();
}, { passive: false });

/* ---------- Buttons + keyboard ---------- */
btnMove.addEventListener('click', () => { if (canAct()) enterMove(); });
btnWall.addEventListener('click', () => { if (wallMode()) enterMove(); else enterWall(); });
btnRotate.addEventListener('click', rotate);
btnConfirm.addEventListener('click', () => { if (pending && canAct()) placeMine(pending.wx, pending.wy, pending.o); });

document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || shell.isDialogOpen() || !canAct()) return;
    if (e.target.closest && e.target.closest('input')) return;
    const k = e.key.toLowerCase();
    if (k === 'w') { wallMode() ? enterMove() : enterWall(); e.preventDefault(); }
    else if (k === 'm' || e.key === 'Escape') { if (wallMode()) { enterMove(); e.preventDefault(); } }
    else if (k === 'r') { rotate(); e.preventDefault(); }
    else if (e.key === 'Enter' && pending && pending.valid) { placeMine(pending.wx, pending.wy, pending.o); e.preventDefault(); }
});

/* ---------- Network ---------- */
shell.onNet('move', msg => { if (!over()) applyAction(state.currentPlayer, msg, () => applyRemoteMove(msg)); });
shell.onNet('wall', msg => { if (!over()) applyAction(state.currentPlayer, { ...msg, type: 'wall' }, () => applyRemoteMove(msg)); });
shell.onNet('reset', () => startNewGame());
shell.onNet('score', ({ scores, nextStarter }) => { state.scores = scores; if (nextStarter) state.startingPlayer = nextStarter; refresh(); });
shell.onNet('state_sync', ({ moves }) => {
    replayMoves(moves);
    view.placePawns(board.pawns);
    view.resetWalls(board);
    refresh();
    showMoves();
});

view.placePawns(board.pawns);
view.resetWalls(board);
refresh();
