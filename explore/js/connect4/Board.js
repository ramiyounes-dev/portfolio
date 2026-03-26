export class Connect4Board {
    constructor() {
        this.rows = 6;
        this.cols = 7;
        this.grid = this._makeGrid();
    }

    _makeGrid() {
        return Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    }

    dropDisc(col, player) {
        if (col < 0 || col >= this.cols) return -1;
        for (let r = 0; r < this.rows; r++) {
            if (!this.grid[r][col]) {
                this.grid[r][col] = player;
                return r;
            }
        }
        return -1;
    }

    getValidColumns() {
        const cols = [];
        for (let c = 0; c < this.cols; c++) {
            if (!this.grid[this.rows - 1][c]) cols.push(c);
        }
        return cols;
    }

    isFull() { return this.getValidColumns().length === 0; }

    checkWin() {
        const g = this.grid;
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = g[r][c];
                if (!p) continue;
                for (const [dr, dc] of dirs) {
                    let count = 1;
                    for (let i = 1; i < 4; i++) {
                        const nr = r + dr * i, nc = c + dc * i;
                        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) break;
                        if (g[nr][nc] !== p) break;
                        count++;
                    }
                    if (count >= 4) return p;
                }
            }
        }
        return null;
    }

    getWinningCells() {
        const g = this.grid;
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = g[r][c];
                if (!p) continue;
                for (const [dr, dc] of dirs) {
                    const cells = [{ row: r, col: c }];
                    for (let i = 1; i < 4; i++) {
                        const nr = r + dr * i, nc = c + dc * i;
                        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) break;
                        if (g[nr][nc] !== p) break;
                        cells.push({ row: nr, col: nc });
                    }
                    if (cells.length >= 4) return cells;
                }
            }
        }
        return null;
    }

    discCount(player) {
        let n = 0;
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if (this.grid[r][c] === player) n++;
        return n;
    }

    clone() {
        const b = new Connect4Board();
        b.grid = this.grid.map(r => [...r]);
        return b;
    }
}
