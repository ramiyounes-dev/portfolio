import { makeDuel } from './duel3d.js';
import { DamaBoard } from '../../js/dama/Board.js';

const key = m => JSON.stringify([m.from, ...(m.path && m.path.length ? m.path : [m.to])].map(p => p && [p.row, p.col]));

export default makeDuel({
    id: 'dama',
    newBoard: () => new DamaBoard(),
    legal(b, role, m, trusted) {
        if (trusted) { b.applyMove(m); return m; }
        if (!m || !m.from) return null;
        const piece = b.grid[m.from.row] && b.grid[m.from.row][m.from.col];
        if (!piece || piece.player !== role) return null;
        const found = b.getLegalMoves(role).moves.find(x => key(x) === key(m));
        if (!found) return null;
        const clean = JSON.parse(JSON.stringify(found));
        b.applyMove(clean);
        return clean;
    },
    outcome(b, role) {
        const w = b.checkWin();
        if (w) return w;
        return b.hasLegalMoves(role === 'A' ? 'B' : 'A') ? null : role;
    },
});
