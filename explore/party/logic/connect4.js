import { makeDuel } from './duel3d.js';
import { Connect4Board } from '../../js/connect4/Board.js';

export default makeDuel({
    id: 'connect4',
    newBoard: () => new Connect4Board(),
    legal(b, role, m, trusted) {
        const col = Number(m && m.col);
        if (!trusted && (!Number.isInteger(col) || !b.getValidColumns().includes(col))) return null;
        b.dropDisc(col, role);
        return { type: 'drop', col };
    },
    outcome: b => b.checkWin() || (b.isFull() ? 'draw' : null),
});
