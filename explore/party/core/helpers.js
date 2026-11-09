/* Small shared helpers for game logic modules. */

/** Lowest score among the given ids (0 if none): the starting score of a late joiner. */
export function lowestScore(scores, ids) {
    const vals = ids.filter(id => id in scores).map(id => scores[id]);
    return vals.length ? Math.max(0, Math.min(...vals)) : 0;
}

/** Ranking from a scores map: [{ id, score, rank }], ties share a rank. */
export function rank(scores, ids = Object.keys(scores)) {
    const rows = ids.map(id => ({ id, score: scores[id] || 0 })).sort((a, b) => b.score - a.score);
    let last = null, r = 0;
    rows.forEach((row, i) => { if (row.score !== last) { r = i + 1; last = row.score; } row.rank = r; });
    return rows;
}

/** Winners (all ids sharing the top score). */
export const winnersOf = ranking => ranking.filter(r => r.rank === 1).map(r => r.id);

/** Next id after `id` in `order` (wraps), skipping ids for which skip(id) is true. */
export function nextInOrder(order, id, skip = () => false) {
    if (!order.length) return null;
    let i = order.indexOf(id);
    for (let k = 0; k < order.length; k++) {
        i = (i + 1) % order.length;
        if (!skip(order[i])) return order[i];
    }
    return null;
}

/** Standard over-object for the room: ranking + winners. */
export function finish(scores, ids, extra = {}) {
    const ranking = rank(scores, ids);
    return { ranking, winners: winnersOf(ranking), ...extra };
}
