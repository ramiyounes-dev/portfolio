const GOAL = { A: 8, B: 0 };

function randItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function easyMove(board, player) {
    const moves = board.getValidMoves(board.pawns[player]);
    if (board.wallCounts[player] > 0 && Math.random() < 0.25) {
        const orient = Math.random() < 0.5 ? 'H' : 'V';
        const walls = board.getValidWallPlacements(orient);
        if (walls.length) {
            const w = randItem(walls);
            return { type: 'wall', wx: w.wx, wy: w.wy, orientation: orient };
        }
    }
    if (moves.length) {
        const m = randItem(moves);
        return { type: 'move', x: m.x, y: m.y };
    }
    return null;
}

function mediumMove(board, player) {
    const opponent = player === 'A' ? 'B' : 'A';
    const goal = GOAL[player];
    const oppGoal = GOAL[opponent];

    const moves = board.getValidMoves(board.pawns[player]);
    let bestMove = null;
    let bestDist = Infinity;
    for (const m of moves) {
        const clone = board.clone();
        clone.grid[clone.pawns[player].y][clone.pawns[player].x].occupiedBy = null;
        clone.pawns[player] = { x: m.x, y: m.y };
        clone.grid[m.y][m.x].occupiedBy = player;
        const d = clone.bfsDistance(player, goal);
        if (d < bestDist) { bestDist = d; bestMove = m; }
    }

    const myDist = board.bfsDistance(player, goal);
    const oppDist = board.bfsDistance(opponent, oppGoal);
    const shouldWall = board.wallCounts[player] > 0 && (myDist > oppDist || Math.random() < 0.3);

    if (shouldWall) {
        const bestWall = findBestWall(board, player, opponent, oppGoal);
        if (bestWall && bestWall.gain >= 2) {
            return { type: 'wall', wx: bestWall.wx, wy: bestWall.wy, orientation: bestWall.orientation };
        }
    }

    if (bestMove) return { type: 'move', x: bestMove.x, y: bestMove.y };
    return null;
}

function hardMove(board, player) {
    const opponent = player === 'A' ? 'B' : 'A';

    function evaluate(b) {
        const myDist  = b.bfsDistance(player, GOAL[player]);
        const oppDist = b.bfsDistance(opponent, GOAL[opponent]);
        return myDist - oppDist;
    }

    function allMoves(b, p) {
        const result = [];
        for (const m of b.getValidMoves(b.pawns[p])) {
            result.push({ type: 'move', x: m.x, y: m.y });
        }
        if (b.wallCounts[p] > 0) {
            for (const orient of ['H', 'V']) {
                const walls = b.getValidWallPlacements(orient);
                const scored = walls.map(w => {
                    const dx = w.wx - b.pawns[opponent].x;
                    const dy = w.wy - b.pawns[opponent].y;
                    return { ...w, dist: dx * dx + dy * dy };
                }).sort((a, c) => a.dist - c.dist);
                for (const w of scored.slice(0, 8)) {
                    result.push({ type: 'wall', wx: w.wx, wy: w.wy, orientation: orient });
                }
            }
        }
        return result;
    }

    function applyMove(b, p, move) {
        const c = b.clone();
        if (move.type === 'move') {
            c.movePawn(p, { x: move.x, y: move.y });
        } else {
            c.placeWall(move.wx, move.wy, move.orientation, p);
        }
        return c;
    }

    let bestScore = Infinity;
    let bestAction = null;
    const myMoves = allMoves(board, player);

    for (const move of myMoves) {
        const after = applyMove(board, player, move);
        if (after.pawns[player].y === GOAL[player]) {
            return move;
        }

        let worstCase = -Infinity;
        const oppMoves = allMoves(after, opponent);
        for (const opp of oppMoves.slice(0, 12)) {
            const after2 = applyMove(after, opponent, opp);
            const ev = evaluate(after2);
            if (ev > worstCase) worstCase = ev;
        }
        if (oppMoves.length === 0) worstCase = evaluate(after);

        if (worstCase < bestScore) {
            bestScore = worstCase;
            bestAction = move;
        }
    }

    return bestAction;
}

function findBestWall(board, player, opponent, oppGoal) {
    const baseDist = board.bfsDistance(opponent, oppGoal);
    let best = null;
    let bestGain = 0;

    for (const orient of ['H', 'V']) {
        const walls = board.getValidWallPlacements(orient);
        const sample = walls.length > 16
            ? walls.sort(() => Math.random() - 0.5).slice(0, 16)
            : walls;
        for (const w of sample) {
            const clone = board.clone();
            clone.placeWall(w.wx, w.wy, orient, player);
            const newDist = clone.bfsDistance(opponent, oppGoal);
            const gain = newDist - baseDist;
            if (gain > bestGain) {
                bestGain = gain;
                best = { wx: w.wx, wy: w.wy, orientation: orient, gain };
            }
        }
    }
    return best;
}

export function computeAIMove(board, player, difficulty) {
    switch (difficulty) {
        case 'easy':   return easyMove(board, player);
        case 'medium': return mediumMove(board, player);
        case 'hard':   return hardMove(board, player);
        default:       return easyMove(board, player);
    }
}
