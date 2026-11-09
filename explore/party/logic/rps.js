/* Rock Paper Scissors (and Lizard Spock): secret simultaneous picks, revealed together. */
import { lowestScore, finish } from '../core/helpers.js';

export const CLASSIC = ['rock', 'paper', 'scissors'];
export const SPOCK = ['rock', 'paper', 'scissors', 'lizard', 'spock'];
const BEATS = {
    rock: ['scissors', 'lizard'],
    paper: ['rock', 'spock'],
    scissors: ['paper', 'lizard'],
    lizard: ['spock', 'paper'],
    spock: ['scissors', 'rock'],
};
export const beats = (a, b) => BEATS[a].includes(b);

/** Points for one round: { id: points }. */
export function scoreRound(picks, variant) {
    const ids = Object.keys(picks);
    const pts = Object.fromEntries(ids.map(id => [id, 0]));
    const kinds = new Set(Object.values(picks));
    if (kinds.size === 1) return pts;                                    // everyone chose the same
    if (variant === 'classic' && ids.length > 2 && kinds.size === 3) return pts;  // rock, paper and scissors all present
    for (const a of ids) for (const b of ids) if (a !== b && beats(picks[a], picks[b])) pts[a]++;
    return pts;
}

const REVEAL_MS = 3600;

function startRound(s, ctx) {
    // Late joiners take their seat at the round boundary, with the lowest current score
    for (const id of s.pending) {
        if (!s.players.includes(id)) {
            s.scores[id] = lowestScore(s.scores, s.players);
            s.players.push(id);
            s.late.push(id);
        }
    }
    s.pending = [];
    s.round++;
    s.picks = {};
    s.last = null;
    s.phase = 'choose';
    const sec = ctx.settings.timer || 10;
    s.timerTotal = sec * 1000;
    s.deadline = ctx.now + sec * 1000;
}

function reveal(s, ctx) {
    const options = s.variant === 'spock' ? SPOCK : CLASSIC;
    for (const id of s.players) if (!s.picks[id]) { s.picks[id] = ctx.rng.pick(options); s.auto = [...(s.auto || []), id]; }
    const pts = scoreRound(s.picks, s.variant === 'spock' ? 'spock' : 'classic');
    for (const id of s.players) s.scores[id] += pts[id];
    s.last = { picks: { ...s.picks }, pts, auto: s.auto || [] };
    s.auto = [];
    s.history.push({ round: s.round, picks: { ...s.picks }, pts });
    if (s.history.length > 30) s.history.shift();
    const duel = s.players.length === 2;
    const top = Math.max(...s.players.map(id => s.scores[id]));
    if ((duel && top >= s.target) || (!duel && s.round >= s.rounds)) {
        s.over = finish(s.scores, s.players);
        s.phase = 'reveal';
        s.deadline = null;
        return;
    }
    s.phase = 'reveal';
    s.timerTotal = REVEAL_MS;
    s.deadline = ctx.now + REVEAL_MS;
}

export default {
    id: 'rps',
    min: 2,
    max: 12,
    settings: [
        { key: 'variant', type: 'select', def: 'classic', options: ['classic', 'spock'] },
        { key: 'target', type: 'int', def: 5, min: 1, max: 15 },
        { key: 'rounds', type: 'int', def: 10, min: 3, max: 30 },
        { key: 'timer', type: 'int', unit: 's', def: 10, min: 5, max: 30, step: 5 },
    ],

    setup(ctx) {
        const s = {
            players: [...ctx.players], scores: Object.fromEntries(ctx.players.map(id => [id, 0])),
            pending: [], late: [], round: 0, history: [],
            variant: ctx.settings.variant, target: ctx.settings.target, rounds: ctx.settings.rounds,
        };
        startRound(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || s.phase !== 'choose') return { error: 'illegal' };
        if (!s.players.includes(pid)) return { error: 'not_your_turn' };
        const options = s.variant === 'spock' ? SPOCK : CLASSIC;
        if (!options.includes(a.pick)) return { error: 'illegal' };
        s.picks[pid] = a.pick;
        // Everyone present has chosen: reveal now (away players get a random pick)
        if (s.players.every(id => s.picks[id] || ctx.isAway(id))) reveal(s, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'choose') reveal(s, ctx);
        else startRound(s, ctx);
    },

    join(s, pid) {
        if (!s.players.includes(pid) && !s.pending.includes(pid)) s.pending.push(pid);
    },

    awaiting: s => (s.phase === 'choose' && !s.over ? s.players.filter(id => !s.picks[id]) : []),
    seated: s => s.players,

    view(s, pid) {
        const v = {
            phase: s.phase, round: s.round, rounds: s.rounds, target: s.target, variant: s.variant,
            duel: s.players.length === 2, players: s.players, scores: s.scores, pending: s.pending, late: s.late,
            chosen: s.players.filter(id => s.picks[id]), deadline: s.deadline, timerTotal: s.timerTotal,
            mine: s.picks[pid] || null, last: s.phase === 'reveal' ? s.last : null,
        };
        return v;
    },
};
