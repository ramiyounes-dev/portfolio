/* Nim AI. Easy: random take. Medium: perfect play half of the time. Hard: perfect play
   (nim-sum 0; in misère, switches to leaving an odd number of single matches at the end). */
import { think, pick } from './common.js';

const allMoves = piles => piles.flatMap((p, i) => Array.from({ length: p }, (_, k) => ({ pile: i, take: k + 1 })));

/** The winning move for a position, or null when every move loses against perfect play. */
export function perfectMove(piles, misere) {
    const big = piles.filter(p => p > 1).length;
    if (misere && big <= 1) {
        // Endgame: leave an odd number of 1-piles for the opponent
        const ones = piles.filter(p => p === 1).length;
        if (big === 1) {
            const i = piles.findIndex(p => p > 1);
            return { pile: i, take: ones % 2 ? piles[i] : piles[i] - 1 };
        }
        return ones % 2 ? { pile: piles.findIndex(p => p === 1), take: 1 } : null;
    }
    const x = piles.reduce((a, b) => a ^ b, 0);
    if (!x) return null;
    for (let i = 0; i < piles.length; i++) {
        const target = piles[i] ^ x;
        if (target < piles[i]) {
            // in misère, never leave only single matches by accident (handled above when big <= 1)
            return { pile: i, take: piles[i] - target };
        }
    }
    return null;
}

export function chooseTake(v, difficulty, rng) {
    const moves = allMoves(v.piles);
    const smart = difficulty === 'hard' || (difficulty === 'medium' && rng() < 0.5);
    if (smart) {
        const m = perfectMove(v.piles, v.mode !== 'normal');
        if (m) return m;
        // losing position: take a single match to keep the game long and hope for a mistake
        const open = v.piles.map((p, i) => (p ? i : -1)).filter(i => i >= 0);
        return { pile: pick(rng, open), take: 1 };
    }
    return pick(rng, moves);
}

export default {
    decide(v, me, ctx) {
        if (v.phase !== 'play' || v.turn !== me) return null;
        if (!ctx.memory.plan || ctx.memory.planKey !== v.piles.join()) {
            ctx.memory.plan = chooseTake(v, ctx.difficulty, ctx.rng);
            ctx.memory.planKey = v.piles.join();
        }
        return { action: ctx.memory.plan, delay: think(ctx.rng) };
    },
};
