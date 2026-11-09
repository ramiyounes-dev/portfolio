/* Reversi / Othello: place a disc that traps opponent lines; trapped discs flip. Most discs wins. */

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

export function initialBoard() {
    const b = Array(64).fill(null);
    b[27] = 'W'; b[28] = 'B'; b[35] = 'B'; b[36] = 'W';
    return b;
}

/** Discs flipped by playing `color` at idx (empty array = illegal). */
export function flipsFor(board, idx, color) {
    if (board[idx]) return [];
    const opp = color === 'B' ? 'W' : 'B';
    const r0 = Math.floor(idx / 8), c0 = idx % 8;
    const out = [];
    for (const [dr, dc] of DIRS) {
        const line = [];
        let r = r0 + dr, c = c0 + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === opp) { line.push(r * 8 + c); r += dr; c += dc; }
        if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === color) out.push(...line);
    }
    return out;
}

export function legalMoves(board, color) {
    const out = [];
    for (let i = 0; i < 64; i++) if (!board[i] && flipsFor(board, i, color).length) out.push(i);
    return out;
}

export const count = (board, color) => board.filter(x => x === color).length;

function setDeadline(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

const colorOf = (s, id) => (id === s.black ? 'B' : 'W');

function scores(s) { return { [s.black]: count(s.board, 'B'), [s.white]: count(s.board, 'W') }; }

function play(s, pid, idx, ctx) {
    const color = colorOf(s, pid);
    const flips = flipsFor(s.board, idx, color);
    s.board[idx] = color;
    for (const f of flips) s.board[f] = color;
    s.last = { idx, flips };
    s.passed = null;
    const other = pid === s.black ? s.white : s.black;
    if (legalMoves(s.board, colorOf(s, other)).length) { s.turn = other; setDeadline(s, ctx); return; }
    if (legalMoves(s.board, color).length) { s.passed = other; setDeadline(s, ctx); return; }   // opponent must pass
    // Neither can move: game over
    const sc = scores(s);
    const winner = sc[s.black] === sc[s.white] ? null : (sc[s.black] > sc[s.white] ? s.black : s.white);
    const rows = [s.black, s.white].map(id => ({ id, score: sc[id] })).sort((a, b) => b.score - a.score);
    rows.forEach((r, i) => { r.rank = winner ? i + 1 : 1; });
    s.over = { ranking: rows, winners: winner ? [winner] : [] };
    s.turn = null;
    s.deadline = null;
}

export default {
    id: 'reversi',
    min: 2,
    max: 2,
    duel: true,
    settings: [
        { key: 'showMoves', type: 'bool', def: true },
        { key: 'timer', type: 'int', unit: 's', def: 30, min: 0, max: 90, step: 5 },
        { key: 'queueMode', type: 'select', def: 'winner', options: ['winner', 'rotate'] },
    ],

    setup(ctx) {
        const players = ctx.players.slice(0, 2);
        const bi = ctx.rng() < 0.5 ? 0 : 1;
        const s = { players, black: players[bi], white: players[1 - bi], board: initialBoard(), last: null, passed: null, showMoves: ctx.settings.showMoves };
        s.turn = s.black;
        setDeadline(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over) return { error: 'illegal' };
        if (pid !== s.turn) return { error: 'not_your_turn' };
        const idx = Number(a.cell);
        if (!Number.isInteger(idx) || idx < 0 || idx > 63 || !flipsFor(s.board, idx, colorOf(s, pid)).length) return { error: 'illegal' };
        play(s, pid, idx, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        const moves = legalMoves(s.board, colorOf(s, s.turn));
        if (moves.length) play(s, s.turn, ctx.rng.pick(moves), ctx);
    },

    awaiting: s => (s.over ? [] : [s.turn]),
    seated: s => s.players,

    view(s) {
        return {
            board: s.board, turn: s.turn, black: s.black, white: s.white, players: s.players, last: s.last, passed: s.passed,
            legal: s.turn && s.showMoves ? legalMoves(s.board, colorOf(s, s.turn)) : [],
            scores: scores(s), deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
