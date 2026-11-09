import { boardFrom } from './serialize.js';
import { computeAIMove } from './ai.js';

self.onmessage = e => {
    const { id, payload } = e.data;
    self.postMessage({ id, move: computeAIMove(boardFrom(payload), payload.player, payload.difficulty) });
};
