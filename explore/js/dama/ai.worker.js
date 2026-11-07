import { DamaBoard } from './Board.js';
import { computeAIMove } from './ai.js';

self.onmessage = e => {
    const { id, payload } = e.data;
    const b = new DamaBoard();
    b.grid = payload.grid;
    self.postMessage({ id, move: computeAIMove(b, payload.player) });
};
