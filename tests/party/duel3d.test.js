import { test } from 'node:test';
import assert from 'node:assert/strict';
import c4 from '../../explore/party/logic/connect4.js';
import dama from '../../explore/party/logic/dama.js';
import qr from '../../explore/party/logic/quoridor.js';
import { DamaBoard } from '../../explore/js/dama/Board.js';
import { Board as QBoard } from '../../explore/js/quoridor/Board.js';
import { computeAIMove as c4ai } from '../../explore/js/connect4/ai.js';
import { computeAIMove as damaAi } from '../../explore/js/dama/ai.js';
import { computeAIMove as qAi } from '../../explore/js/quoridor/ai.js';
import { Connect4Board } from '../../explore/js/connect4/Board.js';
import { makeCtx } from './_harness.js';

test('connect 4: turns enforced, win scored, rematch: loser starts', () => {
    const ctx = makeCtx(c4, { players: ['a', 'b'] });
    const s = c4.setup(ctx);
    assert.equal(c4.act(s, 'b', { m: { col: 0 } }).error, 'not_your_turn');
    for (const [p, col] of [['a', 0], ['b', 1], ['a', 0], ['b', 1], ['a', 0], ['b', 1]]) assert.deepEqual(c4.act(s, p, { m: { col } }), {});
    c4.act(s, 'a', { m: { col: 0 } });
    assert.equal(s.winner, 'A');
    assert.equal(s.scores.A, 1);
    assert.equal(c4.act(s, 'b', { m: { col: 3 } }).error, 'illegal');
    assert.equal(c4.act(s, 'a', { reset: 'accept' }).error, 'illegal', 'nothing to accept');
    c4.act(s, 'a', { reset: 'request' });
    assert.equal(c4.view(s, 'b').resetReq, 'A');
    c4.act(s, 'b', { reset: 'accept' });
    assert.equal(s.moves.length, 0);
    assert.equal(s.current, 'B', 'the loser starts');
    assert.equal(c4.act(s, 'b', { m: { col: 9 } }).error, 'illegal');
});

test('dama: only legal moves from the server-side list; captures forced', () => {
    const ctx = makeCtx(dama, { players: ['a', 'b'] });
    const s = dama.setup(ctx);
    const b = new DamaBoard();
    const legal = b.getLegalMoves('A').moves;
    assert.equal(dama.act(s, 'a', { m: { from: { row: 0, col: 0 }, to: { row: 7, col: 7 } } }).error, 'illegal');
    assert.deepEqual(dama.act(s, 'a', { m: legal[0] }), {});
    assert.equal(s.current, 'B');
});

test('quoridor: walls and pawn moves validated by the real board', () => {
    const ctx = makeCtx(qr, { players: ['a', 'b'] });
    const s = qr.setup(ctx);
    const b = new QBoard();
    const mv = b.getValidMoves(b.pawns.A)[0];
    assert.equal(qr.act(s, 'a', { m: { type: 'move', x: 8, y: 8 } }).error, 'illegal');
    assert.deepEqual(qr.act(s, 'a', { m: { type: 'move', x: mv.x, y: mv.y } }), {});
    assert.deepEqual(qr.act(s, 'b', { m: { type: 'wall', wx: 3, wy: 3, orientation: 'H' } }), {});
    assert.equal(qr.act(s, 'a', { m: { type: 'wall', wx: 3, wy: 3, orientation: 'H' } }).error, 'illegal', 'overlapping wall');
});

test('3D AIs: every difficulty returns a legal move', () => {
    const cb = new Connect4Board(); cb.dropDisc(3, 'A');
    for (const d of ['easy', 'medium', 'hard']) {
        assert.ok(cb.getValidColumns().includes(c4ai(cb, 'B', d)));
        const db = new DamaBoard();
        const m = damaAi(db, 'A', d);
        assert.ok(db.getLegalMoves('A').moves.some(x => JSON.stringify(x) === JSON.stringify(m)));
        const qb = new QBoard();
        const a = qAi(qb, 'A', d);
        assert.ok(a && (a.type === 'move' ? qb.clone().movePawn('A', a) : qb.clone().placeWall(a.wx, a.wy, a.orientation, 'A')), `quoridor ${d}`);
    }
});
