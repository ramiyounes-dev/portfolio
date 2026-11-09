/* Ultimate Tic-Tac-Toe: 9 small boards in a 3x3 big board. The square you play picks your opponent's next board. */
import { winLine } from './tictactoe.js';

/** Small board results: 'X' | 'O' | 'D' (full, no winner) | null (open). */
export function smallResult(cells, b) {
    const sub = cells.slice(b * 9, b * 9 + 9);
    const line = winLine(sub);
    if (line) return sub[line[0]];
    return sub.every(Boolean) ? 'D' : null;
}

/** Big-board line made of claimed small boards (draws never count). */
export function bigLine(small) {
    const marks = small.map(v => (v === 'X' || v === 'O' ? v : null));
    return winLine(marks);
}

/** Indexes (0..80) of every legal square. */
export function legalMoves(s) {
    const open = b => s.small[b] === null;
    const boards = s.next !== null && open(s.next) ? [s.next] : [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(open);
    const out = [];
    for (const b of boards) for (let i = 0; i < 9; i++) if (!s.cells[b * 9 + i]) out.push(b * 9 + i);
    return out;
}

export function playableBoards(s) {
    const open = b => s.small[b] === null;
    return s.next !== null && open(s.next) ? [s.next] : [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(open);
}

function setDeadline(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function counts(s) {
    const [a, b] = s.players;
    const markOf = id => (id === s.x ? 'X' : 'O');
    return { [a]: s.small.filter(v => v === markOf(a)).length, [b]: s.small.filter(v => v === markOf(b)).length };
}

function finish(s, winner, note) {
    const c = counts(s);
    const rows = s.players.map(id => ({ id, score: c[id] }));
    if (winner) rows.sort((p, q) => (p.id === winner ? -1 : q.id === winner ? 1 : 0));
    rows.forEach((r, i) => { r.rank = winner ? i + 1 : 1; r.label = String(r.score); });
    s.over = { ranking: rows, winners: winner ? [winner] : [], note };
    s.turn = null;
    s.deadline = null;
}

function play(s, pid, idx, ctx) {
    const mark = pid === s.x ? 'X' : 'O';
    s.cells[idx] = mark;
    s.last = idx;
    const b = Math.floor(idx / 9), i = idx % 9;
    if (s.small[b] === null) s.small[b] = smallResult(s.cells, b);
    const line = bigLine(s.small);
    if (line) { s.line = line; finish(s, pid, 'ut.byLine'); return; }
    s.next = s.small[i] === null ? i : null;
    const other = s.players.find(id => id !== pid);
    s.turn = other;
    if (!legalMoves(s).length) {
        // No moves left and no big line: draw, or most small boards (host setting)
        if (ctx.settings.tiebreak === 'boards') {
            const c = counts(s);
            const [a, z] = s.players;
            finish(s, c[a] === c[z] ? null : (c[a] > c[z] ? a : z), 'ut.byBoards');
        } else finish(s, null, 'ut.drawn');
        return;
    }
    setDeadline(s, ctx);
}

export default {
    id: 'ultimate',
    min: 2,
    max: 2,
    duel: true,
    settings: [
        { key: 'timer', type: 'int', unit: 's', def: 30, min: 0, max: 90, step: 5 },
        { key: 'tiebreak', type: 'select', def: 'draw', options: ['draw', 'boards'] },
        { key: 'queueMode', type: 'select', def: 'winner', options: ['winner', 'rotate'] },
    ],

    setup(ctx) {
        const players = ctx.players.slice(0, 2);
        const s = {
            players, cells: Array(81).fill(null), small: Array(9).fill(null),
            next: null, line: null, last: null,
            x: players[ctx.rng() < 0.5 ? 0 : 1],
        };
        s.turn = s.x;
        setDeadline(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over) return { error: 'illegal' };
        if (pid !== s.turn) return { error: 'not_your_turn' };
        const idx = Number(a.cell);
        if (!legalMoves(s).includes(idx)) return { error: 'illegal' };
        play(s, pid, idx, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        const moves = legalMoves(s);
        if (moves.length) play(s, s.turn, ctx.rng.pick(moves), ctx);
    },

    awaiting: s => (s.over ? [] : [s.turn]),
    seated: s => s.players,

    view(s) {
        return {
            cells: s.cells, small: s.small, playable: s.over ? [] : playableBoards(s), turn: s.turn, x: s.x,
            players: s.players, line: s.line, last: s.last, scores: counts(s), deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
