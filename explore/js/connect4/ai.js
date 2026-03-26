export function computeAIMove(board, player) {
    const valid = board.getValidColumns();
    if (valid.length === 0) return null;
    if (valid.length === 1) return valid[0];

    const opp = player === 'A' ? 'B' : 'A';

    // Immediate win
    for (const col of valid) {
        const c = board.clone(); c.dropDisc(col, player);
        if (c.checkWin() === player) return col;
    }
    // Block immediate loss
    for (const col of valid) {
        const c = board.clone(); c.dropDisc(col, opp);
        if (c.checkWin() === opp) return col;
    }

    const depth = 6;
    let bestScore = -Infinity;
    let bestCol = valid[Math.floor(valid.length / 2)];

    // Search center columns first for better pruning
    const ordered = [...valid].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));

    for (const col of ordered) {
        const clone = board.clone();
        clone.dropDisc(col, player);
        const score = minimax(clone, depth - 1, -Infinity, Infinity, false, player);
        if (score > bestScore) { bestScore = score; bestCol = col; }
    }
    return bestCol;
}

function minimax(board, depth, alpha, beta, isMax, aiPlayer) {
    const opp = aiPlayer === 'A' ? 'B' : 'A';
    const winner = board.checkWin();
    if (winner === aiPlayer) return 10000 + depth;
    if (winner === opp) return -10000 - depth;
    if (board.isFull()) return 0;
    if (depth === 0) return evaluate(board, aiPlayer);

    const valid = board.getValidColumns();
    const ordered = [...valid].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
    const cur = isMax ? aiPlayer : opp;

    if (isMax) {
        let best = -Infinity;
        for (const col of ordered) {
            const c = board.clone(); c.dropDisc(col, cur);
            const ev = minimax(c, depth - 1, alpha, beta, false, aiPlayer);
            best = Math.max(best, ev); alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const col of ordered) {
            const c = board.clone(); c.dropDisc(col, cur);
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
    const g = board.grid;

    // Center column preference
    for (let r = 0; r < 6; r++) {
        if (g[r][3] === aiPlayer) score += 3;
        else if (g[r][3] === opp) score -= 3;
    }

    // Horizontal windows
    for (let r = 0; r < 6; r++)
        for (let c = 0; c <= 3; c++)
            score += scoreWindow([g[r][c], g[r][c + 1], g[r][c + 2], g[r][c + 3]], aiPlayer, opp);

    // Vertical windows
    for (let c = 0; c < 7; c++)
        for (let r = 0; r <= 2; r++)
            score += scoreWindow([g[r][c], g[r + 1][c], g[r + 2][c], g[r + 3][c]], aiPlayer, opp);

    // Diagonal ↗
    for (let r = 0; r <= 2; r++)
        for (let c = 0; c <= 3; c++)
            score += scoreWindow([g[r][c], g[r + 1][c + 1], g[r + 2][c + 2], g[r + 3][c + 3]], aiPlayer, opp);

    // Diagonal ↘
    for (let r = 3; r < 6; r++)
        for (let c = 0; c <= 3; c++)
            score += scoreWindow([g[r][c], g[r - 1][c + 1], g[r - 2][c + 2], g[r - 3][c + 3]], aiPlayer, opp);

    return score;
}

function scoreWindow(w, ai, opp) {
    const a = w.filter(c => c === ai).length;
    const o = w.filter(c => c === opp).length;
    const e = w.filter(c => !c).length;
    if (a === 4) return 100;
    if (a === 3 && e === 1) return 5;
    if (a === 2 && e === 2) return 2;
    if (o === 3 && e === 1) return -4;
    return 0;
}
