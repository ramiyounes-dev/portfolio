/* Mastermind AI. Codemaker: a random secret code. Codebreaker, using only its own feedback:
   Easy: often guesses at random, otherwise a guess consistent with the feedback.
   Medium: always a consistent guess. Hard: Knuth's minimax (worst-case partition) when the code space is small
   enough, else the consistent guess that best splits a sample of the remaining codes. */
import { feedback } from '../logic/mastermind.js';
import { think, pick } from './common.js';

export function allCodes(len, colors, dupes) {
    const out = [];
    const rec = pre => {
        if (pre.length === len) { out.push(pre); return; }
        for (let c = 0; c < colors; c++) if (dupes || !pre.includes(c)) rec([...pre, c]);
    };
    rec([]);
    return out;
}

export function consistent(codes, guesses) {
    return codes.filter(c => guesses.every(g => { const f = feedback(c, g.guess); return f.black === g.black && f.white === g.white; }));
}

function worstCase(guess, cands) {
    const parts = {};
    let worst = 0;
    for (const c of cands) { const f = feedback(c, guess); const k = f.black * 10 + f.white; parts[k] = (parts[k] || 0) + 1; if (parts[k] > worst) worst = parts[k]; }
    return worst;
}

export function chooseGuess(v, difficulty, rng, cache = {}) {
    const key = `${v.len}/${v.colors}/${v.dupes}`;
    if (cache.key !== key) { cache.key = key; cache.codes = allCodes(v.len, v.colors, v.dupes); }
    const guesses = (v.mine && v.mine.guesses) || [];
    const cands = consistent(cache.codes, guesses);
    if (!cands.length) return pick(rng, cache.codes);
    if (difficulty === 'easy' && rng() < 0.4) return pick(rng, cache.codes);
    if (difficulty !== 'hard' || cands.length === 1) return pick(rng, cands);
    if (!guesses.length && v.len === 4 && v.dupes) return [0, 0, 1, 1];
    const pool = cache.codes.length <= 1500 && cands.length <= 400 ? cache.codes : cands.slice(0, 200);
    const sample = cands.length > 300 ? cands.filter((_, i) => i % Math.ceil(cands.length / 300) === 0) : cands;
    let bestG = null, bestW = Infinity, bestIn = false;
    const candSet = new Set(cands.map(c => c.join()));
    for (const g of pool) {
        const w = worstCase(g, sample);
        const inSet = candSet.has(g.join());
        if (w < bestW || (w === bestW && inSet && !bestIn)) { bestW = w; bestG = g; bestIn = inSet; }
    }
    return bestG;
}

export default {
    decide(v, me, ctx) {
        const mem = ctx.memory;
        if (v.phase === 'code' && v.maker === me) return { action: { random: true }, delay: think(ctx.rng, 1200, 2500) };
        if (v.phase !== 'break' || !v.mine || v.mine.solved || v.mine.out) return null;
        const key = v.round + ':' + v.mine.guesses.length;
        if (mem.planKey !== key) { mem.planKey = key; mem.plan = chooseGuess(v, ctx.difficulty, ctx.rng, mem); }
        const pace = { easy: [6000, 12000], medium: [4000, 9000], hard: [3000, 7000] }[ctx.difficulty] || [4000, 9000];
        return { action: { guess: mem.plan }, delay: think(ctx.rng, ...pace) };
    },
};
