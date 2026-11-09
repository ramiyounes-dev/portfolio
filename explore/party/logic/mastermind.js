/* Mastermind (Bulls and Cows): one Codemaker per round, every Codebreaker plays in parallel on a private board. */
import { lowestScore, finish } from '../core/helpers.js';

const CODE_MS = 45_000;
const REVEAL_MS = 7000;

/** Standard feedback: black = right colour right place, white = right colour wrong place (duplicates counted properly). */
export function feedback(code, guess) {
    let black = 0;
    const cc = {}, gc = {};
    for (let i = 0; i < code.length; i++) {
        if (code[i] === guess[i]) black++;
        else { cc[code[i]] = (cc[code[i]] || 0) + 1; gc[guess[i]] = (gc[guess[i]] || 0) + 1; }
    }
    let white = 0;
    for (const k of Object.keys(gc)) white += Math.min(gc[k], cc[k] || 0);
    return { black, white };
}

export function validCode(code, len, colors, dupes) {
    if (!Array.isArray(code) || code.length !== len) return false;
    if (!code.every(c => Number.isInteger(c) && c >= 0 && c < colors)) return false;
    return dupes || new Set(code).size === code.length;
}

export function randomCode(len, colors, dupes, rng) {
    if (dupes) return Array.from({ length: len }, () => rng.int(colors));
    return rng.shuffle([...Array(colors).keys()]).slice(0, len);
}

function breakers(s) { return s.players.filter(id => id !== s.maker && s.inRound.includes(id)); }

function startRound(s, ctx) {
    for (const id of s.pending) {
        if (!s.players.includes(id)) { s.scores[id] = lowestScore(s.scores, s.players); s.players.push(id); s.late.push(id); }
    }
    s.pending = [];
    s.round++;
    s.maker = s.players.find(id => !s.makers.includes(id)) || s.players[(s.round - 1) % s.players.length];
    s.makers.push(s.maker);
    s.inRound = [...s.players];
    s.code = null;
    s.boards = {};
    s.firstCrack = null;
    s.result = null;
    for (const id of breakers(s)) s.boards[id] = { guesses: [], solved: false, out: false };
    s.phase = 'code';
    s.timerTotal = CODE_MS;
    s.deadline = ctx.now + CODE_MS;
}

function beginBreaking(s, code, ctx) {
    s.code = code;
    s.phase = 'break';
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function endRound(s, ctx) {
    const gains = {};
    for (const id of breakers(s)) {
        const b = s.boards[id];
        if (!b.solved) { s.scores[s.maker] += 1; gains[s.maker] = (gains[s.maker] || 0) + 1; }
    }
    s.result = { code: s.code, gains };
    s.phase = 'reveal';
    const done = s.totalRounds ? s.round >= s.totalRounds : s.players.every(id => s.makers.includes(id));
    if (done) { s.over = finish(s.scores, s.players); s.deadline = null; return; }
    s.timerTotal = REVEAL_MS;
    s.deadline = ctx.now + REVEAL_MS;
}

export default {
    id: 'mastermind',
    min: 2,
    max: 12,
    settings: [
        { key: 'length', type: 'select', def: '4', options: ['4', '5'] },
        { key: 'colors', type: 'select', def: '6', options: ['6', '8'] },
        { key: 'dupes', type: 'bool', def: true },
        { key: 'maxGuesses', type: 'int', def: 10, min: 6, max: 12 },
        { key: 'rounds', type: 'int', def: 0, min: 0, max: 12, zero: 'opt.rounds.0' },
        { key: 'timer', type: 'int', unit: 's', def: 240, min: 0, max: 600, step: 30 },
    ],

    setup(ctx) {
        const s = {
            players: [...ctx.players], scores: Object.fromEntries(ctx.players.map(id => [id, 0])),
            pending: [], late: [], makers: [], round: 0,
            len: Number(ctx.settings.length), colors: Number(ctx.settings.colors), dupes: ctx.settings.dupes,
            maxGuesses: ctx.settings.maxGuesses, totalRounds: ctx.settings.rounds || 0,
        };
        startRound(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over) return { error: 'illegal' };
        if (s.phase === 'code') {
            if (pid !== s.maker) return { error: 'not_your_turn' };
            const code = a.random ? randomCode(s.len, s.colors, s.dupes, ctx.rng) : a.code;
            if (!validCode(code, s.len, s.colors, s.dupes)) return { error: s.dupes ? 'illegal' : 'mm.noDupes' };
            beginBreaking(s, code.map(Number), ctx);
            return {};
        }
        if (s.phase !== 'break') return { error: 'illegal' };
        const b = s.boards[pid];
        if (!b || b.solved || b.out) return { error: 'not_your_turn' };
        if (!validCode(a.guess, s.len, s.colors, true)) return { error: 'illegal' };
        const fb = feedback(s.code, a.guess);
        b.guesses.push({ guess: a.guess.map(Number), ...fb });
        if (fb.black === s.len) {
            b.solved = true;
            let pts = 11 - b.guesses.length;
            if (!s.firstCrack) { s.firstCrack = pid; pts += 2; }
            b.pts = pts;
            s.scores[pid] += pts;
        } else if (b.guesses.length >= s.maxGuesses) b.out = true;
        if (breakers(s).every(id => s.boards[id].solved || s.boards[id].out || ctx.isAway(id))) endRound(s, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'code') beginBreaking(s, randomCode(s.len, s.colors, s.dupes, ctx.rng), ctx);
        else if (s.phase === 'break') endRound(s, ctx);
        else startRound(s, ctx);
    },

    join(s, pid) { if (!s.players.includes(pid) && !s.pending.includes(pid)) s.pending.push(pid); },
    awaiting: s => {
        if (s.over) return [];
        if (s.phase === 'code') return [s.maker];
        if (s.phase === 'break') return breakers(s).filter(id => !s.boards[id].solved && !s.boards[id].out);
        return [];
    },
    seated: s => s.players,

    view(s, pid) {
        const reveal = s.phase === 'reveal';
        const progress = {};
        for (const id of Object.keys(s.boards)) {
            const b = s.boards[id];
            progress[id] = { n: b.guesses.length, solved: b.solved, out: b.out, pts: b.pts || 0 };
        }
        return {
            phase: s.phase, round: s.round, totalRounds: s.totalRounds, maker: s.maker,
            players: s.players, scores: s.scores, pending: s.pending, late: s.late,
            len: s.len, colors: s.colors, dupes: s.dupes, maxGuesses: s.maxGuesses,
            code: reveal || pid === s.maker ? s.code : null,
            mine: s.boards[pid] || null,                                   // only your own guesses
            boards: reveal ? s.boards : null,                              // everyone's boards after the round
            progress, firstCrack: s.firstCrack, result: s.result,
            deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
