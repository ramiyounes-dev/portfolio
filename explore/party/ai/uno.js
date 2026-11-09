/* UNO AI (sees its own hand and the public card counts only).
   Easy: random legal card, often forgets to call UNO, slow to catch others.
   Medium: matches colour, keeps wilds for later, usually calls UNO.
   Hard: attacks a player close to going out (Skip / Reverse / Draw), plays its longest colour, keeps Wild Draw Four
   for when nothing else fits (so a challenge fails), always calls UNO and catches quickly. */
import { COLORS } from '../logic/uno.js';
import { think, pick, best } from './common.js';

const FORGET = { easy: 0.45, medium: 0.12, hard: 0 };
const CATCH = { easy: [0.35, 2600, 4200], medium: [0.75, 1300, 2600], hard: [1, 600, 1300] };

function bestColor(hand, rng) {
    const n = Object.fromEntries(COLORS.map(c => [c, 0]));
    for (const c of hand) if (n[c.c] !== undefined) n[c.c]++;
    return best(rng, COLORS, c => n[c]);
}
function nextPlayer(v, me) {
    const i = v.order.indexOf(me);
    return v.order[(i + v.dir + v.order.length) % v.order.length];
}

export function chooseCard(v, me, difficulty, rng) {
    const hand = v.mine;
    const playable = hand.filter(c => v.playable.includes(c.id));
    if (!playable.length) return null;
    if (difficulty === 'easy') return pick(rng, playable);
    const colourCount = c => hand.filter(x => x.c === c).length;
    const threat = (v.counts[nextPlayer(v, me)] || 9) <= 2;
    return best(rng, playable, c => {
        let s = 0;
        const wild = c.v === 'W' || c.v === 'W4';
        if (wild) s -= c.v === 'W4' ? 40 : 25;                  // keep wilds
        else s += colourCount(c.c) * 3;                         // play the long colour
        if (['S', 'R', 'D'].includes(c.v)) s += difficulty === 'hard' && threat ? 30 : 4;
        if (c.v === 'W4' && difficulty === 'hard' && threat) s += 50;
        if (!wild && /^\d$/.test(c.v)) s += Number(c.v) * 0.5; // dump high numbers (they cost points)
        return s;
    });
}

export default {
    reactive: true,
    decide(v, me, ctx) {
        if (!v.mine || v.phase === 'handEnd' || v.result) return null;
        const mem = ctx.memory;
        // Catch a player who forgot to call UNO (anyone may do it)
        if (v.vulnerable && v.vulnerable !== me) {
            const key = 'catch:' + v.vulnerable + ':' + v.log.length;
            if (mem.catchKey !== key) { mem.catchKey = key; const [p] = CATCH[ctx.difficulty] || CATCH.medium; mem.willCatch = ctx.rng() < p; }
            if (mem.willCatch) { const [, lo, hi] = CATCH[ctx.difficulty] || CATCH.medium; return { action: { catch: v.vulnerable }, delay: think(ctx.rng, lo, hi) }; }
        }
        if (v.turn !== me) return null;
        if (v.needColor) return { action: { color: bestColor(v.mine, ctx.rng) }, delay: think(ctx.rng, 400, 900) };
        if (v.phase === 'challenge') {
            const p = { easy: 0, medium: 0.25, hard: 0.4 }[ctx.difficulty] ?? 0.25;
            if (mem.chKey !== v.log.length) { mem.chKey = v.log.length; mem.ch = ctx.rng() < p; }
            return { action: mem.ch ? { challenge: true } : { accept: true }, delay: think(ctx.rng) };
        }
        // Call UNO before playing the second-to-last card
        if (v.mine.length === 2 && !(v.unoSafe && v.unoSafe[me]) && v.playable.length) {
            const key = 'uno:' + v.log.length;
            if (mem.unoKey !== key) { mem.unoKey = key; mem.forget = ctx.rng() < (FORGET[ctx.difficulty] ?? 0.12); }
            if (!mem.forget) return { action: { uno: true }, delay: think(ctx.rng, 300, 700) };
        }
        const key = v.log.length + ':' + v.mine.map(c => c.id).join() + ':' + v.drawn;
        if (mem.key !== key) {
            mem.key = key;
            const card = chooseCard(v, me, ctx.difficulty, ctx.rng);
            if (!card) mem.plan = v.drawn !== null ? { pass: true } : { draw: true };
            else mem.plan = card.v === 'W' || card.v === 'W4' ? { card: card.id, color: bestColor(v.mine.filter(c => c.id !== card.id), ctx.rng) } : { card: card.id };
        }
        return { action: mem.plan, delay: think(ctx.rng, 700, 1500) };
    },
};
