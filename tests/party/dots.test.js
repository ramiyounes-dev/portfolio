import { test } from 'node:test';
import assert from 'node:assert/strict';
import dots, { sizeFor, scoresOf, freeEdges } from '../../explore/party/logic/dots.js';
import { makeCtx, advance } from './_harness.js';

test('board size scales with players', () => {
    assert.equal(sizeFor(2), 4);
    assert.equal(sizeFor(4), 5);
    assert.equal(sizeFor(6), 6);
    assert.equal(sizeFor(2, '7'), 7);
});

test('closing a box claims it and the same player plays again', () => {
    const ctx = makeCtx(dots, { settings: { size: '3' } });
    const s = dots.setup(ctx);
    const [a, b] = s.players;
    dots.act(s, a, { kind: 'h', r: 0, c: 0 }, ctx);      // a, turn passes
    assert.equal(s.turn, b);
    dots.act(s, b, { kind: 'h', r: 1, c: 0 }, ctx);
    dots.act(s, a, { kind: 'v', r: 0, c: 0 }, ctx);
    assert.equal(s.turn, b);
    dots.act(s, b, { kind: 'v', r: 0, c: 1 }, ctx);      // fourth side: b claims box (0,0)
    assert.equal(s.boxes[0], b);
    assert.equal(s.turn, b, 'b plays again');
    assert.equal(scoresOf(s)[b], 1);
});

test('one line can close two boxes', () => {
    const ctx = makeCtx(dots, { settings: { size: '3' } });
    const s = dots.setup(ctx);
    const a = s.players[0];
    // boxes (0,0) and (0,1) share the vertical line at c=1
    for (const [k, r, c] of [['h', 0, 0], ['h', 1, 0], ['v', 0, 0], ['h', 0, 1], ['h', 1, 1], ['v', 0, 2]]) {
        const key = k === 'h' ? r * 3 + c : r * 4 + c;
        (k === 'h' ? s.h : s.v)[key] = 'x';
    }
    s.turn = a;
    dots.act(s, a, { kind: 'v', r: 0, c: 1 }, ctx);
    assert.equal(s.boxes[0], a);
    assert.equal(s.boxes[1], a);
});

test('illegal lines are refused; the game ends when every line is drawn', () => {
    const ctx = makeCtx(dots, { settings: { size: '3', timer: 5 } });
    const s = dots.setup(ctx);
    assert.deepEqual(dots.act(s, s.turn, { kind: 'h', r: 9, c: 0 }, ctx), { error: 'illegal' });
    dots.act(s, s.turn, { kind: 'h', r: 0, c: 0 }, ctx);
    assert.deepEqual(dots.act(s, s.turn, { kind: 'h', r: 0, c: 0 }, ctx), { error: 'illegal' });
    let guard = 0;
    while (!s.over && guard++ < 100) advance(dots, s, ctx, 5000);   // timeouts draw random lines
    assert.ok(s.over);
    assert.equal(freeEdges(s).length, 0);
    assert.equal(s.boxes.filter(Boolean).length, 9);
});

test('late joiner enters with a bonus equal to the lowest score', () => {
    const ctx = makeCtx(dots, { settings: { size: '3' } });
    const s = dots.setup(ctx);
    s.boxes[0] = 'a'; s.boxes[1] = 'a'; s.boxes[2] = 'b';
    dots.join(s, 'c', ctx);
    assert.equal(scoresOf(s).c, 1);
    assert.equal(s.players.at(-1), 'c');
});
