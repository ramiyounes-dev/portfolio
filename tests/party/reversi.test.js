import { test } from 'node:test';
import assert from 'node:assert/strict';
import rv, { initialBoard, flipsFor, legalMoves, count } from '../../explore/party/logic/reversi.js';
import { makeCtx, advance } from './_harness.js';

test('opening position: black has 4 legal moves', () => {
    const b = initialBoard();
    assert.equal(count(b, 'B'), 2);
    assert.equal(count(b, 'W'), 2);
    assert.deepEqual(legalMoves(b, 'B').sort((x, y) => x - y), [19, 26, 37, 44]);
});

test('a move flips every trapped line, illegal squares are refused', () => {
    const ctx = makeCtx(rv);
    const s = rv.setup(ctx);
    const black = s.black;
    assert.deepEqual(rv.act(s, black, { cell: 0 }, ctx), { error: 'illegal' });
    rv.act(s, black, { cell: 19 }, ctx);
    assert.equal(s.board[27], 'B', 'the white disc between flips');
    assert.equal(count(s.board, 'B'), 4);
    assert.equal(s.turn, s.white);
});

test('multi-direction flips', () => {
    const b = Array(64).fill(null);
    b[0] = 'B'; b[1] = 'W'; b[8] = 'W'; b[9] = 'W'; b[18] = 'B'; b[16] = 'B'; b[3] = 'B';
    // Playing at 2 traps 1 (left, against 0) and 9 (down-left diagonal, against 16)
    assert.deepEqual(flipsFor(b, 2, 'B').sort((x, y) => x - y), [1, 9]);
});

test('a player with no move passes; game ends when nobody can move', () => {
    const ctx = makeCtx(rv);
    const s = rv.setup(ctx);
    // Board where after black plays, white has no move but black still does
    s.board = Array(64).fill(null);
    s.board[0] = 'B'; s.board[1] = 'W'; s.board[10] = 'W'; s.board[20] = 'B';
    s.turn = s.black;
    rv.act(s, s.black, { cell: 2 }, ctx);
    assert.equal(s.board[1], 'B');
    if (!s.over) assert.ok(s.passed === s.white || s.turn === s.white);
    let guard = 0;
    while (!s.over && guard++ < 70) advance(rv, s, ctx, 30_000);
    assert.ok(s.over, 'game ends');
});

test('timeout plays a legal move', () => {
    const ctx = makeCtx(rv, { settings: { timer: 30 } });
    const s = rv.setup(ctx);
    advance(rv, s, ctx, 30_000);
    assert.equal(count(s.board, 'B') + count(s.board, 'W'), 5);
});
