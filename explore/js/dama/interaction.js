/* Turkish Checkers (Dama): gameplay and input.
   Tap a piece, then a dot. Captures are mandatory and play step by step, with forced steps continuing on their own.
   The AI thinks in a worker; every move (yours, the AI's, your online opponent's) is animated before the next turn. */

import * as view from './main.js';
import { board, state, setGameMode, tryMove, applyRemoteMove, resetGame, replayMoves } from './game.js';
import { DamaBoard } from './Board.js';
import { computeAIMove } from './ai.js';
import { createShell, NAME } from '../shared/shell.js';
import { bindPointer, verb } from '../shared/pointer.js';
import { createAI } from '../shared/aiRunner.js';
import { wait } from '../shared/anim.js';
import { net } from '../network.js';

const ai = createAI(new URL('./ai.worker.js', import.meta.url), p => {
    const b = new DamaBoard(); b.grid = p.grid; return computeAIMove(b, p.player);
});

let animating = false;
let aiThinking = false;
let sel = null;   // { from, pos, kind: 'move'|'capture', options: [...], step }

const shell = createShell({
    roomPrefix: 'DM-',
    controls: {
        touch: [
            ['&#9758;', '<strong>Tap a piece</strong>, then tap a <strong>dot</strong> to move it'],
            ['&#9711;', 'Captures are <strong>mandatory</strong>: glowing pieces must capture, rings show where to land'],
            ['&#9813;', 'Reach the far row to become a <strong>King</strong> (two stacked pieces)'],
        ],
        mouse: [
            ['&#9758;', '<strong>Click a piece</strong>, then click a <strong>dot</strong> to move it'],
            ['&#9711;', 'Captures are <strong>mandatory</strong>: glowing pieces must capture, rings show where to land'],
            ['&#9813;', 'Reach the far row to become a <strong>King</strong>. <strong>Esc</strong> cancels a selection'],
        ],
    },
    onStart(mode) { setGameMode(mode); view.setSide('A'); startNewGame(); },
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
const key = p => `${p.row},${p.col}`;
const same = (a, b) => a && b && a.row === b.row && a.col === b.col;

function winTitle(w) {
    if (state.gameMode === 'ai') return w === state.aiPlayer ? 'The AI wins' : 'You win!';
    if (state.gameMode === 'online') return w === state.myRole ? 'You win!' : `${NAME[w]} wins`;
    return `${NAME[w]} wins!`;
}

/* ---------- HUD ---------- */
function refresh() {
    const p = state.currentPlayer;
    shell.setCounts(board.pieceCount('A'), board.pieceCount('B'));
    shell.setScores(state.scores);
    if (state.gameMode === 'ai') shell.setBadges('You', 'AI');
    else if (state.gameMode === 'online') shell.setBadges(state.myRole === 'A' ? 'You' : '', state.myRole === 'B' ? 'You' : '');
    else shell.setBadges('', '');

    if (over()) { shell.setTurn(state.winner, { over: true, label: winTitle(state.winner) }); shell.setHint(''); return; }

    let label = null;
    if (state.gameMode === 'ai') label = p === state.aiPlayer ? 'AI\'s turn' : 'Your turn';
    if (state.gameMode === 'online') label = p === state.myRole ? 'Your turn' : `${NAME[p]}'s turn`;
    shell.setTurn(p, { label });

    if (state.gameMode === 'online' && !net.opponentConnected) return shell.setHint('Waiting for your opponent to join...');
    if (aiThinking) return shell.setHint('The AI is thinking...');
    if (!isMyTurn()) return shell.setHint(state.gameMode === 'online' ? 'Waiting for your opponent\'s move...' : '');
    if (sel && sel.kind === 'capture' && sel.step > 0) return shell.setHint(`Keep capturing: ${verb.toLowerCase()} the next ring`);
    const legal = board.getLegalMoves(p);
    if (legal.type === 'capture') return shell.setHint(`Capture is mandatory: ${verb.toLowerCase()} a glowing piece`);
    shell.setHint(`${verb} a piece, then a dot to move it`);
}

/* ---------- Selection ---------- */
function clearSelection() {
    sel = null;
    view.lift(null);
    view.clearTargets();
}

/** At the start of my turn: make the pieces that must capture glow; auto-pick if only one can. */
function prepareTurn() {
    clearSelection();
    view.glow([]);
    if (!canAct()) return;
    const legal = board.getLegalMoves(state.currentPlayer);
    if (legal.type !== 'capture') return;
    const fromKeys = [...new Set(legal.moves.map(m => key(m.from)))];
    view.glow(fromKeys.map(k => { const [row, col] = k.split(',').map(Number); return { row, col }; }));
    if (fromKeys.length === 1) select(legal.moves[0].from);
}

function select(pos) {
    const legal = board.getLegalMoves(state.currentPlayer);
    const options = legal.moves.filter(m => same(m.from, pos));
    if (!options.length) return false;
    sel = { from: pos, pos, kind: legal.type, options, step: 0 };
    view.lift(pos);
    showStep();
    return true;
}

function showStep() {
    view.clearTargets();
    if (!sel) return;
    if (sel.kind === 'move') {
        view.showTargets(sel.options.map(m => m.to), false);
    } else {
        const seen = new Map();
        for (const s of sel.options) seen.set(key(s.path[sel.step]), s.path[sel.step]);
        view.showTargets([...seen.values()], true);
        const threats = new Map();
        for (const s of sel.options) threats.set(key(s.captured[sel.step]), s.captured[sel.step]);
        view.showThreats([...threats.values()]);
    }
    refresh();
}

/* ---------- Input ---------- */
async function onCell(cell) {
    if (!canAct() || !cell) return;

    // A target of the current selection?
    if (sel) {
        if (sel.kind === 'move') {
            const move = sel.options.find(m => same(m.to, cell));
            if (move) return playMine(move);
        } else {
            const matching = sel.options.filter(s => same(s.path[sel.step], cell));
            if (matching.length) return captureStep(matching, cell);
            if (sel.step > 0) return;   // mid-capture: only the rings are valid
        }
    }

    const piece = board.grid[cell.row][cell.col];
    if (piece && piece.player === state.currentPlayer) {
        if (sel && same(sel.from, cell)) { clearSelection(); refresh(); return; }
        clearSelection();
        if (!select(cell)) refresh();
        return;
    }
    clearSelection();
    refresh();
}

async function playMine(move) {
    const wasKing = board.grid[move.from.row][move.from.col].king;
    clearSelection();
    view.glow([]);
    animating = true;
    const gen = state.gen;
    tryMove(move);
    if (state.gameMode === 'online') {
        shell.netSend({ type: 'move', move });
        if (state.winner) shell.netSend({ type: 'win', winner: state.winner });
    }
    await view.hop(move.from, move.to);
    if (!wasKing && board.grid[move.to.row][move.to.col]?.king) await view.promote(move.to);
    animating = false;
    if (gen !== state.gen) return;
    view.markLast([move.from, move.to]);
    afterMove();
}

async function captureStep(matching, cell) {
    const from = sel.pos;
    const captured = matching[0].captured[sel.step];
    sel.options = matching;
    sel.step++;
    sel.pos = cell;
    view.clearTargets();
    animating = true;
    const gen = state.gen;
    await Promise.all([view.hop(from, cell), wait(170).then(() => view.capture(captured))]);
    animating = false;
    if (gen !== state.gen) return;

    const seq = matching[0];
    if (sel.step >= seq.path.length) {
        // Full sequence done: commit it to the board in one move
        const origin = sel.from;
        const wasKing = board.grid[origin.row][origin.col].king;
        const final = seq.path[seq.path.length - 1];
        sel = null;
        view.lift(null);
        tryMove(seq);
        if (state.gameMode === 'online') {
            shell.netSend({ type: 'move', move: seq });
            if (state.winner) shell.netSend({ type: 'win', winner: state.winner });
        }
        if (!wasKing && board.grid[final.row]?.[final.col]?.king) { animating = true; await view.promote(final); animating = false; }
        if (gen !== state.gen) return;
        view.markLast([origin, final]);
        afterMove();
        return;
    }

    // Forced continuation: every remaining sequence takes the same next square
    const nexts = new Set(sel.options.map(s => key(s.path[sel.step])));
    if (nexts.size === 1) {
        await wait(140);
        if (gen !== state.gen || !sel) return;
        return captureStep(sel.options, sel.options[0].path[sel.step]);
    }
    showStep();
}

/** Animate a whole move (AI or remote) that is already applied to the board. */
async function animateMove(move, wasKing) {
    if (move.captured && move.captured.length) {
        let at = move.from;
        for (let i = 0; i < move.path.length; i++) {
            await Promise.all([view.hop(at, move.path[i]), wait(170).then(() => view.capture(move.captured[i]))]);
            at = move.path[i];
        }
        const final = move.path[move.path.length - 1];
        if (!wasKing && board.grid[final.row]?.[final.col]?.king) await view.promote(final);
        view.markLast([move.from, final]);
    } else {
        await view.hop(move.from, move.to);
        if (!wasKing && board.grid[move.to.row]?.[move.to.col]?.king) await view.promote(move.to);
        view.markLast([move.from, move.to]);
    }
}

function afterMove() {
    if (over()) {
        clearSelection();
        view.glow([]);
        if (state.gameMode !== 'online') {
            state.scores[state.winner]++;
            state.startingPlayer = state.startingPlayer === 'A' ? 'B' : 'A';
        }
        refresh();
        const loser = state.winner === 'A' ? 'B' : 'A';
        const sub = board.pieceCount(loser) === 0 ? 'Every piece captured' : 'No legal moves left';
        const gen = state.gen;
        wait(900).then(() => { if (gen === state.gen) shell.showWin({ winner: state.winner, title: winTitle(state.winner), sub }); });
        return;
    }
    refresh();
    prepareTurn();
    refresh();
    maybeAI();
}

/* ---------- AI ---------- */
async function maybeAI() {
    if (state.gameMode !== 'ai' || over() || state.currentPlayer !== state.aiPlayer || aiThinking) return;
    const gen = state.gen;
    aiThinking = true;
    refresh();
    const move = await ai.think({ grid: board.grid, player: state.aiPlayer }, 600);
    aiThinking = false;
    if (gen !== state.gen || state.gameMode !== 'ai' || state.currentPlayer !== state.aiPlayer || over() || !move) { refresh(); return; }
    const wasKing = board.grid[move.from.row][move.from.col].king;
    animating = true;
    tryMove(move);
    refresh();
    await animateMove(move, wasKing);
    animating = false;
    if (gen !== state.gen) return;
    afterMove();
}

/* ---------- New game ---------- */
function startNewGame({ silent = false } = {}) {
    resetGame();
    animating = false;
    aiThinking = false;
    clearSelection();
    view.glow([]);
    view.markLast(null);
    view.rebuild(board.grid);
    shell.hideWin();
    refresh();
    if (silent) return;
    prepareTurn();
    refresh();
    maybeAI();
}

/* ---------- Pointer ---------- */
bindPointer(view.canvas, {
    tap(e) { onCell(view.cellAt(e.clientX, e.clientY)); },
    hover(e) {
        const c = view.cellAt(e.clientX, e.clientY);
        let pointer = false;
        if (c && canAct()) {
            const p = board.grid[c.row][c.col];
            if (p && p.player === state.currentPlayer) pointer = true;
            if (sel) {
                if (sel.kind === 'move' && sel.options.some(m => same(m.to, c))) pointer = true;
                if (sel.kind === 'capture' && sel.options.some(s => same(s.path[sel.step], c))) pointer = true;
            }
        }
        view.canvas.style.cursor = pointer ? 'pointer' : 'default';
    },
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sel && sel.step === 0 && canAct() && !shell.isDialogOpen()) { prepareTurn(); refresh(); }
});

/* ---------- Network ---------- */
shell.onNet('move', async ({ move }) => {
    if (over()) return;
    const wasKing = board.grid[move.from.row]?.[move.from.col]?.king;
    const gen = state.gen;
    animating = true;
    if (!applyRemoteMove(move)) { animating = false; return; }
    await animateMove(move, wasKing);
    animating = false;
    if (gen !== state.gen) return;
    afterMove();
});
shell.onNet('reset', () => startNewGame());
shell.onNet('score', ({ scores, nextStarter }) => { state.scores = scores; if (nextStarter) state.startingPlayer = nextStarter; refresh(); });
shell.onNet('state_sync', ({ moves }) => {
    replayMoves(moves);
    clearSelection();
    view.rebuild(board.grid);
    refresh();
    prepareTurn();
    refresh();
});

view.rebuild(board.grid);
refresh();
