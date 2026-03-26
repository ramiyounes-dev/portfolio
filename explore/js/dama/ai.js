export function computeAIMove(board, player) {
    const legal = board.getLegalMoves(player);
    if (legal.moves.length === 0) return null;
    if (legal.moves.length === 1) return legal.moves[0];

    const depth = 4;
    const limit = Math.min(legal.moves.length, 20);
    let bestScore = -Infinity;
    let bestMove = legal.moves[0];

    for (let i = 0; i < limit; i++) {
        const clone = board.clone();
        clone.applyMove(legal.moves[i]);
        const score = minimax(clone, depth - 1, -Infinity, Infinity, false, player);
        if (score > bestScore) { bestScore = score; bestMove = legal.moves[i]; }
    }
    return bestMove;
}

function minimax(board, depth, alpha, beta, isMax, aiPlayer) {
    const opp = aiPlayer === 'A' ? 'B' : 'A';
    if (board.pieceCount(aiPlayer) === 0) return -10000 - depth;
    if (board.pieceCount(opp) === 0) return 10000 + depth;

    const cur = isMax ? aiPlayer : opp;
    const legal = board.getLegalMoves(cur);
    if (legal.moves.length === 0) return isMax ? -10000 - depth : 10000 + depth;
    if (depth === 0) return evaluate(board, aiPlayer);

    const limit = Math.min(legal.moves.length, 20);
    if (isMax) {
        let best = -Infinity;
        for (let i = 0; i < limit; i++) {
            const c = board.clone(); c.applyMove(legal.moves[i]);
            const ev = minimax(c, depth - 1, alpha, beta, false, aiPlayer);
            best = Math.max(best, ev); alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (let i = 0; i < limit; i++) {
            const c = board.clone(); c.applyMove(legal.moves[i]);
            const ev = minimax(c, depth - 1, alpha, beta, true, aiPlayer);
            best = Math.min(best, ev); beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return best;
    }
}

function evaluate(board, aiPlayer) {
    const opp = aiPlayer === 'A' ? 'B' : 'A';
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = board.grid[r][c];
            if (!cell) continue;
            const val = cell.king ? 30 : 10;
            const adv = cell.king ? 0 : (cell.player === 'A' ? r : 7 - r) * 0.5;
            const center = (3.5 - Math.abs(c - 3.5)) * 0.3;
            if (cell.player === aiPlayer) score += val + adv + center;
            else score -= val + adv + center;
        }
    }
    return score;
}
