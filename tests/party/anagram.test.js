import { test } from 'node:test';
import assert from 'node:assert/strict';
import ana, { scramble, isAccepted } from '../../explore/party/logic/anagram.js';
import { makeRng } from '../../explore/party/core/rng.js';
import { fold } from '../../explore/party/core/text.js';
import { makeCtx, advance } from './_harness.js';

test('scramble never equals the word', () => {
    const rng = makeRng(3);
    for (const w of ['LEMON', 'ORANGE', 'AB', 'TOMATO']) {
        for (let i = 0; i < 50; i++) assert.notEqual(scramble(w, rng), w);
    }
});

test('accepted answers: target (any accents/case) or a listed anagram', () => {
    const words = ['lemon', 'melon', 'élève'];
    assert.ok(isAccepted('LEMON', 'melon', words), 'listed anagram');
    assert.ok(isAccepted('Melon', 'melon', words));
    assert.ok(isAccepted('eleve', 'élève', words), 'accent-insensitive');
    assert.ok(!isAccepted('nolem', 'melon', words), 'same letters but not a word');
    assert.ok(!isAccepted('melons', 'melon', words));
});

test('first three correct answers score 3, 2, 1; hint halves; wrong answers are private with a cooldown', () => {
    const ctx = makeCtx(ana, { players: ['a', 'b', 'c', 'd', 'e'] });
    const s = ana.setup(ctx);
    const w = s.word;
    assert.notEqual(s.letters, fold(w));
    const res = ana.act(s, 'a', { answer: 'zzzz' }, ctx);
    assert.equal(res.private, 'ana.wrong');
    assert.deepEqual(ana.act(s, 'a', { answer: w }, ctx), { error: 'cooldown' });
    ctx.now += 1000;
    ana.act(s, 'a', { answer: w }, ctx);
    ana.act(s, 'b', { hint: true }, ctx);
    assert.equal(ana.view(s, 'b', ctx).hint, fold(w)[0]);
    assert.equal(ana.view(s, 'c', ctx).hint, null, 'hint is private');
    ana.act(s, 'b', { answer: w }, ctx);
    ana.act(s, 'c', { answer: w }, ctx);
    ana.act(s, 'd', { answer: w }, ctx);
    assert.deepEqual([s.scores.a, s.scores.b, s.scores.c, s.scores.d], [3, 1, 1, 0]);
    assert.equal(JSON.stringify(ana.view(s, 'e', ctx)).includes(fold(w).toLowerCase()), false, 'the word is not sent during the round');
});

test('round ends when everyone is correct or on timeout; game ends after N rounds', () => {
    const ctx = makeCtx(ana, { players: ['a', 'b'], settings: { rounds: 3 } });
    const s = ana.setup(ctx);
    ana.act(s, 'a', { answer: s.word }, ctx);
    ana.act(s, 'b', { answer: s.word }, ctx);
    assert.equal(s.phase, 'roundEnd');
    ana.join(s, 'c', ctx);
    advance(ana, s, ctx, 5000);
    assert.ok(s.players.includes('c'));
    assert.equal(s.scores.c, 2);
    advance(ana, s, ctx, 30_000);
    advance(ana, s, ctx, 5000);
    advance(ana, s, ctx, 30_000);
    assert.ok(s.over);
});
