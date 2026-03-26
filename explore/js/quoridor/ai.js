const GOAL = { A: 8, B: 0 };
const DIRS = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];

function bfsPath(board, player) {
    const goalRow = GOAL[player];
    const start = board.pawns[player];
    const visited = new Map();
    visited.set(`${start.x},${start.y}`, null);
    const queue = [start];
    while (queue.length) {
        const cur = queue.shift();
        if (cur.y === goalRow) {
            const path = [];
            let node = cur;
            while (node) {
                path.unshift(node);
                node = visited.get(`${node.x},${node.y}`);
            }
            return path;
        }
        for (const d of DIRS) {
            const next = { x: cur.x + d.x, y: cur.y + d.y };
            if (next.x < 0 || next.x > 8 || next.y < 0 || next.y > 8) continue;
            const key = `${next.x},${next.y}`;
            if (visited.has(key)) continue;
            if (board.isBlockedByWall(cur, next)) continue;
            visited.set(key, cur);
            queue.push(next);
        }
    }
    return null;
}

function getPathBlockingWalls(board, opponent) {
    const path = bfsPath(board, opponent);
    if (!path || path.length < 2) return [];
    const seen = new Set();
    const walls = [];
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        const dy = b.y - a.y, dx = b.x - a.x;
        const candidates = [];
        if (dy === 1) {
            candidates.push({ wx: a.x, wy: a.y, orientation: 'H' });
            candidates.push({ wx: a.x - 1, wy: a.y, orientation: 'H' });
        } else if (dy === -1) {
            candidates.push({ wx: b.x, wy: b.y, orientation: 'H' });
            candidates.push({ wx: b.x - 1, wy: b.y, orientation: 'H' });
        } else if (dx === 1) {
            candidates.push({ wx: a.x, wy: a.y, orientation: 'V' });
            candidates.push({ wx: a.x, wy: a.y - 1, orientation: 'V' });
        } else if (dx === -1) {
            candidates.push({ wx: b.x, wy: b.y, orientation: 'V' });
            candidates.push({ wx: b.x, wy: b.y - 1, orientation: 'V' });
        }
        for (const w of candidates) {
            if (w.wx < 0 || w.wx > 7 || w.wy < 0 || w.wy > 7) continue;
            const key = `${w.orientation},${w.wx},${w.wy}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (board.isValidWallPlacement(w.wx, w.wy, w.orientation)) {
                walls.push(w);
            }
        }
    }
    return walls;
}

function getNearbyWalls(board, target, radius) {
    const px = board.pawns[target].x, py = board.pawns[target].y;
    const walls = [];
    for (const orient of ['H', 'V']) {
        for (let wy = Math.max(0, py - radius); wy <= Math.min(7, py + radius); wy++) {
            for (let wx = Math.max(0, px - radius); wx <= Math.min(7, px + radius); wx++) {
                if (board.isValidWallPlacement(wx, wy, orient)) {
                    walls.push({ wx, wy, orientation: orient });
                }
            }
        }
    }
    return walls;
}

function evaluate(board, aiPlayer) {
    const opp = aiPlayer === 'A' ? 'B' : 'A';
    const myDist = board.bfsDistance(aiPlayer, GOAL[aiPlayer]);
    const oppDist = board.bfsDistance(opp, GOAL[opp]);
    if (myDist === Infinity) return -9999;
    if (oppDist === Infinity) return 9999;
    let score = (oppDist - myDist) * 10;
    score += (board.wallCounts[aiPlayer] - board.wallCounts[opp]) * 1.5;
    const myGoalDir = GOAL[aiPlayer] === 8 ? 1 : -1;
    score += board.pawns[aiPlayer].y * myGoalDir * 0.5;
    return score;
}

function applyMove(board, player, move) {
    const c = board.clone();
    if (move.type === 'move') {
        c.movePawn(player, { x: move.x, y: move.y });
    } else {
        c.placeWall(move.wx, move.wy, move.orientation, player);
    }
    return c;
}

function generateMoves(board, player, aiPlayer) {
    const opp = player === 'A' ? 'B' : 'A';
    const moves = [];

    const pawnMoves = board.getValidMoves(board.pawns[player]);
    const goalRow = GOAL[player];
    for (const m of pawnMoves) {
        const priority = m.y === goalRow ? 1000 : -Math.abs(m.y - goalRow);
        moves.push({ type: 'move', x: m.x, y: m.y, priority });
    }

    if (board.wallCounts[player] > 0) {
        const pathWalls = getPathBlockingWalls(board, opp);
        const nearWalls = getNearbyWalls(board, opp, 2);

        const seen = new Set();
        const wallCandidates = [];
        for (const w of pathWalls) {
            const key = `${w.orientation},${w.wx},${w.wy}`;
            if (!seen.has(key)) {
                seen.add(key);
                wallCandidates.push({ ...w, priority: 10 });
            }
        }
        for (const w of nearWalls) {
            const key = `${w.orientation},${w.wx},${w.wy}`;
            if (!seen.has(key)) {
                seen.add(key);
                wallCandidates.push({ ...w, priority: 2 });
            }
        }

        for (const w of wallCandidates) {
            const clone = board.clone();
            clone.placeWall(w.wx, w.wy, w.orientation, player);
            const newOppDist = clone.bfsDistance(opp, GOAL[opp]);
            const oldOppDist = board.bfsDistance(opp, GOAL[opp]);
            const gain = newOppDist - oldOppDist;
            if (gain > 0) {
                moves.push({
                    type: 'wall', wx: w.wx, wy: w.wy, orientation: w.orientation,
                    priority: gain * 5 + w.priority
                });
            }
        }
    }

    moves.sort((a, b) => b.priority - a.priority);
    return moves;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer, maxMoves) {
    const opp = aiPlayer === 'A' ? 'B' : 'A';
    if (board.pawns[aiPlayer].y === GOAL[aiPlayer]) return 10000 + depth;
    if (board.pawns[opp].y === GOAL[opp]) return -10000 - depth;
    if (depth === 0) return evaluate(board, aiPlayer);

    const currentPlayer = isMaximizing ? aiPlayer : opp;
    const moves = generateMoves(board, currentPlayer, aiPlayer);
    const limit = Math.min(moves.length, maxMoves);

    if (isMaximizing) {
        let best = -Infinity;
        for (let i = 0; i < limit; i++) {
            const child = applyMove(board, currentPlayer, moves[i]);
            const ev = minimax(child, depth - 1, alpha, beta, false, aiPlayer, maxMoves);
            best = Math.max(best, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (let i = 0; i < limit; i++) {
            const child = applyMove(board, currentPlayer, moves[i]);
            const ev = minimax(child, depth - 1, alpha, beta, true, aiPlayer, maxMoves);
            best = Math.min(best, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return best;
    }
}

export function computeAIMove(board, player) {
    const opp = player === 'A' ? 'B' : 'A';

    const pawnMoves = board.getValidMoves(board.pawns[player]);
    for (const m of pawnMoves) {
        if (m.y === GOAL[player]) return { type: 'move', x: m.x, y: m.y };
    }

    const totalWalls = (10 - board.wallCounts['A']) + (10 - board.wallCounts['B']);
    const depth = totalWalls > 12 ? 4 : 3;
    const maxMoves = totalWalls > 12 ? 20 : 15;

    const moves = generateMoves(board, player, player);
    let bestScore = -Infinity;
    let bestAction = null;

    const limit = Math.min(moves.length, maxMoves);
    for (let i = 0; i < limit; i++) {
        const move = moves[i];
        const child = applyMove(board, player, move);
        const score = minimax(child, depth - 1, -Infinity, Infinity, false, player, maxMoves);
        if (score > bestScore) {
            bestScore = score;
            bestAction = move;
        }
    }

    if (bestAction) {
        const clean = { type: bestAction.type };
        if (bestAction.type === 'move') {
            clean.x = bestAction.x;
            clean.y = bestAction.y;
        } else {
            clean.wx = bestAction.wx;
            clean.wy = bestAction.wy;
            clean.orientation = bestAction.orientation;
        }
        return clean;
    }

    if (pawnMoves.length) {
        const m = pawnMoves[0];
        return { type: 'move', x: m.x, y: m.y };
    }
    return null;
}
