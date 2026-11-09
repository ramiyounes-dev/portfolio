/* Tic-Tac-Toe: best-of-N match between two seated players. Pure logic, shared by server, client and tests. */

export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

/** The winning line [a, b, c] on a 9-cell board, or null. */
export function winLine(cells) {
    for (const l of LINES) {
        const [a, b, c] = l;
        if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return l;
    }
    return null;
}

export const isFull = cells => cells.every(Boolean);

const BETWEEN_MS = 2600;

function newGame(s, ctx) {
    s.cells = Array(9).fill(null);
    s.line = null;
    s.result = null;
    s.phase = 'play';
    s.turn = s.x;
    setDeadline(s, ctx);
}

function setDeadline(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function endMatchIfDone(s) {
    const [a, b] = s.players;
    const need = Math.ceil(s.bestOf / 2);
    const capped = s.game >= s.bestOf + 4;              // a run of draws cannot go on forever
    if (s.wins[a] >= need || s.wins[b] >= need || capped) {
        const winners = s.wins[a] === s.wins[b] ? [] : [s.wins[a] > s.wins[b] ? a : b];
        const rows = [a, b].map(id => ({ id, score: s.wins[id] }));
        rows.sort((p, q) => q.score - p.score);
        rows.forEach((r, i) => { r.rank = i && r.score === rows[0].score ? 1 : i + 1; });
        s.over = { ranking: rows, winners };
        s.deadline = null;
        return true;
    }
    return false;
}

function place(s, pid, cell, ctx) {
    s.cells[cell] = pid === s.x ? 'X' : 'O';
    s.last = cell;
    const line = winLine(s.cells);
    if (line || isFull(s.cells)) {
        s.line = line;
        s.result = line ? { winner: pid } : { draw: true };
        if (line) s.wins[pid]++;
        s.phase = 'between';
        s.turn = null;
        s.timerTotal = BETWEEN_MS;
        s.deadline = ctx.now + BETWEEN_MS;
        endMatchIfDone(s);
        return;
    }
    s.turn = s.players.find(id => id !== pid);
    setDeadline(s, ctx);
}

export default {
    id: 'tictactoe',
    min: 2,
    max: 2,
    duel: true,
    settings: [
        { key: 'bestOf', type: 'int', def: 3, min: 1, max: 7, step: 2 },
        { key: 'timer', type: 'int', unit: 's', def: 20, min: 0, max: 60, step: 5 },
        { key: 'queueMode', type: 'select', def: 'winner', options: ['winner', 'rotate'] },
    ],

    setup(ctx) {
        const players = ctx.players.slice(0, 2);
        const s = {
            players, bestOf: ctx.settings.bestOf || 3, game: 1,
            wins: { [players[0]]: 0, [players[1]]: 0 },
            x: players[ctx.rng() < 0.5 ? 0 : 1],     // X is random for game 1, then alternates
        };
        newGame(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || s.phase !== 'play') return { error: 'illegal' };
        if (pid !== s.turn) return { error: 'not_your_turn' };
        const cell = Number(a.cell);
        if (!Number.isInteger(cell) || cell < 0 || cell > 8 || s.cells[cell]) return { error: 'illegal' };
        place(s, pid, cell, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'between') {
            s.game++;
            s.x = s.players.find(id => id !== s.x);
            newGame(s, ctx);
            return;
        }
        // Timer ran out (or the player is away): play a random empty square for them
        const empty = s.cells.map((c, i) => (c ? null : i)).filter(i => i !== null);
        if (empty.length) place(s, s.turn, ctx.rng.pick(empty), ctx);
    },

    awaiting: s => (s.phase === 'play' && !s.over ? [s.turn] : []),
    seated: s => s.players,

    view(s) {
        return {
            cells: s.cells, turn: s.turn, x: s.x, players: s.players, line: s.line, last: s.last,
            phase: s.phase, result: s.result, game: s.game, bestOf: s.bestOf,
            scores: s.wins, deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
