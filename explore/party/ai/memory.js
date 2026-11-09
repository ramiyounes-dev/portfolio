/* Memory AI: it only "sees" cards when they are face up for everybody, and remembers each one with a chance
   that depends on the level (Easy 30%, Medium 65%, Hard 100%). Seen-but-forgotten cards are as good as new. */
import { think, pick } from './common.js';

const RECALL = { easy: 0.3, medium: 0.65, hard: 1 };

export default {
    observe(v, me, ctx) {
        const mem = ctx.memory;
        mem.known = mem.known || {};
        mem.seen = mem.seen || {};
        v.cards.forEach((face, i) => {
            if (v.matched[i]) { delete mem.known[i]; return; }
            if (face && !mem.seen[i + ':' + face + ':' + v.flipped.join()]) {
                mem.seen[i + ':' + face + ':' + v.flipped.join()] = true;
                if (ctx.rng() < (RECALL[ctx.difficulty] ?? 0.65)) mem.known[i] = face;
                else if (mem.known[i] !== face) delete mem.known[i];
            }
        });
    },
    decide(v, me, ctx) {
        if (v.phase !== 'pick' || v.turn !== me) return null;
        const mem = ctx.memory;
        const key = v.flipped.join() + '|' + v.matched.filter(Boolean).length;
        if (mem.planKey !== key) {
            mem.planKey = key;
            mem.plan = choose(v, mem.known || {}, ctx.rng);
        }
        return { action: { card: mem.plan }, delay: think(ctx.rng, 600, 1300) };
    },
};

export function choose(v, known, rng) {
    const open = v.cards.map((_, i) => i).filter(i => !v.matched[i] && !v.flipped.includes(i));
    const unknown = open.filter(i => known[i] === undefined);
    if (v.flipped.length === 1) {
        const face = v.cards[v.flipped[0]];
        const match = open.find(i => known[i] === face);
        if (match !== undefined) return match;
        return unknown.length ? pick(rng, unknown) : pick(rng, open);
    }
    // a pair we already know?
    const byFace = {};
    for (const i of open) if (known[i] !== undefined) (byFace[known[i]] = byFace[known[i]] || []).push(i);
    const pair = Object.values(byFace).find(l => l.length >= 2);
    if (pair) return pair[0];
    return unknown.length ? pick(rng, unknown) : pick(rng, open);
}
