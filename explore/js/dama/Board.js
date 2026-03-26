export class DamaBoard {
    constructor() {
        this.size = 8;
        this.grid = this._makeGrid();
        this._setup();
    }

    _makeGrid() {
        return Array.from({ length: 8 }, () => Array(8).fill(null));
    }

    _setup() {
        for (let c = 0; c < 8; c++) {
            this.grid[1][c] = { player: 'A', king: false };
            this.grid[2][c] = { player: 'A', king: false };
            this.grid[5][c] = { player: 'B', king: false };
            this.grid[6][c] = { player: 'B', king: false };
        }
    }

    _inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
    _promoRow(player) { return player === 'A' ? 7 : 0; }
    _forward(player) { return player === 'A' ? 1 : -1; }

    getPieces(player) {
        const pieces = [];
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (this.grid[r][c]?.player === player)
                    pieces.push({ row: r, col: c, ...this.grid[r][c] });
        return pieces;
    }

    pieceCount(player) {
        let n = 0;
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (this.grid[r][c]?.player === player) n++;
        return n;
    }

    /* ── Capture logic ── */

    findCapturesForPiece(row, col) {
        const piece = this.grid[row][col];
        if (!piece) return [];
        const gridCopy = this.grid.map(r => r.map(c => c ? { ...c } : null));
        gridCopy[row][col] = null;
        return this._captureSearch(row, col, piece, gridCopy);
    }

    _captureSearch(row, col, piece, grid) {
        const enemy = piece.player === 'A' ? 'B' : 'A';
        const sequences = [];

        if (piece.king) {
            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                let er = row + dr, ec = col + dc;
                while (this._inBounds(er, ec) && !grid[er][ec]) { er += dr; ec += dc; }
                if (!this._inBounds(er, ec) || grid[er][ec]?.player !== enemy) continue;

                const saved = grid[er][ec];
                grid[er][ec] = null;

                let lr = er + dr, lc = ec + dc;
                while (this._inBounds(lr, lc) && !grid[lr][lc]) {
                    const sub = this._captureSearch(lr, lc, piece, grid);
                    if (sub.length === 0) {
                        sequences.push({ path: [{ row: lr, col: lc }], captured: [{ row: er, col: ec }] });
                    } else {
                        for (const s of sub)
                            sequences.push({
                                path: [{ row: lr, col: lc }, ...s.path],
                                captured: [{ row: er, col: ec }, ...s.captured]
                            });
                    }
                    lr += dr; lc += dc;
                }

                grid[er][ec] = saved;
            }
        } else {
            const fwd = this._forward(piece.player);
            for (const [dr, dc] of [[fwd, 0], [0, 1], [0, -1]]) {
                const er = row + dr, ec = col + dc;
                const lr = row + 2 * dr, lc = col + 2 * dc;
                if (!this._inBounds(lr, lc)) continue;
                if (grid[er]?.[ec]?.player !== enemy) continue;
                if (grid[lr][lc]) continue;

                const saved = grid[er][ec];
                grid[er][ec] = null;

                if (lr === this._promoRow(piece.player)) {
                    sequences.push({
                        path: [{ row: lr, col: lc }],
                        captured: [{ row: er, col: ec }],
                        promotes: true
                    });
                } else {
                    const sub = this._captureSearch(lr, lc, piece, grid);
                    if (sub.length === 0) {
                        sequences.push({
                            path: [{ row: lr, col: lc }],
                            captured: [{ row: er, col: ec }]
                        });
                    } else {
                        for (const s of sub)
                            sequences.push({
                                path: [{ row: lr, col: lc }, ...s.path],
                                captured: [{ row: er, col: ec }, ...s.captured]
                            });
                    }
                }

                grid[er][ec] = saved;
            }
        }

        return sequences;
    }

    getAllCaptures(player) {
        const all = [];
        for (const p of this.getPieces(player)) {
            for (const seq of this.findCapturesForPiece(p.row, p.col))
                all.push({ from: { row: p.row, col: p.col }, ...seq });
        }
        if (all.length === 0) return [];
        const maxLen = Math.max(...all.map(c => c.captured.length));
        return all.filter(c => c.captured.length === maxLen);
    }

    /* ── Simple moves ── */

    getSimpleMoves(player) {
        const moves = [];
        const fwd = this._forward(player);
        for (const p of this.getPieces(player)) {
            const piece = this.grid[p.row][p.col];
            if (piece.king) {
                for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    let r = p.row + dr, c = p.col + dc;
                    while (this._inBounds(r, c) && !this.grid[r][c]) {
                        moves.push({ from: { row: p.row, col: p.col }, to: { row: r, col: c } });
                        r += dr; c += dc;
                    }
                }
            } else {
                for (const [dr, dc] of [[fwd, 0], [0, 1], [0, -1]]) {
                    const r = p.row + dr, c = p.col + dc;
                    if (this._inBounds(r, c) && !this.grid[r][c])
                        moves.push({ from: { row: p.row, col: p.col }, to: { row: r, col: c } });
                }
            }
        }
        return moves;
    }

    getLegalMoves(player) {
        const captures = this.getAllCaptures(player);
        if (captures.length > 0) return { type: 'capture', moves: captures };
        return { type: 'move', moves: this.getSimpleMoves(player) };
    }

    hasLegalMoves(player) {
        return this.getLegalMoves(player).moves.length > 0;
    }

    /* ── Apply & check ── */

    applyMove(move) {
        const piece = this.grid[move.from.row][move.from.col];
        if (!piece) return false;
        this.grid[move.from.row][move.from.col] = null;

        if (move.captured && move.captured.length > 0) {
            for (const cap of move.captured) this.grid[cap.row][cap.col] = null;
            const final = move.path[move.path.length - 1];
            if (final.row === this._promoRow(piece.player)) piece.king = true;
            this.grid[final.row][final.col] = piece;
        } else {
            if (move.to.row === this._promoRow(piece.player)) piece.king = true;
            this.grid[move.to.row][move.to.col] = piece;
        }
        return true;
    }

    checkWin() {
        if (this.pieceCount('A') === 0) return 'B';
        if (this.pieceCount('B') === 0) return 'A';
        return null;
    }

    clone() {
        const b = new DamaBoard();
        b.grid = this.grid.map(r => r.map(c => c ? { ...c } : null));
        return b;
    }
}
