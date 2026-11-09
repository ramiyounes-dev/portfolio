/* Bullshit AI. Knows only its own hand, the public claims and the cards shown when someone is called.
   Easy: bluffs clumsily (random counts) and calls at random. Medium: honest when it can, bluffs one card,
   calls impossible claims and big claims sometimes. Hard: counts cards (its own, every card it put in the pile,
   revealed cards and who picked them up), calls certain lies always, and always challenges a last card. */
import { RANKS } from '../logic/cheat.js';
import { think, pick } from './common.js';

function track(v, me, mem) {
    mem.pile = mem.pile || [];           // cards this AI knows are in the pile
    mem.held = mem.held || {};           // pid -> { rank: n } known to be in that player's hand
    if (mem.game !== v.game) { mem.game = v.game; mem.pile = []; mem.held = {}; mem.seenReveal = null; }
    if (v.reveal && mem.seenReveal !== JSON.stringify(v.reveal)) {
        mem.seenReveal = JSON.stringify(v.reveal);
        const known = [...mem.pile, ...v.reveal.cards.filter(c => !mem.pile.some(p => p.id === c.id))];
        const h = (mem.held[v.reveal.loser] = mem.held[v.reveal.loser] || {});
        if (v.reveal.loser !== me) for (const c of known) h[c.r] = (h[c.r] || 0) + 1;
        mem.pile = [];
    }
    if (v.pileCount === 0 && !v.claim) mem.pile = [];
}

export function suspicion(v, me, mem, difficulty) {
    const c = v.claim;
    const copies = Object.values(v.counts).reduce((a, b) => a + b, 0) + v.pileCount > 52 ? 2 : 1;
    const mine = v.mine.filter(x => x.r === c.rank).length;
    const inPile = (mem.pile || []).filter(x => x.r === c.rank).length;
    let known = mine + (difficulty === 'hard' ? inPile : 0);
    if (difficulty === 'hard') for (const [pid, h] of Object.entries(mem.held || {})) if (pid !== c.pid && pid !== me) known += h[c.rank] || 0;
    const possible = 4 * copies - known;
    if (c.count > possible) return 1;                                   // certain lie
    if (v.counts[c.pid] === 0) return difficulty === 'hard' ? 0.95 : 0.6; // trying to go out
    const ratio = c.count / Math.max(1, possible);
    return Math.min(0.85, 0.08 + ratio * 0.55 + (c.count >= 3 ? 0.15 : 0));
}

export function choosePlay(v, me, difficulty, rng) {
    const hand = v.mine;
    const right = hand.filter(c => c.r === v.rank).slice(0, v.maxPlay);
    if (difficulty === 'easy') {
        if (right.length && rng() < 0.7) return right.map(c => c.id);
        const n = 1 + Math.floor(rng() * Math.min(v.maxPlay, hand.length));
        return rng.shuffle ? rng.shuffle([...hand]).slice(0, n).map(c => c.id) : hand.slice(0, n).map(c => c.id);
    }
    // the cards we will need the latest are the best bluff material
    const rIdx = RANKS.indexOf(v.rank);
    const distance = c => (RANKS.indexOf(c.r) - rIdx + 13) % 13;
    const junk = hand.filter(c => c.r !== v.rank).sort((a, b) => distance(b) - distance(a));
    if (right.length) {
        const extra = difficulty === 'hard' && right.length < v.maxPlay && junk.length && hand.length > 3 && rng() < 0.25 ? [junk[0]] : [];
        return [...right, ...extra].map(c => c.id);
    }
    return [junk[0].id];
}

export default {
    reactive: true,
    observe(v, me, ctx) { if (v.mine) track(v, me, ctx.memory); },
    decide(v, me, ctx) {
        if (!v.mine) return null;
        const mem = ctx.memory;
        if (v.phase === 'challenge' && v.claim && v.claim.pid !== me && !v.finished.includes(me)) {
            const key = 'ch:' + v.claim.pid + ':' + v.claim.rank + ':' + v.pileCount;
            if (mem.chKey !== key) {
                mem.chKey = key;
                const p = ctx.difficulty === 'easy' ? 0.15 : suspicion(v, me, mem, ctx.difficulty);
                mem.call = ctx.rng() < p;
            }
            return mem.call ? { action: { call: true }, delay: think(ctx.rng, 900, 3200) } : null;
        }
        if (v.phase !== 'play' || v.turn !== me) return null;
        const key = 'pl:' + v.rank + ':' + v.mine.length + ':' + v.pileCount;
        if (mem.plKey !== key) {
            mem.plKey = key;
            mem.plan = choosePlay(v, me, ctx.difficulty, ctx.rng);
        }
        if (ctx.firing) {
            for (const id of mem.plan) { const c = v.mine.find(x => x.id === id); if (c) mem.pile.push(c); }
        }
        return { action: { cards: mem.plan }, delay: think(ctx.rng, 800, 1700) };
    },
};
