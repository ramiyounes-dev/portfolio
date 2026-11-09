/* Hangman: one Word Setter per round (or random words), guessers take turns. Accent-insensitive letters, accented display. */
import { lowestScore, finish, nextInOrder } from '../core/helpers.js';
import { fold, foldLetter } from '../core/text.js';

const SET_MS = 45_000;
const END_MS = 4500;
const MAX_STREAK = 3;

export function pickWord(words, difficulty, rng) {
    const pool = words.filter(w => {
        const n = fold(w).length;
        if (n < 3 || n > 20) return false;
        return difficulty === 'easy' ? n <= 6 : difficulty === 'hard' ? n >= 8 : true;
    });
    return rng.pick(pool.length ? pool : words);
}

/** A valid custom word: letters only (accents allowed), 3 to 20 letters. */
export function validWord(w) {
    const s = String(w || '').trim();
    if (!/^[\p{L}]+$/u.test(s)) return false;
    const n = fold(s).length;
    return n >= 3 && n <= 20 && n === [...s].length;
}

/** Display mask: real characters where revealed, null elsewhere. */
export function mask(word, guessed) {
    return [...word].map(ch => (guessed.includes(fold(ch)) ? ch : null));
}

const hiddenCount = (word, guessed) => mask(word, guessed).filter(c => c === null).length;

function guessers(s) { return s.players.filter(id => id !== s.setter); }

function setTurnTimer(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function startRound(s, ctx) {
    for (const id of s.pending) {
        if (!s.players.includes(id)) { s.scores[id] = lowestScore(s.scores, s.players); s.players.push(id); s.late.push(id); }
    }
    s.pending = [];
    s.round++;
    s.word = null;
    s.guessed = [];
    s.wrongLetters = [];
    s.wrong = 0;
    s.solvedBy = null;
    s.result = null;
    s.streak = 0;
    s.lastGuess = null;
    if (s.randomOnly) {
        s.setter = null;
        beginGuessing(s, pickWord(ctx.words, s.difficulty, ctx.rng), ctx);
    } else {
        // Next setter: first player in join order who has not set a word yet
        s.setter = s.players.find(id => !s.setters.includes(id)) || s.players[(s.round - 1) % s.players.length];
        s.setters.push(s.setter);
        s.phase = 'setword';
        s.turn = s.setter;
        s.timerTotal = SET_MS;
        s.deadline = ctx.now + SET_MS;
    }
}

function beginGuessing(s, word, ctx) {
    s.word = word;
    s.phase = 'guess';
    const g = guessers(s);
    s.turn = g[(s.round - 1) % g.length] || g[0];
    s.streak = 0;
    setTurnTimer(s, ctx);
}

function passTurn(s, ctx) {
    s.streak = 0;
    const g = guessers(s);
    s.turn = nextInOrder(g, s.turn, id => ctx.isAway(id) && g.some(x => !ctx.isAway(x))) || g[0];
    setTurnTimer(s, ctx);
}

function endRound(s, ctx, solved) {
    if (!solved && s.setter) s.scores[s.setter] += 5;
    s.result = { solved, word: s.word, by: s.solvedBy };
    s.phase = 'roundEnd';
    s.turn = null;
    const done = s.totalRounds ? s.round >= s.totalRounds : s.players.every(id => s.setters.includes(id));
    if (done) {
        s.over = finish(s.scores, s.players);
        s.deadline = null;
        return;
    }
    s.timerTotal = END_MS;
    s.deadline = ctx.now + END_MS;
}

export default {
    id: 'hangman',
    min: 2,
    max: 12,
    settings: [
        { key: 'rounds', type: 'int', def: 0, min: 0, max: 20, zero: 'opt.rounds.0' },
        { key: 'maxWrong', type: 'int', def: 6, min: 4, max: 10 },
        { key: 'randomOnly', type: 'bool', def: false },
        { key: 'difficulty', type: 'select', def: 'any', options: ['easy', 'any', 'hard'] },
        { key: 'timer', type: 'int', unit: 's', def: 25, min: 0, max: 60, step: 5 },
    ],

    setup(ctx) {
        const s = {
            players: [...ctx.players], scores: Object.fromEntries(ctx.players.map(id => [id, 0])),
            pending: [], late: [], setters: [], round: 0,
            randomOnly: ctx.settings.randomOnly, difficulty: ctx.settings.difficulty, maxWrong: ctx.settings.maxWrong,
            totalRounds: ctx.settings.rounds || (ctx.settings.randomOnly ? ctx.players.length : 0),
        };
        startRound(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over) return { error: 'illegal' };
        if (s.phase === 'setword') {
            if (pid !== s.setter) return { error: 'not_your_turn' };
            if (a.random) { beginGuessing(s, pickWord(ctx.words, s.difficulty, ctx.rng), ctx); return {}; }
            const w = String(a.word || '').trim();
            if (!validWord(w)) return { error: 'hm.badWord' };
            beginGuessing(s, w.toLowerCase(), ctx);
            return {};
        }
        if (s.phase !== 'guess') return { error: 'illegal' };
        if (pid !== s.turn) return { error: 'not_your_turn' };

        if (a.solve !== undefined) {
            const attempt = fold(a.solve);
            if (!attempt) return { error: 'illegal' };
            s.lastGuess = { pid, solve: String(a.solve).slice(0, 24), ok: attempt === fold(s.word) };
            if (s.lastGuess.ok) {
                s.scores[pid] += 5 + hiddenCount(s.word, s.guessed);
                s.guessed = [...new Set(fold(s.word).split(''))];
                s.solvedBy = pid;
                endRound(s, ctx, true);
            } else {
                s.wrong = Math.min(s.maxWrong, s.wrong + 2);
                if (s.wrong >= s.maxWrong) endRound(s, ctx, false); else passTurn(s, ctx);
            }
            return {};
        }

        const L = foldLetter(a.letter);
        if (!L) return { error: 'illegal' };
        if (s.guessed.includes(L) || s.wrongLetters.includes(L)) return { error: 'hm.already' };
        const hits = [...fold(s.word)].filter(c => c === L).length;
        s.lastGuess = { pid, letter: L, hits };
        if (hits) {
            s.guessed.push(L);
            s.scores[pid] += hits;
            if (!hiddenCount(s.word, s.guessed)) { s.solvedBy = pid; endRound(s, ctx, true); return {}; }
            s.streak++;
            if (s.streak >= MAX_STREAK) passTurn(s, ctx); else setTurnTimer(s, ctx);
        } else {
            s.wrongLetters.push(L);
            s.wrong++;
            if (s.wrong >= s.maxWrong) endRound(s, ctx, false); else passTurn(s, ctx);
        }
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'setword') beginGuessing(s, pickWord(ctx.words, s.difficulty, ctx.rng), ctx);
        else if (s.phase === 'guess') passTurn(s, ctx);
        else if (s.phase === 'roundEnd') startRound(s, ctx);
    },

    join(s, pid) { if (!s.players.includes(pid) && !s.pending.includes(pid)) s.pending.push(pid); },
    awaiting: s => ((s.phase === 'setword' || s.phase === 'guess') && !s.over ? [s.turn] : []),
    seated: s => s.players,

    view(s, pid) {
        const reveal = s.phase === 'roundEnd' || pid === s.setter;
        return {
            phase: s.phase, round: s.round, totalRounds: s.totalRounds, setter: s.setter, turn: s.turn,
            players: s.players, scores: s.scores, pending: s.pending, late: s.late,
            mask: s.word ? mask(s.word, s.guessed) : null, length: s.word ? [...s.word].length : 0,
            word: reveal ? s.word : null,
            guessed: s.guessed, wrongLetters: s.wrongLetters, wrong: s.wrong, maxWrong: s.maxWrong,
            streak: s.streak, lastGuess: s.lastGuess, result: s.result,
            deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
