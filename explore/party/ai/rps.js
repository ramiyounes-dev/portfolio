/* Rock Paper Scissors AI. Easy: uniform random. Medium: counters each opponent's most frequent pick.
   Hard: first-order Markov model of each opponent (what they play after what they played), mixed with
   20% randomness so it cannot be exploited. The AI only learns picks after they are revealed. */
import { CLASSIC, SPOCK, beats } from '../logic/rps.js';
import { think, pick, best } from './common.js';

function remember(v, me, mem) {
    if (v.phase !== 'reveal' || !v.last || mem.seen === v.round) return;
    mem.seen = v.round;
    mem.freq = mem.freq || {};
    mem.trans = mem.trans || {};
    mem.prev = mem.prev || {};
    for (const [id, p] of Object.entries(v.last.picks)) {
        if (id === me) continue;
        (mem.freq[id] = mem.freq[id] || {})[p] = (mem.freq[id][p] || 0) + 1;
        const before = mem.prev[id];
        if (before) { const t = (mem.trans[id] = mem.trans[id] || {}); (t[before] = t[before] || {})[p] = (t[before][p] || 0) + 1; }
        mem.prev[id] = p;
    }
}

/** Probability distribution of an opponent's next pick. */
function predict(mem, id, options, markov) {
    const table = markov && mem.prev && mem.trans && mem.trans[id] && mem.trans[id][mem.prev[id]];
    const counts = table || (mem.freq && mem.freq[id]) || {};
    const total = options.reduce((a, o) => a + (counts[o] || 0) + 1, 0);
    return Object.fromEntries(options.map(o => [o, ((counts[o] || 0) + 1) / total]));
}

export function choosePick(v, me, mem, difficulty, rng) {
    const options = v.variant === 'spock' ? SPOCK : CLASSIC;
    if (difficulty === 'easy' || (difficulty === 'hard' && rng() < 0.2) || !mem.freq) return pick(rng, options);
    const others = v.players.filter(id => id !== me);
    const dists = others.map(id => predict(mem, id, options, difficulty === 'hard'));
    return best(rng, options, o => dists.reduce((sum, d) => sum + options.reduce((s, q) => s + d[q] * (beats(o, q) ? 1 : beats(q, o) ? -1 : 0), 0), 0));
}

export default {
    observe(v, me, ctx) { remember(v, me, ctx.memory); },
    decide(v, me, ctx) {
        if (v.phase !== 'choose' || v.mine || !v.players.includes(me)) return null;
        if (!ctx.memory.plan || ctx.memory.planRound !== v.round) {
            ctx.memory.plan = choosePick(v, me, ctx.memory, ctx.difficulty, ctx.rng);
            ctx.memory.planRound = v.round;
        }
        return { action: { pick: ctx.memory.plan }, delay: think(ctx.rng, 700, 2200) };
    },
};
