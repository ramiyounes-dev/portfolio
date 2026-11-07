/* Runs a game's AI in a Web Worker so the page never freezes while it thinks.
   Falls back to the main thread (after a frame) if module workers are unavailable. */

import { wait } from './anim.js';

export function createAI(workerUrl, fallback) {
    let worker = null;
    let seq = 0;
    const pending = new Map();

    try {
        worker = new Worker(workerUrl, { type: 'module' });
        worker.onmessage = e => {
            const cb = pending.get(e.data.id);
            pending.delete(e.data.id);
            if (cb) cb(e.data.move);
        };
        worker.onerror = () => {
            // Worker failed (e.g. no module-worker support): finish pending jobs on the main thread
            worker = null;
            for (const [, cb] of pending) cb(undefined);
            pending.clear();
        };
    } catch (e) {
        worker = null;
    }

    function compute(payload) {
        if (!worker) return wait(30).then(() => fallback(payload));
        return new Promise(resolve => {
            const id = ++seq;
            pending.set(id, move => resolve(move === undefined ? fallback(payload) : move));
            worker.postMessage({ id, payload });
        });
    }

    return {
        /** Resolves with the AI move, never sooner than minMs so the reply reads as a turn. */
        async think(payload, minMs = 550) {
            const start = performance.now();
            const move = await compute(payload);
            await wait(minMs - (performance.now() - start));
            return move;
        },
    };
}
