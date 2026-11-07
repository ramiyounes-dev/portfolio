import { Board } from './Board.js';

/** Rebuild a Board from a plain snapshot (used by the AI worker and its main-thread fallback). */
export function boardFrom(p) {
    const b = new Board();
    b.walls = new Set(p.walls);
    b.wallOwners = { ...p.wallOwners };
    b.wallCounts = { ...p.wallCounts };
    b.pawns = { A: { ...p.pawns.A }, B: { ...p.pawns.B } };
    for (const row of b.grid) for (const cell of row) cell.occupiedBy = null;
    b.grid[b.pawns.A.y][b.pawns.A.x].occupiedBy = 'A';
    b.grid[b.pawns.B.y][b.pawns.B.x].occupiedBy = 'B';
    return b;
}
