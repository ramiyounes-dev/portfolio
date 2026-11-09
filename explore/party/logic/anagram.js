/* Anagram Race: everyone unscrambles the same word; first three correct answers score 3, 2, 1. */
import { lowestScore, finish } from '../core/helpers.js';
import { fold, letterKey } from '../core/text.js';

const END_MS = 4500;
const COOLDOWN_MS = 1000;
const POINTS = [3, 2, 1];

/** Shuffle letters until the result differs from the word (and from every other valid anagram when possible). */
export function scramble(folded, rng, avoid = new Set()) {
    if (new Set(folded).size < 2) return folded;
    let out = folded, tries = 0;
    do {
        out = rng.shuffle(folded.split('')).join('');
        tries++;
    } while ((out === folded || (avoid.has(out) && tries < 40)) && tries < 80);
    return out === folded ? folded.slice(1) + folded[0] : out;
}

/** Folded words with the same letters as `folded`, from the list. */
export function anagramsOf(words, folded) {
    const key = letterKey(folded);
    return [...new Set(words.map(fold).filter(w => w.length === folded.length && letterKey(w) === key))];
}

export function isAccepted(answer, target, words) {
    const a = fold(answer), t = fold(target);
    if (a === t) return true;
    if (a.length !== t.length || letterKey(a) !== letterKey(t)) return false;
    return words.some(w => fold(w) === a);
}

function pickWord(s, ctx) {
    const pool = ctx.words.filter(w => { const n = fold(w).length; return n >= s.minLen && n <= s.maxLen && !s.used.includes(w); });
    const w = ctx.rng.pick(pool.length ? pool : ctx.words.filter(x => fold(x).length >= 4));
    s.used.push(w);
    return w;
}

function startRound(s, ctx) {
    for (const id of s.pending) {
        if (!s.players.includes(id)) { s.scores[id] = lowestScore(s.scores, s.players); s.players.push(id); s.late.push(id); }
    }
    s.pending = [];
    s.round++;
    s.word = pickWord(s, ctx);
    const folded = fold(s.word);
    s.letters = scramble(folded, ctx.rng, new Set(anagramsOf(ctx.words, folded)));
    s.correct = [];          // [{ id, pts }]
    s.hints = {};
    s.tries = {};
    s.phase = 'guess';
    if (s.turns) { s.solverIdx = 0; s.times = {}; }
    const sec = ctx.settings.timer || 30;
    s.timerTotal = sec * 1000;
    s.deadline = ctx.now + sec * 1000;
}

/* Same-device variant: players solve the same letters one after another; fastest times score 3, 2, 1. */
function nextSolver(s, ctx) {
    s.solverIdx++;
    if (s.solverIdx >= s.players.length) {
        const ranked = s.players.filter(id => s.times[id] != null).sort((a, b) => s.times[a] - s.times[b]);
        s.correct = ranked.map((id, i) => ({ id, pts: (POINTS[i] || 0) / (s.hints[id] ? 2 : 1), answer: '' }));
        for (const c of s.correct) s.scores[c.id] += c.pts;
        endRound(s, ctx);
        return;
    }
    const sec = ctx.settings.timer || 30;
    s.timerTotal = sec * 1000;
    s.deadline = ctx.now + sec * 1000;
}

function endRound(s, ctx) {
    s.phase = 'roundEnd';
    s.reveal = { word: s.word, alts: anagramsOf(ctx.words, fold(s.word)).filter(w => w !== fold(s.word)) };
    if (s.round >= s.rounds) {
        s.over = finish(s.scores, s.players);
        s.deadline = null;
        return;
    }
    s.timerTotal = END_MS;
    s.deadline = ctx.now + END_MS;
}

export default {
    id: 'anagram',
    min: 2,
    max: 12,
    settings: [
        { key: 'rounds', type: 'int', def: 10, min: 3, max: 30 },
        { key: 'timer', type: 'int', unit: 's', def: 30, min: 10, max: 90, step: 5 },
        { key: 'minLen', type: 'int', def: 4, min: 4, max: 9 },
        { key: 'maxLen', type: 'int', def: 7, min: 4, max: 9 },
        { key: 'hints', type: 'bool', def: true },
        { key: 'turns', type: 'bool', def: false, hidden: true },
    ],

    setup(ctx) {
        const lo = Math.min(ctx.settings.minLen, ctx.settings.maxLen), hi = Math.max(ctx.settings.minLen, ctx.settings.maxLen);
        const s = {
            players: [...ctx.players], scores: Object.fromEntries(ctx.players.map(id => [id, 0])),
            pending: [], late: [], round: 0, rounds: ctx.settings.rounds, used: [],
            minLen: lo, maxLen: hi, hintsOn: ctx.settings.hints, turns: !!ctx.settings.turns,
        };
        startRound(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || s.phase !== 'guess') return { error: 'illegal' };
        if (!s.players.includes(pid)) return { error: 'not_your_turn' };
        if (s.turns && pid !== s.players[s.solverIdx]) return { error: 'not_your_turn' };
        if (s.correct.some(c => c.id === pid)) return { error: 'illegal' };
        if (a.hint) {
            if (!s.hintsOn || s.hints[pid]) return { error: 'illegal' };
            s.hints[pid] = true;
            return {};
        }
        const last = s.tries[pid] || 0;
        if (ctx.now - last < COOLDOWN_MS) return { error: 'cooldown' };
        s.tries[pid] = ctx.now;
        if (!isAccepted(a.answer, s.word, ctx.words)) return { private: 'ana.wrong', quiet: true };
        if (s.turns) {
            s.times[pid] = Math.max(0, s.timerTotal - (s.deadline - ctx.now));
            nextSolver(s, ctx);
            return {};
        }
        const base = POINTS[s.correct.length] || 0;
        const pts = s.hints[pid] ? base / 2 : base;
        s.correct.push({ id: pid, pts, answer: fold(a.answer) });
        s.scores[pid] += pts;
        if (s.players.every(id => s.correct.some(c => c.id === id) || ctx.isAway(id))) endRound(s, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'guess') { if (s.turns) nextSolver(s, ctx); else endRound(s, ctx); } else startRound(s, ctx);
    },

    join(s, pid) { if (!s.players.includes(pid) && !s.pending.includes(pid)) s.pending.push(pid); },
    awaiting: s => (s.phase === 'guess' && !s.over ? (s.turns ? [s.players[s.solverIdx]] : s.players.filter(id => !s.correct.some(c => c.id === id))) : []),
    seated: s => s.players,

    view(s, pid) {
        return {
            phase: s.phase, round: s.round, rounds: s.rounds, letters: s.letters, players: s.players, scores: s.scores,
            pending: s.pending, late: s.late, hintsOn: s.hintsOn,
            correct: s.correct.map(c => ({ id: c.id, pts: c.pts })), done: s.correct.some(c => c.id === pid),
            turns: s.turns, solver: s.turns && s.phase === 'guess' ? s.players[s.solverIdx] : null,
            times: s.turns && s.phase === 'roundEnd' ? s.times : null,
            hint: s.hints[pid] ? fold(s.word)[0] : null,
            reveal: s.phase === 'roundEnd' ? s.reveal : null,
            deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
