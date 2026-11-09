import { test } from 'node:test';
import assert from 'node:assert/strict';
import ttt, { winLine } from '../../explore/party/logic/tictactoe.js';
import { makeCtx, advance } from './_harness.js';

test('winLine finds rows, columns and diagonals', () => {
    assert.deepEqual(winLine(['X', 'X', 'X', null, null, null, null, null, null]), [0, 1, 2]);
    assert.deepEqual(winLine(['O', null, null, 'O', null, null, 'O', null, null]), [0, 3, 6]);
    assert.deepEqual(winLine([null, null, 'X', null, 'X', null, 'X', null, null]), [2, 4, 6]);
    assert.equal(winLine(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']), null);
});

test('turns alternate, illegal moves are rejected', () => {
    const ctx = makeCtx(ttt);
    const s = ttt.setup(ctx);
    const first = s.turn, second = s.players.find(p => p !== first);
    assert.equal(first, s.x);
    assert.deepEqual(ttt.act(s, second, { cell: 0 }, ctx), { error: 'not_your_turn' });
    assert.deepEqual(ttt.act(s, first, { cell: 4 }, ctx), {});
    assert.deepEqual(ttt.act(s, second, { cell: 4 }, ctx), { error: 'illegal' });
    assert.deepEqual(ttt.act(s, second, { cell: 9 }, ctx), { error: 'illegal' });
    assert.equal(s.turn, second);
});

test('a line wins the game and the match ends at best-of', () => {
    const ctx = makeCtx(ttt, { settings: { bestOf: 1 } });
    const s = ttt.setup(ctx);
    const x = s.x, o = s.players.find(p => p !== x);
    for (const [p, c] of [[x, 0], [o, 3], [x, 1], [o, 4], [x, 2]]) ttt.act(s, p, { cell: c }, ctx);
    assert.deepEqual(s.line, [0, 1, 2]);
    assert.equal(s.wins[x], 1);
    assert.deepEqual(s.over.winners, [x]);
});

test('best of 3: X alternates and draws do not count', () => {
    const ctx = makeCtx(ttt, { settings: { bestOf: 3 } });
    const s = ttt.setup(ctx);
    const x1 = s.x;
    // Game 1: draw
    const o1 = s.players.find(p => p !== x1);
    for (const [p, c] of [[x1, 0], [o1, 1], [x1, 2], [o1, 4], [x1, 3], [o1, 5], [x1, 7], [o1, 6], [x1, 8]]) ttt.act(s, p, { cell: c }, ctx);
    assert.deepEqual(s.result, { draw: true });
    assert.equal(s.over, undefined);
    advance(ttt, s, ctx, 3000);
    assert.equal(s.game, 2);
    assert.notEqual(s.x, x1, 'X switches to the other player');
    assert.equal(s.turn, s.x);
});

test('the timer plays a random square for an idle player', () => {
    const ctx = makeCtx(ttt, { settings: { timer: 10 } });
    const s = ttt.setup(ctx);
    const idle = s.turn;
    advance(ttt, s, ctx, 10_000);
    assert.equal(s.cells.filter(Boolean).length, 1);
    assert.notEqual(s.turn, idle);
});

test('views never leak more than the public board', () => {
    const ctx = makeCtx(ttt);
    const s = ttt.setup(ctx);
    const v = ttt.view(s, 'zzz', ctx);
    assert.ok(Array.isArray(v.cells));
    assert.equal(v.cells.length, 9);
});
