/* Anagram Race AI: it really solves the letters (word-list lookup), but only after a human-like delay:
   Easy 15–25 s (and sometimes gives up), Medium 8–15 s, Hard 3–7 s; longer words take a little longer. */
import { anagramsOf } from '../logic/anagram.js';
import { pick } from './common.js';

const PACE = { easy: [15000, 25000], medium: [8000, 15000], hard: [3000, 7000] };

export default {
    decide(v, me, ctx) {
        if (v.phase !== 'guess' || v.done || !v.players.includes(me)) return null;
        if (v.turns && v.solver !== me) return null;
        const mem = ctx.memory;
        const key = v.round + ':' + v.letters;
        if (mem.key !== key) {
            mem.key = key;
            const sols = anagramsOf(ctx.words, v.letters);
            const [lo, hi] = PACE[ctx.difficulty] || PACE.medium;
            mem.answer = sols.length && !(ctx.difficulty === 'easy' && ctx.rng() < 0.2) ? pick(ctx.rng, sols) : null;
            mem.delay = (lo + ctx.rng() * (hi - lo)) * (1 + Math.max(0, v.letters.length - 6) * 0.08);
            mem.at = ctx.now;
        }
        if (!mem.answer) return null;
        const left = ctx.firing ? 0 : Math.max(80, mem.delay - (ctx.now - mem.at));
        return { action: { answer: mem.answer }, delay: left };
    },
};
