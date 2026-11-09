/* Reversi AI. Easy: random legal move. Medium: 2-ply search on positional weights. Hard: alpha-beta (depth 5,
   deeper near the end) on corners, mobility and disc balance. */
import { flipsFor, legalMoves, count } from '../logic/reversi.js';
import { think, pick, best } from './common.js';

const W = [
    120, -20, 20, 5, 5, 20, -20, 120,
    -20, -40, -5, -5, -5, -5, -40, -20,
    20, -5, 15, 3, 3, 15, -5, 20,
    5, -5, 3, 3, 3, 3, -5, 5,
    5, -5, 3, 3, 3, 3, -5, 5,
    20, -5, 15, 3, 3, 15, -5, 20,
    -20, -40, -5, -5, -5, -5, -40, -20,
    120, -20, 20, 5, 5, 20, -20, 120,
];

function play(board, idx, color) {
    const b = board.slice();
    for (const f of flipsFor(board, idx, color)) b[f] = color;
    b[idx] = color;
    return b;
}

export function evaluate(b, me) {
    const op = me === 'B' ? 'W' : 'B';
    const empty = b.filter(x => !x).length;
    if (!legalMoves(b, me).length && !legalMoves(b, op).length) {
        const d = count(b, me) - count(b, op);
        return d > 0 ? 100000 + d : d < 0 ? -100000 + d : 0;
    }
    let pos = 0;
    for (let i = 0; i < 64; i++) if (b[i] === me) pos += W[i]; else if (b[i] === op) pos -= W[i];
    const mob = legalMoves(b, me).length - legalMoves(b, op).length;
    const discs = count(b, me) - count(b, op);
    return pos + mob * 8 + (empty < 14 ? discs * 6 : 0);
}

function search(b, depth, alpha, beta, turn, me) {
    const op = turn === 'B' ? 'W' : 'B';
    if (depth === 0) return evaluate(b, me);
    const moves = legalMoves(b, turn);
    if (!moves.length) {
        if (!legalMoves(b, op).length) return evaluate(b, me);
        return search(b, depth - 1, alpha, beta, op, me);
    }
    moves.sort((x, y) => W[y] - W[x]);
    if (turn === me) {
        let v = -Infinity;
        for (const m of moves) { v = Math.max(v, search(play(b, m, turn), depth - 1, alpha, beta, op, me)); alpha = Math.max(alpha, v); if (alpha >= beta) break; }
        return v;
    }
    let v = Infinity;
    for (const m of moves) { v = Math.min(v, search(play(b, m, turn), depth - 1, alpha, beta, op, me)); beta = Math.min(beta, v); if (alpha >= beta) break; }
    return v;
}

export function chooseCell(board, color, difficulty, rng) {
    const moves = legalMoves(board, color);
    if (!moves.length) return null;
    if (difficulty === 'easy') return pick(rng, moves);
    const op = color === 'B' ? 'W' : 'B';
    const empty = board.filter(x => !x).length;
    const depth = difficulty === 'medium' ? 2 : empty <= 10 ? 8 : 5;
    return best(rng, moves, m => search(play(board, m, color), depth - 1, -Infinity, Infinity, op, color) + (difficulty === 'medium' ? rng() * 10 : 0));
}

export default {
    decide(v, me, ctx) {
        if (v.turn !== me) return null;
        const key = v.board.join();
        if (ctx.memory.key !== key) { ctx.memory.key = key; ctx.memory.plan = chooseCell(v.board, me === v.black ? 'B' : 'W', ctx.difficulty, ctx.rng); }
        if (ctx.memory.plan === null) return null;
        return { action: { cell: ctx.memory.plan }, delay: think(ctx.rng, 500, 1300) };
    },
};
