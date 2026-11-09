/* Connect 4: gameplay and input.
   Turn flow is explicit: a disc falls, the result is checked, then the next player (or the AI) moves.
   The AI thinks in a worker, so the page never freezes and input stays responsive. */

import * as view from './main.js';
import { board, state, setGameMode, tryDrop, applyRemoteDrop, resetGame, replayMoves } from './game.js';
import { Connect4Board } from './Board.js';
import { computeAIMove } from './ai.js';
import { createShell, NAME } from '../shared/shell.js';
import howto from '../../party/howto/connect4.js';
import { bindPointer, coarse } from '../shared/pointer.js';
import { createAI } from '../shared/aiRunner.js';
import { wait } from '../shared/anim.js';
import { net } from '../network.js';

const ai = createAI(new URL('./ai.worker.js', import.meta.url), p => {
    const b = new Connect4Board(); b.grid = p.grid; return computeAIMove(b, p.player, p.difficulty);
});

let falling = false;      // a disc is in the air
let aiThinking = false;
let cursorCol = 3;        // keyboard / touch-preview column

const shell = createShell({
    gameId: 'connect4',
    title: { en: 'Connect 4', fr: 'Puissance 4' },
    howto,
    onStart(mode, extra = {}) { state.difficulty = extra.difficulty || 'hard'; setGameMode(mode); startNewGame(); },
    onJoin(init) {
        setGameMode('online');
        state.myRole = init.role;
        state.scores = init.scores || { A: 0, B: 0 };
        state.startingPlayer = init.startingPlayer || 'A';
        startNewGame();
    },
    onReset() { startNewGame(); },
    onMenu() { setGameMode('local'); state.scores = { A: 0, B: 0 }; state.startingPlayer = 'A'; startNewGame({ silent: true }); },
    onOpponent() { refresh(); },
    refreshHint() { refresh(); },
});

/* ---------- Whose turn is it, and can I act? ---------- */
function over() { return !!(state.winner || state.draw); }

function isMyTurn() {
    if (over()) return false;
    if (state.gameMode === 'online') return net.opponentConnected && state.currentPlayer === net.myRole;
    if (state.gameMode === 'ai') return state.currentPlayer !== state.aiPlayer;
    return true;
}

function canAct() { return isMyTurn() && !falling && !shell.isDialogOpen(); }

/* ---------- HUD ---------- */
function refresh() {
    const p = state.currentPlayer;
    shell.setCounts(board.discCount('A'), board.discCount('B'));
    shell.setScores(state.scores);

    if (state.gameMode === 'ai') shell.setBadges('You', 'AI');
    else if (state.gameMode === 'online') shell.setBadges(state.myRole === 'A' ? 'You' : '', state.myRole === 'B' ? 'You' : '');
    else shell.setBadges('', '');

    if (state.draw) { shell.setTurn(p, { over: true, label: 'Draw' }); shell.setHint(''); return; }
    if (state.winner) { shell.setTurn(state.winner, { over: true, label: winTitle(state.winner) }); shell.setHint('Four in a row'); return; }

    let label = null;
    if (state.gameMode === 'ai') label = p === state.aiPlayer ? 'AI\'s turn' : 'Your turn';
    if (state.gameMode === 'online') label = p === state.myRole ? 'Your turn' : `${NAME[p]}'s turn`;
    shell.setTurn(p, { label, mine: isMyTurn() });

    if (state.gameMode === 'online' && !net.opponentConnected) shell.setHint('Waiting for your opponent to join...');
    else if (aiThinking) shell.setHint('The AI is thinking...');
    else if (!isMyTurn()) shell.setHint(state.gameMode === 'online' ? 'Waiting for your opponent\'s move...' : '');
    else shell.setHint(coarse ? 'Tap a column, or slide and release to drop' : 'Click a column · ← → then Enter · keys 1 to 7');
}

function winTitle(w) {
    if (state.gameMode === 'ai') return w === state.aiPlayer ? 'The AI wins' : 'You win!';
    if (state.gameMode === 'online') return w === state.myRole ? 'You win!' : `${NAME[w]} wins`;
    return `${NAME[w]} wins!`;
}

/* ---------- Playing a disc ---------- */
async function play(col, source) {
    if (falling || over()) return;
    const player = state.currentPlayer;
    const res = source === 'remote' ? applyRemoteDrop(col) : tryDrop(col);
    if (!res.ok) return;

    if (source === 'me' && state.gameMode === 'online') {
        shell.netSend({ type: 'drop', col });
        if (state.winner) shell.netSend({ type: 'win', winner: state.winner });
        if (state.draw) shell.netSend({ type: 'draw' });
    }

    const gen = state.gen;
    falling = true;
    view.setGhost(-1);
    view.markLast(null);
    shell.setHint('');
    await view.drop(res.row, res.col, player);
    falling = false;
    if (gen !== state.gen) return;   // the game was reset mid-fall
    view.markLast({ row: res.row, col: res.col });
    afterMove();
}

function afterMove() {
    if (state.winner) {
        const cells = board.getWinningCells();
        if (cells) view.showWin(cells);
        if (state.gameMode !== 'online') {
            state.scores[state.winner]++;
            state.startingPlayer = state.startingPlayer === 'A' ? 'B' : 'A';
        }
        refresh();
        const gen = state.gen;
        wait(1300).then(() => { if (gen === state.gen) shell.showWin({ winner: state.winner, title: winTitle(state.winner), sub: 'Four in a row' }); });
        return;
    }
    if (state.draw) {
        refresh();
        wait(700).then(() => shell.showWin({ winner: '', title: 'Draw', sub: 'The board is full' }));
        return;
    }
    refresh();
    maybeAI();
    if (canAct() && !coarse && hoverCol >= 0) view.setGhost(hoverCol, state.currentPlayer);
}

/* ---------- AI ---------- */
async function maybeAI() {
    if (state.gameMode !== 'ai' || over() || state.currentPlayer !== state.aiPlayer || aiThinking) return;
    const gen = state.gen;
    aiThinking = true;
    refresh();
    const col = await ai.think({ grid: board.grid, player: state.aiPlayer, difficulty: state.difficulty });
    aiThinking = false;
    if (gen !== state.gen || state.gameMode !== 'ai' || state.currentPlayer !== state.aiPlayer || over()) { refresh(); return; }
    if (col === null || col === undefined) return;
    await play(col, 'ai');
}

/* ---------- New game ---------- */
async function startNewGame({ silent = false } = {}) {
    resetGame();                 // bumps gen: cancels a pending AI reply or a falling disc's follow-up
    falling = false;
    aiThinking = false;
    view.setGhost(-1);
    shell.hideWin();
    refresh();
    await view.clearAll();
    if (silent) return;
    refresh();
    maybeAI();
}

/* ---------- Pointer: hover/click on desktop, tap or slide-and-release on touch ---------- */
let hoverCol = -1;
let pressCol = -1;

function validCol(c) { return c >= 0 && board.getValidColumns().includes(c); }

bindPointer(view.canvas, {
    hover(e) {
        hoverCol = view.colAt(e.clientX, e.clientY);
        view.setGhost(canAct() && validCol(hoverCol) ? hoverCol : -1, state.currentPlayer);
        view.canvas.style.cursor = canAct() && validCol(hoverCol) ? 'pointer' : 'default';
    },
    leave() { hoverCol = -1; view.setGhost(-1); },
    down(e) {
        if (!canAct()) return;
        pressCol = view.colAt(e.clientX, e.clientY);
        view.setGhost(validCol(pressCol) ? pressCol : -1, state.currentPlayer);
    },
    drag(e) {
        if (!canAct()) return;
        pressCol = view.colAt(e.clientX, e.clientY);
        view.setGhost(validCol(pressCol) ? pressCol : -1, state.currentPlayer);
    },
    up(e) {
        if (!canAct()) { pressCol = -1; return; }
        const col = view.colAt(e.clientX, e.clientY);
        pressCol = -1;
        if (validCol(col)) { cursorCol = col; play(col, 'me'); }
        else view.setGhost(-1);
    },
    cancel() { pressCol = -1; view.setGhost(-1); },
});

/* ---------- Keyboard ---------- */
document.addEventListener('keydown', e => {
    if (!canAct() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input, button, a')) {
        if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    }
    const valid = board.getValidColumns();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const step = e.key === 'ArrowLeft' ? -1 : 1;
        let c = cursorCol;
        for (let i = 0; i < view.COLS; i++) { c = (c + step + view.COLS) % view.COLS; if (valid.includes(c)) break; }
        cursorCol = c;
        view.setGhost(c, state.currentPlayer);
        e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        if (valid.includes(cursorCol)) play(cursorCol, 'me');
        e.preventDefault();
    } else if (/^[1-7]$/.test(e.key)) {
        const c = Number(e.key) - 1;
        if (valid.includes(c)) { cursorCol = c; play(c, 'me'); }
    }
});

/* ---------- Network ---------- */
// The opponent may answer while our disc is still falling: wait for it to land, then play theirs
function remoteDrop(col, gen = state.gen) {
    if (gen !== state.gen) return;
    if (falling) { setTimeout(() => remoteDrop(col, gen), 80); return; }
    play(col, 'remote');
}
shell.onNet('drop', msg => remoteDrop(msg.col));
shell.onNet('reset', () => { startNewGame(); });
shell.onNet('score', ({ scores, nextStarter }) => { state.scores = scores; if (nextStarter) state.startingPlayer = nextStarter; refresh(); });
shell.onNet('state_sync', ({ moves }) => {
    replayMoves(moves);
    view.rebuild(board.grid);
    view.clearWin();
    if (state.winner) { const cells = board.getWinningCells(); if (cells) view.showWin(cells); }
    refresh();
});

refresh();
