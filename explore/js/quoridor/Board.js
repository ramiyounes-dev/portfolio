export class Board {
    constructor() {
        this.size = 9;
        this.grid = this._makeGrid();
        this.walls = new Set();
        this.wallOwners = {};
        this.pawns = {
            A: { x: 4, y: 0 },
            B: { x: 4, y: 8 }
        };
        this.wallCounts = { A: 10, B: 10 };
        this.grid[0][4].occupiedBy = 'A';
        this.grid[8][4].occupiedBy = 'B';
    }

    _makeGrid() {
        return Array.from({ length: 9 }, (_, y) =>
            Array.from({ length: 9 }, (_, x) => ({ x, y, occupiedBy: null }))
        );
    }

    isBlockedByWall(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dy === 1)
            return this.walls.has(`H,${a.x},${a.y}`) || this.walls.has(`H,${a.x - 1},${a.y}`);
        if (dy === -1)
            return this.walls.has(`H,${b.x},${b.y}`) || this.walls.has(`H,${b.x - 1},${b.y}`);
        if (dx === 1)
            return this.walls.has(`V,${a.x},${a.y}`) || this.walls.has(`V,${a.x},${a.y - 1}`);
        if (dx === -1)
            return this.walls.has(`V,${b.x},${b.y}`) || this.walls.has(`V,${b.x},${b.y - 1}`);
        return false;
    }

    _inBounds(x, y) {
        return x >= 0 && x < 9 && y >= 0 && y < 9;
    }

    _canStep(from, to) {
        if (!this._inBounds(to.x, to.y)) return false;
        return !this.isBlockedByWall(from, to);
    }

    getValidMoves(pos) {
        const { x, y } = pos;
        const dirs = [{ x, y: y - 1 }, { x, y: y + 1 }, { x: x + 1, y }, { x: x - 1, y }];
        const moves = [];

        for (const target of dirs) {
            if (!this._canStep(pos, target)) continue;
            const cell = this.grid[target.y]?.[target.x];
            if (!cell) continue;

            if (cell.occupiedBy) {
                const jump = { x: target.x + (target.x - x), y: target.y + (target.y - y) };
                if (this._canStep(target, jump) && this._inBounds(jump.x, jump.y) && !this.grid[jump.y][jump.x].occupiedBy) {
                    moves.push(jump);
                } else {
                    const perps = target.x !== x
                        ? [{ x: target.x, y: target.y - 1 }, { x: target.x, y: target.y + 1 }]
                        : [{ x: target.x - 1, y: target.y }, { x: target.x + 1, y: target.y }];
                    for (const diag of perps) {
                        if (this._canStep(target, diag) && this._inBounds(diag.x, diag.y) && !this.grid[diag.y]?.[diag.x]?.occupiedBy) {
                            moves.push(diag);
                        }
                    }
                }
            } else {
                moves.push(target);
            }
        }
        return moves;
    }

    movePawn(player, to) {
        const from = this.pawns[player];
        const valid = this.getValidMoves(from);
        if (!valid.some(m => m.x === to.x && m.y === to.y)) return false;
        this.grid[from.y][from.x].occupiedBy = null;
        this.grid[to.y][to.x].occupiedBy = player;
        this.pawns[player] = { x: to.x, y: to.y };
        return true;
    }

    hasPath(player, goalRow) {
        const start = this.pawns[player];
        const visited = new Set([`${start.x},${start.y}`]);
        const queue = [start];
        while (queue.length) {
            const cur = queue.shift();
            if (cur.y === goalRow) return true;
            for (const d of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }]) {
                const next = { x: cur.x + d.x, y: cur.y + d.y };
                if (!this._inBounds(next.x, next.y)) continue;
                const key = `${next.x},${next.y}`;
                if (visited.has(key)) continue;
                if (this.isBlockedByWall(cur, next)) continue;
                visited.add(key);
                queue.push(next);
            }
        }
        return false;
    }

    isValidWallPlacement(wx, wy, orientation) {
        if (wx < 0 || wx > 7 || wy < 0 || wy > 7) return false;
        const key = `${orientation},${wx},${wy}`;
        if (this.walls.has(key)) return false;

        const cross = orientation === 'H' ? 'V' : 'H';
        if (this.walls.has(`${cross},${wx},${wy}`)) return false;

        if (orientation === 'H') {
            if (this.walls.has(`H,${wx - 1},${wy}`) || this.walls.has(`H,${wx + 1},${wy}`)) return false;
        } else {
            if (this.walls.has(`V,${wx},${wy - 1}`) || this.walls.has(`V,${wx},${wy + 1}`)) return false;
        }

        this.walls.add(key);
        const ok = this.hasPath('A', 8) && this.hasPath('B', 0);
        this.walls.delete(key);
        return ok;
    }

    placeWall(wx, wy, orientation, player) {
        if (this.wallCounts[player] <= 0) return false;
        if (!this.isValidWallPlacement(wx, wy, orientation)) return false;
        const key = `${orientation},${wx},${wy}`;
        this.walls.add(key);
        this.wallOwners[key] = player;
        this.wallCounts[player]--;
        return true;
    }

    checkWin() {
        if (this.pawns.A.y === 8) return 'A';
        if (this.pawns.B.y === 0) return 'B';
        return null;
    }

    bfsDistance(player, goalRow) {
        const start = this.pawns[player];
        const visited = new Set([`${start.x},${start.y}`]);
        const queue = [{ ...start, dist: 0 }];
        while (queue.length) {
            const cur = queue.shift();
            if (cur.y === goalRow) return cur.dist;
            for (const d of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }]) {
                const next = { x: cur.x + d.x, y: cur.y + d.y };
                if (!this._inBounds(next.x, next.y)) continue;
                const key = `${next.x},${next.y}`;
                if (visited.has(key)) continue;
                if (this.isBlockedByWall(cur, next)) continue;
                visited.add(key);
                queue.push({ ...next, dist: cur.dist + 1 });
            }
        }
        return Infinity;
    }

    clone() {
        const b = new Board();
        b.walls = new Set(this.walls);
        b.wallOwners = { ...this.wallOwners };
        b.pawns = { A: { ...this.pawns.A }, B: { ...this.pawns.B } };
        b.wallCounts = { ...this.wallCounts };
        b.grid = b._makeGrid();
        for (let y = 0; y < 9; y++)
            for (let x = 0; x < 9; x++)
                b.grid[y][x].occupiedBy = this.grid[y][x].occupiedBy;
        return b;
    }

    getValidWallPlacements(orientation) {
        const valid = [];
        for (let wy = 0; wy <= 7; wy++) {
            for (let wx = 0; wx <= 7; wx++) {
                if (this.isValidWallPlacement(wx, wy, orientation)) {
                    valid.push({ wx, wy, orientation });
                }
            }
        }
        return valid;
    }
}
