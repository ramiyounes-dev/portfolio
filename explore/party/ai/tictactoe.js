/* Tic-Tac-Toe AI. Easy: random square. Medium: win / block / centre / corner heuristic. Hard: perfect minimax. */
import { LINES, winLine } from '../logic/tictactoe.js';
import { think, pick, best } from './common.js';

const empties = c => c.map((x, i) => (x ? null : i)).filter(i => i !== null);

export function minimax(cells, me, turn, depth = 0) {
    const w = winLine(cells);
    if (w) return cells[w[0]] === me ? 10 - depth : depth - 10;
    const free = empties(cells);
    if (!free.length) return 0;
    const other = turn === 'X' ? 'O' : 'X';
    let bestScore = turn === me ? -Infinity : Infinity;
    for (const i of free) {
        cells[i] = turn;
        const sc = minimax(cells, me, other, depth + 1);
        cells[i] = null;
        bestScore = turn === me ? Math.max(bestScore, sc) : Math.min(bestScore, sc);
    }
    return bestScore;
}

function completing(cells, mark) {
    for (const l of LINES) {
        const marks = l.map(i => cells[i]);
        if (marks.filter(m => m === mark).length === 2 && marks.includes(null)) return l[marks.indexOf(null)];
    }
    return null;
}

export function chooseCell(cells, mark, difficulty, rng) {
    const free = empties(cells);
    const other = mark === 'X' ? 'O' : 'X';
    if (difficulty === 'easy') return completing(cells, mark) !== null && rng() < 0.3 ? completing(cells, mark) : pick(rng, free);
    if (difficulty === 'medium') {
        const win = completing(cells, mark); if (win !== null) return win;
        const block = completing(cells, other); if (block !== null && rng() < 0.9) return block;
        if (cells[4] === null) return 4;
        const corners = [0, 2, 6, 8].filter(i => cells[i] === null);
        return corners.length && rng() < 0.7 ? pick(rng, corners) : pick(rng, free);
    }
    if (free.length === 9) return pick(rng, [0, 2, 4, 6, 8]);
    return best(rng, free, i => { const c = [...cells]; c[i] = mark; return minimax(c, mark, other, 1); });
}

export default {
    decide(v, me, ctx) {
        if (v.phase !== 'play' || v.turn !== me) return null;
        const mark = me === v.x ? 'X' : 'O';
        return { action: { cell: chooseCell(v.cells, mark, ctx.difficulty, ctx.rng) }, delay: think(ctx.rng) };
    },
};
