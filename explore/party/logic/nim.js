/* Nim: take any number of matches from one pile. Misère (last match loses) or normal (last match wins). Series of N games. */
import { lowestScore, finish, nextInOrder } from '../core/helpers.js';

export const PRESETS = { classic: [1, 3, 5, 7], small: [3, 4, 5], big: [2, 4, 6, 8, 10] };
const BETWEEN_MS = 3200;

export function makePiles(preset, rng) {
    if (preset === 'random') {
        const n = 3 + rng.int(3);
        return Array.from({ length: n }, () => 1 + rng.int(9));
    }
    return [...(PRESETS[preset] || PRESETS.classic)];
}

/** Points for the end of one game. */
export function gamePoints(players, taker, mode) {
    const pts = Object.fromEntries(players.map(id => [id, 0]));
    if (players.length === 2) {
        const winner = mode === 'normal' ? taker : players.find(id => id !== taker);
        pts[winner] = 1;
    } else if (mode === 'normal') {
        pts[taker] = 2;
    } else {
        for (const id of players) if (id !== taker) pts[id] = 1;
    }
    return pts;
}

function setTurnTimer(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function startGame(s, ctx) {
    for (const id of s.pending) {
        if (!s.players.includes(id)) { s.scores[id] = lowestScore(s.scores, s.players); s.players.push(id); s.late.push(id); }
    }
    s.pending = [];
    s.game++;
    s.piles = makePiles(s.preset, ctx.rng);
    s.starter = s.game === 1 ? s.players[0] : (nextInOrder(s.players, s.starter) || s.players[0]);
    s.turn = s.starter;
    s.result = null;
    s.lastMove = null;
    s.phase = 'play';
    setTurnTimer(s, ctx);
}

function take(s, pid, pile, n, ctx) {
    s.piles[pile] -= n;
    s.lastMove = { pid, pile, take: n };
    if (s.piles.every(p => p === 0)) {
        const pts = gamePoints(s.players, pid, s.mode);
        for (const id of s.players) s.scores[id] += pts[id];
        s.result = { taker: pid, pts };
        s.turn = null;
        if (s.game >= s.games) {
            s.over = finish(s.scores, s.players);
            s.phase = 'between';
            s.deadline = null;
            return;
        }
        s.phase = 'between';
        s.timerTotal = BETWEEN_MS;
        s.deadline = ctx.now + BETWEEN_MS;
        return;
    }
    s.turn = nextInOrder(s.players, pid);
    setTurnTimer(s, ctx);
}

export default {
    id: 'nim',
    min: 2,
    max: 6,
    settings: [
        { key: 'preset', type: 'select', def: 'classic', options: ['classic', 'small', 'big', 'random'] },
        { key: 'mode', type: 'select', def: 'misere', options: ['misere', 'normal'] },
        { key: 'games', type: 'int', def: 5, min: 1, max: 15 },
        { key: 'timer', type: 'int', unit: 's', def: 25, min: 0, max: 90, step: 5 },
    ],

    setup(ctx) {
        const s = {
            players: [...ctx.players], scores: Object.fromEntries(ctx.players.map(id => [id, 0])),
            pending: [], late: [], game: 0, games: ctx.settings.games, mode: ctx.settings.mode, preset: ctx.settings.preset,
        };
        startGame(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || s.phase !== 'play') return { error: 'illegal' };
        if (pid !== s.turn) return { error: 'not_your_turn' };
        const pile = Number(a.pile), n = Number(a.take);
        if (!Number.isInteger(pile) || pile < 0 || pile >= s.piles.length) return { error: 'illegal' };
        if (!Number.isInteger(n) || n < 1 || n > s.piles[pile]) return { error: 'illegal' };
        take(s, pid, pile, n, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'between') { startGame(s, ctx); return; }
        const open = s.piles.map((p, i) => (p > 0 ? i : -1)).filter(i => i >= 0);
        take(s, s.turn, ctx.rng.pick(open), 1, ctx);
    },

    join(s, pid) { if (!s.players.includes(pid) && !s.pending.includes(pid) && s.players.length + s.pending.length < 6) s.pending.push(pid); },
    awaiting: s => (s.phase === 'play' && !s.over ? [s.turn] : []),
    seated: s => s.players,

    view(s) {
        return {
            phase: s.phase, piles: s.piles, turn: s.turn, players: s.players, scores: s.scores, pending: s.pending, late: s.late,
            game: s.game, games: s.games, mode: s.mode, lastMove: s.lastMove, result: s.result,
            deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
