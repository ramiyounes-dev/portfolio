/* Dots and Boxes AI. Easy: grabs a box half the time, otherwise random. Medium: always takes boxes, avoids drawing
   a box's third side, with occasional slips. Hard: never slips; when every line gives something away, it gives the
   smallest chain (measured by simulating the opponent's greedy captures). */
import { think, pick, best } from './common.js';

function edges(v) {
    const out = [];
    v.h.forEach((o, i) => { if (!o) out.push({ kind: 'h', r: Math.floor(i / v.C), c: i % v.C }); });
    v.v.forEach((o, i) => { if (!o) out.push({ kind: 'v', r: Math.floor(i / (v.C + 1)), c: i % (v.C + 1) }); });
    return out;
}
const sides = (b, r, c) => [b.h[r * b.C + c], b.h[(r + 1) * b.C + c], b.v[r * (b.C + 1) + c], b.v[r * (b.C + 1) + c + 1]].filter(Boolean).length;
function boxesOf(b, e) {
    const out = [];
    if (e.kind === 'h') { if (e.r > 0) out.push([e.r - 1, e.c]); if (e.r < b.R) out.push([e.r, e.c]); }
    else { if (e.c > 0) out.push([e.r, e.c - 1]); if (e.c < b.C) out.push([e.r, e.c]); }
    return out;
}
function drawn(b, e) {
    const h = b.h.slice(), v = b.v.slice();
    if (e.kind === 'h') h[e.r * b.C + e.c] = 'x'; else v[e.r * (b.C + 1) + e.c] = 'x';
    return { R: b.R, C: b.C, h, v };
}
const completes = (b, e) => boxesOf(b, e).filter(([r, c]) => sides(b, r, c) === 3).length;
const givesAway = (b, e) => boxesOf(b, e).some(([r, c]) => sides(b, r, c) === 2);

/** Boxes the opponent collects by greedily completing everything after edge e. */
function handout(b, e) {
    let s = drawn(b, e), total = 0, guard = 0;
    for (;;) {
        const take = edges(s).find(x => completes(s, x));
        if (!take || guard++ > 200) return total;
        total += completes(s, take);
        s = drawn(s, take);
    }
}

export function chooseEdge(v, difficulty, rng) {
    const free = edges(v);
    const caps = free.filter(e => completes(v, e));
    if (difficulty === 'easy') return caps.length && rng() < 0.5 ? pick(rng, caps) : pick(rng, free);
    if (caps.length) return best(rng, caps, e => completes(v, e) * 10 - (givesAway(v, e) ? 1 : 0));
    const safe = free.filter(e => !givesAway(v, e));
    if (difficulty === 'medium' && rng() < 0.15) return pick(rng, free);
    if (safe.length) return pick(rng, safe);
    return best(rng, free, e => -handout(v, e));
}

export default {
    decide(v, me, ctx) {
        if (v.turn !== me) return null;
        const key = v.h.join() + v.v.join();
        if (ctx.memory.key !== key) { ctx.memory.key = key; ctx.memory.plan = chooseEdge(v, ctx.difficulty, ctx.rng); }
        return { action: ctx.memory.plan, delay: think(ctx.rng, 450, 1200) };
    },
};
