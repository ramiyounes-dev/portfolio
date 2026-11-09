import { test } from 'node:test';
import assert from 'node:assert/strict';
import mm, { feedback, validCode } from '../../explore/party/logic/mastermind.js';
import { makeCtx, advance } from './_harness.js';

test('feedback counts duplicates correctly', () => {
    assert.deepEqual(feedback([0, 1, 2, 3], [0, 1, 2, 3]), { black: 4, white: 0 });
    assert.deepEqual(feedback([0, 1, 2, 3], [3, 2, 1, 0]), { black: 0, white: 4 });
    assert.deepEqual(feedback([0, 0, 1, 1], [0, 1, 0, 1]), { black: 2, white: 2 });
    assert.deepEqual(feedback([0, 1, 2, 3], [0, 0, 0, 0]), { black: 1, white: 0 }, 'extra copies are not white');
    assert.deepEqual(feedback([1, 1, 2, 2], [2, 1, 1, 3]), { black: 1, white: 2 });
});

test('code validation respects length, colours and duplicates', () => {
    assert.ok(validCode([0, 1, 2, 5], 4, 6, false));
    assert.ok(!validCode([0, 1, 2, 6], 4, 6, true));
    assert.ok(!validCode([0, 0, 1, 2], 4, 6, false));
    assert.ok(validCode([0, 0, 1, 2], 4, 6, true));
    assert.ok(!validCode([0, 1, 2], 4, 6, true));
});

test('boards are private; scoring is 11 - guesses, +2 for the first crack, codemaker +1 per failure', () => {
    const ctx = makeCtx(mm, { players: ['m', 'a', 'b'], settings: { maxGuesses: 6 } });
    const s = mm.setup(ctx);
    assert.equal(s.maker, 'm');
    mm.act(s, 'm', { code: [1, 2, 3, 4] }, ctx);
    assert.equal(mm.view(s, 'a', ctx).code, null, 'breakers never receive the code');
    mm.act(s, 'a', { guess: [0, 0, 0, 0] }, ctx);
    const vb = mm.view(s, 'b', ctx);
    assert.equal(vb.mine.guesses.length, 0);
    assert.equal(vb.boards, null, 'b cannot see a\'s board during the round');
    assert.equal(vb.progress.a.n, 1);
    mm.act(s, 'a', { guess: [1, 2, 3, 4] }, ctx);
    assert.equal(s.scores.a, 11 - 2 + 2);
    for (let i = 0; i < 6; i++) mm.act(s, 'b', { guess: [5, 5, 5, 5] }, ctx);
    assert.equal(s.phase, 'reveal');
    assert.equal(s.scores.m, 1);
    assert.ok(mm.view(s, 'b', ctx).boards.a, 'boards revealed at the end of the round');
});

test('every player is codemaker once; timeout picks a random code', () => {
    const ctx = makeCtx(mm, { players: ['a', 'b'], settings: { timer: 60 } });
    const s = mm.setup(ctx);
    advance(mm, s, ctx, 46_000);
    assert.equal(s.phase, 'break');
    assert.ok(validCode(s.code, 4, 6, true));
    advance(mm, s, ctx, 60_000);
    assert.equal(s.phase, 'reveal');
    assert.equal(s.scores.a, 1, 'the breaker ran out of time');
    advance(mm, s, ctx, 8000);
    assert.equal(s.maker, 'b');
    mm.act(s, 'b', { random: true }, ctx);
    mm.act(s, 'a', { guess: s.code }, ctx);
    assert.ok(s.over);
});
