/* Battleship AI (sees only its own shots and which enemy ships are sunk).
   Easy: random shots, follows up a hit only sometimes. Medium: hunt on a checkerboard, then target around hits.
   Hard: probability density: counts every way the remaining ships could still fit and fires at the likeliest cell. */
import { N, FLEET, cellsOf } from '../logic/battleship.js';
import { think, pick, best } from './common.js';

const neighbours = i => {
    const r = Math.floor(i / N), c = i % N, out = [];
    if (r > 0) out.push(i - N); if (r < N - 1) out.push(i + N); if (c > 0) out.push(i - 1); if (c < N - 1) out.push(i + 1);
    return out;
};

export function chooseShot(v, me, difficulty, rng) {
    const shots = v.shots[me];
    const foe = v.players.find(id => id !== me);
    const sunkShips = (v.sunk && v.sunk[foe]) || [];
    const sunkCells = new Set(sunkShips.flatMap(sh => cellsOf(sh)));
    const free = shots.map((x, i) => (x ? -1 : i)).filter(i => i >= 0);
    const openHits = shots.map((x, i) => (x === 'h' && !sunkCells.has(i) ? i : -1)).filter(i => i >= 0);

    if (difficulty === 'easy') {
        if (openHits.length && rng() < 0.5) {
            const around = [...new Set(openHits.flatMap(neighbours))].filter(i => !shots[i]);
            if (around.length) return pick(rng, around);
        }
        return pick(rng, free);
    }
    if (difficulty === 'medium') {
        if (openHits.length) {
            // extend a line of two hits first, else any neighbour of a hit
            const line = [];
            for (const h of openHits) for (const d of [1, N]) if (openHits.includes(h + d) && (d === N || Math.floor(h / N) === Math.floor((h + d) / N))) {
                for (const e of [h - d, h + 2 * d]) if (e >= 0 && e < N * N && !shots[e] && (d === N || Math.floor(e / N) === Math.floor(h / N))) line.push(e);
            }
            if (line.length) return pick(rng, line);
            const around = [...new Set(openHits.flatMap(neighbours))].filter(i => !shots[i]);
            if (around.length) return pick(rng, around);
        }
        const parity = free.filter(i => (Math.floor(i / N) + (i % N)) % 2 === 0);
        return pick(rng, parity.length ? parity : free);
    }
    // hard: probability density
    const remaining = FLEET.filter(f => !sunkShips.some(s => s.type === f.type)).map(f => f.size);
    const heat = Array(N * N).fill(0);
    for (const size of remaining) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const dir of ['h', 'v']) {
        if (dir === 'h' ? c + size > N : r + size > N) continue;
        const cells = cellsOf({ r, c, dir, size });
        if (cells.some(x => shots[x] === 'm' || sunkCells.has(x))) continue;
        const hits = cells.filter(x => shots[x] === 'h').length;
        const w = hits ? 1 + hits * 40 : 1;
        for (const x of cells) if (!shots[x]) heat[x] += w;
    }
    return best(rng, free, i => heat[i]);
}

export default {
    decide(v, me, ctx) {
        if (v.phase === 'place' && !v.ready[me]) return { action: { random: true }, delay: think(ctx.rng, 1500, 3000) };
        if (v.phase !== 'battle' || v.turn !== me) return null;
        const key = v.shots[me].join();
        if (ctx.memory.key !== key) { ctx.memory.key = key; ctx.memory.plan = chooseShot(v, me, ctx.difficulty, ctx.rng); }
        return { action: { cell: ctx.memory.plan }, delay: think(ctx.rng, 600, 1400) };
    },
};
