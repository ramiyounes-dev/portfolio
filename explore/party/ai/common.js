/* Shared helpers for the client-side AI players.
   Every AI only receives the view its seat would get, so it can never read hidden information. */

/** Natural thinking time in ms (0.5–1.5 s by default). */
export const think = (rng, lo = 500, hi = 1500) => lo + rng() * (hi - lo);

/** With probability p (by difficulty) return true. */
export function chance(ctx, { easy = 0, medium = 0, hard = 0 }) {
    const p = { easy, medium, hard }[ctx.difficulty] ?? medium;
    return ctx.rng() < p;
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

/** Choose the best-scored option; ties broken at random. */
export function best(rng, items, score) {
    let top = -Infinity, out = [];
    for (const it of items) {
        const s = score(it);
        if (s > top + 1e-9) { top = s; out = [it]; } else if (Math.abs(s - top) <= 1e-9) out.push(it);
    }
    return out.length ? pick(rng, out) : null;
}

/** Plain minimax with alpha-beta for two-player zero-sum games. */
export function alphabeta(node, depth, alpha, beta, maxing, g) {
    if (depth === 0 || g.terminal(node)) return g.evaluate(node);
    const kids = g.children(node, maxing);
    if (!kids.length) return g.evaluate(node);
    if (maxing) {
        let v = -Infinity;
        for (const k of kids) { v = Math.max(v, alphabeta(k, depth - 1, alpha, beta, false, g)); alpha = Math.max(alpha, v); if (alpha >= beta) break; }
        return v;
    }
    let v = Infinity;
    for (const k of kids) { v = Math.min(v, alphabeta(k, depth - 1, alpha, beta, true, g)); beta = Math.min(beta, v); if (alpha >= beta) break; }
    return v;
}
