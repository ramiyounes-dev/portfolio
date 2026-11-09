import { test } from 'node:test';
import assert from 'node:assert/strict';
import nim, { gamePoints, makePiles } from '../../explore/party/logic/nim.js';
import { makeCtx, advance } from './_harness.js';

test('scoring: 2 players and 3+ players, misère and normal', () => {
    assert.deepEqual(gamePoints(['a', 'b'], 'a', 'misere'), { a: 0, b: 1 });
    assert.deepEqual(gamePoints(['a', 'b'], 'a', 'normal'), { a: 1, b: 0 });
    assert.deepEqual(gamePoints(['a', 'b', 'c'], 'b', 'misere'), { a: 1, b: 0, c: 1 });
    assert.deepEqual(gamePoints(['a', 'b', 'c'], 'b', 'normal'), { a: 0, b: 2, c: 0 });
});

test('a move takes at least one from exactly one pile', () => {
    const ctx = makeCtx(nim);
    const s = nim.setup(ctx);
    assert.deepEqual(s.piles, [1, 3, 5, 7]);
    const p = s.turn;
    assert.deepEqual(nim.act(s, p, { pile: 1, take: 0 }, ctx), { error: 'illegal' });
    assert.deepEqual(nim.act(s, p, { pile: 1, take: 4 }, ctx), { error: 'illegal' });
    assert.deepEqual(nim.act(s, p, { pile: 3, take: 7 }, ctx), {});
    assert.deepEqual(s.piles, [1, 3, 5, 0]);
    assert.notEqual(s.turn, p);
});

test('misère: taking the last match loses the game', () => {
    const ctx = makeCtx(nim, { settings: { games: 1 } });
    const s = nim.setup(ctx);
    s.piles = [0, 0, 1, 0];
    const taker = s.turn;
    nim.act(s, taker, { pile: 2, take: 1 }, ctx);
    assert.ok(s.over);
    assert.deepEqual(s.over.winners, [s.players.find(id => id !== taker)]);
});

test('series: the starter rotates and late joiners enter next game', () => {
    const ctx = makeCtx(nim, { players: ['a', 'b'], settings: { games: 3 } });
    const s = nim.setup(ctx);
    const first = s.starter;
    s.piles = [1, 0, 0, 0];
    nim.act(s, s.turn, { pile: 0, take: 1 }, ctx);
    nim.join(s, 'c', ctx);
    advance(nim, s, ctx, 4000);
    assert.equal(s.game, 2);
    assert.notEqual(s.starter, first);
    assert.ok(s.players.includes('c'));
    assert.equal(s.scores.c, 0);
});

test('random preset makes 3 to 5 piles of 1 to 9', () => {
    const ctx = makeCtx(nim, { seed: 7 });
    for (let i = 0; i < 20; i++) {
        const p = makePiles('random', ctx.rng);
        assert.ok(p.length >= 3 && p.length <= 5 && p.every(x => x >= 1 && x <= 9));
    }
});
