/* Ultimate Tic-Tac-Toe AI. Easy: random legal square. Medium: one-ply heuristic (win boards, don't send the
   opponent to a board they can win). Hard: alpha-beta search (depth 4) on board control and threats. */
import { smallResult, bigLine, legalMoves } from '../logic/ultimate.js';
import { LINES } from '../logic/tictactoe.js';
import { think, pick, best } from './common.js';

function apply(st, idx, mark) {
    const cells = st.cells.slice(); cells[idx] = mark;
    const small = st.small.slice();
    const b = Math.floor(idx / 9), i = idx % 9;
    if (small[b] === null) small[b] = smallResult(cells, b);
    return { cells, small, next: small[i] === null ? i : null };
}

const lineScore = (marks, me, op) => {
    let s = 0;
    for (const l of LINES) {
        const m = l.map(i => marks[i]);
        const mine = m.filter(x => x === me).length, theirs = m.filter(x => x === op).length;
        if (m.includes('D')) continue;
        if (mine && !theirs) s += mine === 2 ? 4 : 1;
        if (theirs && !mine) s -= theirs === 2 ? 4 : 1;
    }
    return s;
};

export function evaluate(st, me) {
    const op = me === 'X' ? 'O' : 'X';
    const big = bigLine(st.small);
    if (big) return st.small[big[0]] === me ? 10000 : -10000;
    let s = lineScore(st.small, me, op) * 30;
    for (let b = 0; b < 9; b++) {
        const w = b === 4 ? 1.5 : [0, 2, 6, 8].includes(b) ? 1.2 : 1;
        if (st.small[b] === me) s += 60 * w;
        else if (st.small[b] === op) s -= 60 * w;
        else if (st.small[b] === null) s += lineScore(st.cells.slice(b * 9, b * 9 + 9), me, op) * w;
    }
    return s;
}

function search(st, depth, alpha, beta, turn, me) {
    if (bigLine(st.small) || depth === 0) return evaluate(st, me);
    const moves = legalMoves(st);
    if (!moves.length) return evaluate(st, me);
    const other = turn === 'X' ? 'O' : 'X';
    if (turn === me) {
        let v = -Infinity;
        for (const m of moves) { v = Math.max(v, search(apply(st, m, turn), depth - 1, alpha, beta, other, me)); alpha = Math.max(alpha, v); if (alpha >= beta) break; }
        return v;
    }
    let v = Infinity;
    for (const m of moves) { v = Math.min(v, search(apply(st, m, turn), depth - 1, alpha, beta, other, me)); beta = Math.min(beta, v); if (alpha >= beta) break; }
    return v;
}

export function chooseMove(view, mark, difficulty, rng) {
    const st = { cells: view.cells, small: view.small, next: view.playable.length === 1 ? view.playable[0] : null };
    const moves = legalMoves(st);
    if (!moves.length) return null;
    const op = mark === 'X' ? 'O' : 'X';
    if (difficulty === 'easy') return pick(rng, moves);
    if (difficulty === 'medium') {
        return best(rng, moves, m => {
            const n = apply(st, m, mark);
            let s = evaluate(n, mark) + rng() * 8;
            // how well can the opponent answer?
            const replies = legalMoves(n);
            if (replies.some(r => { const q = apply(n, r, op); return q.small.filter(x => x === op).length > n.small.filter(x => x === op).length; })) s -= 50;
            if (n.next === null) s -= 15;   // a free choice for the opponent
            return s;
        });
    }
    const depth = moves.length > 20 ? 3 : 4;
    return best(rng, moves, m => search(apply(st, m, mark), depth - 1, -Infinity, Infinity, op, mark));
}

export default {
    decide(v, me, ctx) {
        if (v.turn !== me || !v.playable.length) return null;
        if (ctx.firing || !ctx.memory.planned) {
            ctx.memory.planned = chooseMove(v, me === v.x ? 'X' : 'O', ctx.difficulty, ctx.rng);
        }
        const cell = ctx.memory.planned;
        if (ctx.firing) ctx.memory.planned = null;
        return { action: { cell }, delay: think(ctx.rng, 600, 1500) };
    },
};
