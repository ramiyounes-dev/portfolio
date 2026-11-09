import { makeDuel } from './duel3d.js';
import { Board } from '../../js/quoridor/Board.js';

export default makeDuel({
    id: 'quoridor',
    newBoard: () => new Board(),
    legal(b, role, m, trusted) {
        if (!m) return null;
        if (m.type === 'move') {
            const x = Number(m.x), y = Number(m.y);
            if (!trusted && !(Number.isInteger(x) && Number.isInteger(y))) return null;
            return b.movePawn(role, { x, y }) || trusted ? { type: 'move', x, y } : null;
        }
        if (m.type === 'wall') {
            const wx = Number(m.wx), wy = Number(m.wy), o = m.orientation;
            if (!trusted && !(Number.isInteger(wx) && Number.isInteger(wy) && (o === 'H' || o === 'V'))) return null;
            return b.placeWall(wx, wy, o, role) || trusted ? { type: 'wall', wx, wy, orientation: o } : null;
        }
        return null;
    },
    outcome: b => b.checkWin(),
});
