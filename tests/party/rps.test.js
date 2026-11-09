import { test } from 'node:test';
import assert from 'node:assert/strict';
import rps, { scoreRound, beats } from '../../explore/party/logic/rps.js';
import { makeCtx, advance } from './_harness.js';

test('classic and Lizard-Spock relations', () => {
    assert.ok(beats('rock', 'scissors') && beats('scissors', 'paper') && beats('paper', 'rock'));
    assert.ok(beats('spock', 'rock') && beats('lizard', 'spock') && beats('scissors', 'lizard') && beats('paper', 'spock'));
    assert.ok(!beats('rock', 'paper'));
});

test('duel: winner gets +1, tie scores nothing', () => {
    assert.deepEqual(scoreRound({ a: 'rock', b: 'scissors' }, 'classic'), { a: 1, b: 0 });
    assert.deepEqual(scoreRound({ a: 'rock', b: 'rock' }, 'classic'), { a: 0, b: 0 });
});

test('free-for-all: +1 per player beaten; all three or all same scores nothing', () => {
    assert.deepEqual(scoreRound({ a: 'rock', b: 'scissors', c: 'scissors' }, 'classic'), { a: 2, b: 0, c: 0 });
    assert.deepEqual(scoreRound({ a: 'rock', b: 'paper', c: 'scissors' }, 'classic'), { a: 0, b: 0, c: 0 });
    assert.deepEqual(scoreRound({ a: 'paper', b: 'paper', c: 'paper' }, 'classic'), { a: 0, b: 0, c: 0 });
    // Spock variant keeps pairwise scoring even with many shapes
    assert.deepEqual(scoreRound({ a: 'spock', b: 'rock', c: 'scissors' }, 'spock'), { a: 2, b: 1, c: 0 });
});

test('picks stay secret until everyone has chosen', () => {
    const ctx = makeCtx(rps, { players: ['a', 'b', 'c'] });
    const s = rps.setup(ctx);
    rps.act(s, 'a', { pick: 'rock' }, ctx);
    const vb = rps.view(s, 'b', ctx);
    assert.equal(vb.mine, null);
    assert.equal(vb.last, null);
    assert.deepEqual(vb.chosen, ['a']);
    assert.equal(JSON.stringify(vb).includes('rock'), false, 'b cannot see a\'s pick');
    rps.act(s, 'b', { pick: 'scissors' }, ctx);
    rps.act(s, 'c', { pick: 'scissors' }, ctx);
    assert.equal(s.phase, 'reveal');
    assert.equal(s.scores.a, 2);
});

test('timer picks at random for idle players, late joiners start at the lowest score', () => {
    const ctx = makeCtx(rps, { players: ['a', 'b'] });
    const s = rps.setup(ctx);
    rps.act(s, 'a', { pick: 'paper' }, ctx);
    advance(rps, s, ctx, 10_000);                 // b idles: random pick, reveal
    assert.equal(s.phase, 'reveal');
    assert.ok(s.last.auto.includes('b'));
    s.scores = { a: 3, b: 1 };
    rps.join(s, 'c', ctx);
    assert.ok(!s.players.includes('c'), 'waits for the next round');
    advance(rps, s, ctx, 4000);                   // next round
    assert.ok(s.players.includes('c'));
    assert.equal(s.scores.c, 1);
    assert.ok(s.late.includes('c'));
});

test('duel ends at the target score', () => {
    const ctx = makeCtx(rps, { players: ['a', 'b'], settings: { target: 2 } });
    const s = rps.setup(ctx);
    for (let r = 0; r < 2; r++) {
        rps.act(s, 'a', { pick: 'rock' }, ctx);
        rps.act(s, 'b', { pick: 'scissors' }, ctx);
        if (!s.over) advance(rps, s, ctx, 4000);
    }
    assert.deepEqual(s.over.winners, ['a']);
});
