import { test } from 'node:test';
import assert from 'node:assert/strict';
import pc, { pointsFor, hintMask } from '../../explore/party/logic/pictionary.js';
import { makeCtx, advance } from './_harness.js';

function game(players = ['a', 'b', 'c', 'd'], settings = {}) {
    const ctx = makeCtx(pc, { players, settings });
    const s = pc.setup(ctx);
    return { ctx, s };
}

test('points by order: 10, 8, 6, 5, 4 ... minimum 2', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 9].map(pointsFor), [10, 8, 6, 5, 4, 3, 2, 2]);
});

test('drawer chooses 1 of 3; only the drawer sees the word', () => {
    const { ctx, s } = game();
    assert.equal(s.drawer, 'a');
    assert.equal(pc.view(s, 'a', ctx).choices.length, 3);
    assert.equal(pc.view(s, 'b', ctx).choices, null);
    pc.act(s, 'a', { choose: 1 }, ctx);
    assert.equal(s.phase, 'draw');
    assert.equal(pc.view(s, 'b', ctx).word, null);
    assert.ok(pc.view(s, 'a', ctx).word);
});

test('correct guesses are hidden and scored; close guesses get a private hint', () => {
    const { ctx, s } = game();
    pc.act(s, 'a', { choose: 0 }, ctx);
    s.word = 'château';
    const r = pc.act(s, 'b', { guess: 'chateau' }, ctx);
    assert.deepEqual(r, {});
    assert.equal(s.scores.b, 10);
    assert.equal(s.scores.a, 2);
    const close = pc.act(s, 'c', { guess: 'chapeau' }, ctx);
    assert.equal(close.private, 'pc.close');
    assert.equal(JSON.stringify(pc.view(s, 'd', ctx).chat).includes('chateau'), false, 'the right answer never appears in chat');
    pc.act(s, 'c', { guess: 'CHÂTEAU' }, ctx);
    assert.equal(s.scores.c, 8);
    assert.deepEqual(pc.act(s, 'c', { guess: 'again' }, ctx), { error: 'illegal' });
    pc.act(s, 'd', { guess: 'chateau' }, ctx);
    assert.equal(s.phase, 'reveal', 'everyone guessed: turn ends');
    assert.equal(s.scores.a, 6);
});

test('strokes stream as events and are only accepted from the drawer', () => {
    const { ctx, s } = game();
    pc.act(s, 'a', { choose: 0 }, ctx);
    const res = pc.act(s, 'a', { seg: { id: 1, c: '#d93c32', w: 2, pts: [10, 10, 20, 20] } }, ctx);
    assert.equal(res.quiet, true);
    assert.equal(res.event.t, 'seg');
    pc.act(s, 'a', { seg: { id: 1, c: '#d93c32', w: 2, pts: [30, 30] } }, ctx);
    assert.equal(s.strokes.length, 1);
    assert.equal(s.strokes[0].pts.length, 6);
    assert.deepEqual(pc.act(s, 'a', { seg: { id: 2, c: 'red', w: 2, pts: [1, 1] } }, ctx).error, 'illegal');
    assert.notEqual(pc.act(s, 'b', { seg: { id: 3, c: '#d93c32', w: 2, pts: [1, 1] } }, ctx).quiet, true, 'guessers cannot draw (treated as a guess)');
    pc.act(s, 'a', { undo: true }, ctx);
    assert.equal(s.strokes.length, 0);
    assert.deepEqual(pc.sync(s).strokes, []);
});

test('hints reveal letters progressively, never more than half', () => {
    const order = [0, 1, 2, 3, 4, 5, 6, 7];
    assert.equal(hintMask('elephant', order, 0, true).filter(Boolean).length, 0);
    assert.ok(hintMask('elephant', order, 0.9, true).filter(Boolean).length <= 4);
    assert.equal(hintMask('elephant', order, 1, false).filter(Boolean).length, 0);
});

test('rotation: everyone draws N times; late joiners guess now and draw later', () => {
    const { ctx, s } = game(['a', 'b', 'c'], { rotations: 1 });
    pc.join(s, 'd', ctx);
    assert.ok(s.players.includes('d'));
    const drawers = [];
    let guard = 0;
    while (!s.over && guard++ < 20) {
        if (s.phase === 'choose') drawers.push(s.drawer);
        advance(pc, s, ctx, 200_000);
    }
    assert.ok(s.over);
    assert.deepEqual(drawers, ['a', 'b', 'c', 'd']);
});
