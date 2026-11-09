import { test } from 'node:test';
import assert from 'node:assert/strict';
import ut, { legalMoves, smallResult, bigLine } from '../../explore/party/logic/ultimate.js';
import { makeCtx, advance } from './_harness.js';

test('first move can go anywhere, then the square picks the next board', () => {
    const ctx = makeCtx(ut);
    const s = ut.setup(ctx);
    assert.equal(legalMoves(s).length, 81);
    ut.act(s, s.turn, { cell: 0 * 9 + 2 }, ctx);            // top-left board, top-right square
    const moves = legalMoves(s);
    assert.equal(moves.length, 9);
    assert.ok(moves.every(m => Math.floor(m / 9) === 2), 'opponent is sent to the top-right board');
});

test('sent to a finished board means play anywhere open', () => {
    const ctx = makeCtx(ut);
    const s = ut.setup(ctx);
    s.small[4] = 'X';
    s.next = 4;
    const boards = new Set(legalMoves(s).map(m => Math.floor(m / 9)));
    assert.equal(boards.size, 8);
    assert.ok(!boards.has(4));
});

test('small board results and big line', () => {
    const cells = Array(81).fill(null);
    cells[9 + 0] = cells[9 + 4] = cells[9 + 8] = 'O';
    assert.equal(smallResult(cells, 1), 'O');
    const full = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    full.forEach((v, i) => { cells[18 + i] = v; });
    assert.equal(smallResult(cells, 2), 'D');
    assert.deepEqual(bigLine(['X', 'X', 'X', null, 'D', null, null, null, null]), [0, 1, 2]);
    assert.equal(bigLine(['X', 'D', 'X', null, null, null, null, null, null]), null, 'a drawn board blocks the line');
});

test('winning three small boards in a row wins the game', () => {
    const ctx = makeCtx(ut);
    const s = ut.setup(ctx);
    const x = s.x;
    s.small = ['X', 'X', null, 'O', 'O', null, null, null, null];
    // X wins board 2 with its last square
    s.cells[18] = s.cells[19] = 'X';
    s.next = 2;
    s.turn = x;
    ut.act(s, x, { cell: 20 }, ctx);
    assert.deepEqual(s.line, [0, 1, 2]);
    assert.deepEqual(s.over.winners, [x]);
});

test('timeout plays a legal random move', () => {
    const ctx = makeCtx(ut, { settings: { timer: 30 } });
    const s = ut.setup(ctx);
    const first = s.turn;
    advance(ut, s, ctx, 30_000);
    assert.equal(s.cells.filter(Boolean).length, 1);
    assert.notEqual(s.turn, first);
});
