/* Prisoner's Dilemma: round-robin pairs, secret Cooperate / Betray, simultaneous reveal, public history. */
import { lowestScore, rank } from '../core/helpers.js';

export const PAYOFF = { CC: [3, 3], CB: [0, 5], BC: [5, 0], BB: [1, 1] };
const BYE = '__bye__';
const BYE_POINTS = 2;
const REVEAL_MS = 4200;

/** Circle-method round robin: pairs for round k. With an odd count, one player gets a bye. */
export function pairings(players, k) {
    const list = [...players];
    if (list.length % 2) list.push(BYE);
    const n = list.length;
    if (n < 2) return { pairs: [], bye: list[0] && list[0] !== BYE ? list[0] : null };
    const fixed = list[0];
    const rest = list.slice(1);
    const r = k % (n - 1);
    const rot = [...rest.slice(rest.length - r), ...rest.slice(0, rest.length - r)];
    const order = [fixed, ...rot];
    const pairs = [];
    let bye = null;
    for (let i = 0; i < n / 2; i++) {
        const a = order[i], b = order[n - 1 - i];
        if (a === BYE) bye = b; else if (b === BYE) bye = a; else pairs.push([a, b]);
    }
    return { pairs, bye };
}

function startRound(s, ctx) {
    for (const id of s.pending) {
        if (!s.players.includes(id)) { s.scores[id] = lowestScore(s.scores, s.players); s.players.push(id); s.late.push(id); }
    }
    s.pending = [];
    s.round++;
    const { pairs, bye } = pairings(s.players, s.round - 1);
    s.pairs = pairs;
    s.bye = bye;
    s.choices = {};
    s.chat = {};
    s.last = null;
    s.phase = 'choose';
    const sec = ctx.settings.timer || 20;
    s.timerTotal = sec * 1000;
    s.deadline = ctx.now + sec * 1000;
}

function partnerOf(s, id) {
    for (const [a, b] of s.pairs) { if (a === id) return b; if (b === id) return a; }
    return null;
}

function reveal(s, ctx) {
    const auto = [];
    for (const [a, b] of s.pairs) for (const id of [a, b]) if (!s.choices[id]) { s.choices[id] = ctx.rng() < 0.5 ? 'C' : 'B'; auto.push(id); }
    const rows = s.pairs.map(([a, b]) => {
        const [pa, pb] = PAYOFF[s.choices[a] + s.choices[b]];
        s.scores[a] += pa; s.scores[b] += pb;
        for (const id of [a, b]) { s.stats[id] = s.stats[id] || { c: 0, n: 0 }; s.stats[id].n++; if (s.choices[id] === 'C') s.stats[id].c++; }
        return { a, b, ca: s.choices[a], cb: s.choices[b], pa, pb };
    });
    if (s.bye) s.scores[s.bye] += BYE_POINTS;
    s.last = { round: s.round, rows, bye: s.bye, auto };
    s.history.push(s.last);
    if (s.history.length > 40) s.history.shift();
    s.phase = 'reveal';
    if (s.round >= s.rounds) {
        const ranking = rank(s.scores, s.players);
        for (const r of ranking) {
            const st = s.stats[r.id];
            r.coop = st && st.n ? Math.round((st.c / st.n) * 100) : null;
            r.label = `${r.score} · ${r.coop === null ? '-' : r.coop + '%'}`;
        }
        s.over = { ranking, winners: ranking.filter(r => r.rank === 1).map(r => r.id), note: 'pd.coopNote' };
        s.deadline = null;
        return;
    }
    s.timerTotal = REVEAL_MS;
    s.deadline = ctx.now + REVEAL_MS;
}

export default {
    id: 'dilemma',
    min: 2,
    max: 12,
    settings: [
        { key: 'rounds', type: 'int', def: 10, min: 3, max: 30 },
        { key: 'hideRounds', type: 'bool', def: false },
        { key: 'chat', type: 'bool', def: true },
        { key: 'timer', type: 'int', unit: 's', def: 20, min: 10, max: 60, step: 5 },
    ],

    setup(ctx) {
        const s = {
            players: [...ctx.players], scores: Object.fromEntries(ctx.players.map(id => [id, 0])), stats: {},
            pending: [], late: [], round: 0, history: [],
            rounds: ctx.settings.rounds, hideRounds: ctx.settings.hideRounds, chatOn: ctx.settings.chat,
        };
        startRound(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || s.phase !== 'choose') return { error: 'illegal' };
        const partner = partnerOf(s, pid);
        if (!partner) return { error: 'not_your_turn' };
        if (a.type === 'say') {
            if (!s.chatOn) return { error: 'illegal' };
            const text = String(a.text || '').replace(/[<>]/g, '').trim().slice(0, 80);
            if (!text) return { error: 'illegal' };
            const key = [pid, partner].sort().join('|');
            const log = s.chat[key] = s.chat[key] || [];
            if (log.length >= 30) return { error: 'illegal' };
            log.push({ from: pid, text });
            return {};
        }
        if (a.choice !== 'C' && a.choice !== 'B') return { error: 'illegal' };
        s.choices[pid] = a.choice;
        const everyone = s.pairs.flat();
        if (everyone.every(id => s.choices[id] || ctx.isAway(id))) reveal(s, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'choose') reveal(s, ctx); else startRound(s, ctx);
    },

    join(s, pid) { if (!s.players.includes(pid) && !s.pending.includes(pid)) s.pending.push(pid); },
    awaiting: s => (s.phase === 'choose' && !s.over ? s.pairs.flat().filter(id => !s.choices[id]) : []),
    seated: s => s.players,

    view(s, pid) {
        const partner = partnerOf(s, pid);
        const key = partner ? [pid, partner].sort().join('|') : null;
        return {
            phase: s.phase, round: s.round, rounds: s.hideRounds ? null : s.rounds,
            players: s.players, scores: s.scores, pending: s.pending, late: s.late,
            pairs: s.pairs, bye: s.bye, partner, mine: s.choices[pid] || null,
            chosen: s.pairs.flat().filter(id => s.choices[id]),
            chat: key ? (s.chat[key] || []) : [], chatOn: s.chatOn,
            last: s.phase === 'reveal' ? s.last : null,
            history: s.history.slice(-12),
            deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
