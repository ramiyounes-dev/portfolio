import { test } from 'node:test';
import assert from 'node:assert/strict';
import uno, { makeDeck, cardPoints, matches } from '../../explore/party/logic/uno.js';
import { makeCtx, advance } from './_harness.js';

test('deck has 108 cards (216 with two decks)', () => {
    const d = makeDeck();
    assert.equal(d.length, 108);
    assert.equal(d.filter(c => c.v === '0').length, 4);
    assert.equal(d.filter(c => c.v === '7').length, 8);
    assert.equal(d.filter(c => c.v === 'W4').length, 4);
    assert.equal(makeDeck(2).length, 216);
    assert.equal(cardPoints({ v: '7' }), 7);
    assert.equal(cardPoints({ v: 'S' }), 20);
    assert.equal(cardPoints({ v: 'W4' }), 50);
});

test('matching by colour, number or symbol; wilds always', () => {
    const top = { c: 'R', v: '7' };
    assert.ok(matches({ c: 'R', v: '2' }, top, 'R'));
    assert.ok(matches({ c: 'B', v: '7' }, top, 'R'));
    assert.ok(!matches({ c: 'B', v: '2' }, top, 'R'));
    assert.ok(matches({ c: null, v: 'W' }, top, 'R'));
});

function rig(players = ['a', 'b', 'c'], settings = {}) {
    const ctx = makeCtx(uno, { players, settings });
    const s = uno.setup(ctx);
    // Deterministic table
    s.discard = [{ id: 900, c: 'R', v: '5' }];
    s.color = 'R';
    s.dir = 1;
    s.needColor = null;
    s.pendingDraw = 0;
    s.turn = players[0];
    s.drawn = null;
    return { ctx, s };
}

test('hands are private', () => {
    const { ctx, s } = rig();
    const v = uno.view(s, 'b', ctx);
    assert.equal(v.mine.length, 7);
    assert.equal(v.counts.a, 7);
    assert.equal(JSON.stringify(v).includes(JSON.stringify(s.hands.a[0])), false);
});

test('skip, reverse and draw two', () => {
    const { ctx, s } = rig();
    s.hands.a = [{ id: 1, c: 'R', v: 'S' }, { id: 2, c: 'G', v: '1' }, { id: 3, c: 'G', v: '2' }];
    uno.act(s, 'a', { card: 1 }, ctx);
    assert.equal(s.turn, 'c', 'b is skipped');
    s.hands.c = [{ id: 4, c: 'R', v: 'R' }, { id: 5, c: 'G', v: '9' }, { id: 6, c: 'G', v: '8' }];
    uno.act(s, 'c', { card: 4 }, ctx);
    assert.equal(s.dir, -1);
    assert.equal(s.turn, 'b');
    s.hands.b = [{ id: 7, c: 'R', v: 'D' }, { id: 8, c: 'Y', v: '3' }, { id: 9, c: 'Y', v: '4' }];
    const before = s.hands.a.length;
    uno.act(s, 'b', { card: 7 }, ctx);
    assert.equal(s.hands.a.length, before + 2);
    assert.equal(s.turn, 'c', 'a draws two and loses the turn');
});

test('reverse acts as skip with two players', () => {
    const { ctx, s } = rig(['a', 'b']);
    s.hands.a = [{ id: 1, c: 'R', v: 'R' }, { id: 2, c: 'G', v: '1' }, { id: 3, c: 'G', v: '2' }];
    uno.act(s, 'a', { card: 1 }, ctx);
    assert.equal(s.turn, 'a');
});

test('Wild Draw Four challenge: guilty draws 4, innocent makes the challenger draw 6', () => {
    for (const guilty of [true, false]) {
        const { ctx, s } = rig();
        s.hands.a = [{ id: 1, c: null, v: 'W4' }, guilty ? { id: 2, c: 'R', v: '9' } : { id: 2, c: 'G', v: '9' }, { id: 3, c: 'G', v: '2' }];
        uno.act(s, 'a', { card: 1, color: 'B' }, ctx);
        assert.equal(s.phase, 'challenge');
        assert.equal(s.turn, 'b');
        const aBefore = s.hands.a.length, bBefore = s.hands.b.length;
        uno.act(s, 'b', { challenge: true }, ctx);
        if (guilty) { assert.equal(s.hands.a.length, aBefore + 4); assert.equal(s.turn, 'b'); }
        else { assert.equal(s.hands.b.length, bBefore + 6); assert.equal(s.turn, 'c'); }
        assert.equal(s.color, 'B');
    }
});

test('UNO: forgetting to call lets others catch you for +2; calling makes you safe', () => {
    const { ctx, s } = rig();
    s.hands.a = [{ id: 1, c: 'R', v: '3' }, { id: 2, c: 'G', v: '4' }];
    uno.act(s, 'a', { card: 1 }, ctx);
    assert.equal(s.vulnerable, 'a');
    uno.act(s, 'c', { catch: 'a' }, ctx);
    assert.equal(s.hands.a.length, 3);
    const r = rig();
    r.s.hands.a = [{ id: 1, c: 'R', v: '3' }, { id: 2, c: 'G', v: '4' }];
    uno.act(r.s, 'a', { uno: true }, r.ctx);
    uno.act(r.s, 'a', { card: 1 }, r.ctx);
    assert.equal(r.s.vulnerable, null);
    assert.deepEqual(uno.act(r.s, 'c', { catch: 'a' }, r.ctx), { error: 'illegal' });
});

test('drawing a playable card lets you play it; going out scores opponents\' cards', () => {
    const { ctx, s } = rig(['a', 'b'], { target: 'single' });
    s.hands.a = [{ id: 1, c: 'G', v: '1' }];
    s.pile.push({ id: 50, c: 'R', v: '8' });
    uno.act(s, 'a', { draw: true }, ctx);
    assert.equal(s.drawn, 50);
    assert.deepEqual(uno.act(s, 'a', { card: 1 }, ctx), { error: 'illegal' }, 'only the drawn card may be played');
    uno.act(s, 'a', { card: 50 }, ctx);
    s.turn = 'a';
    s.hands.b = [{ id: 60, c: 'Y', v: 'S' }, { id: 61, c: 'Y', v: '9' }, { id: 62, c: null, v: 'W' }];
    s.discard.push({ id: 99, c: 'G', v: '3' });
    s.color = 'G';
    s.unoSafe.a = true;
    uno.act(s, 'a', { card: 1 }, ctx);
    assert.equal(s.scores.a, 20 + 9 + 50);
    assert.deepEqual(s.over.winners, ['a']);
});

test('stacking passes the draw along; timeout draws for an idle player', () => {
    const { ctx, s } = rig(['a', 'b', 'c'], { stacking: true, timer: 30 });
    s.hands.a = [{ id: 1, c: 'R', v: 'D' }, { id: 2, c: 'G', v: '4' }];
    s.hands.b = [{ id: 3, c: 'B', v: 'D' }, { id: 4, c: 'G', v: '6' }];
    s.unoSafe.a = true;
    uno.act(s, 'a', { card: 1 }, ctx);
    assert.equal(s.turn, 'b');
    uno.act(s, 'b', { card: 3 }, ctx);
    assert.equal(s.pendingDraw, 4);
    const cBefore = s.hands.c.length;
    uno.act(s, 'c', { draw: true }, ctx);
    assert.equal(s.hands.c.length, cBefore + 4);
    const idle = s.turn;
    const n = s.hands[idle].length;
    advance(uno, s, ctx, 30_000);
    assert.ok(s.hands[idle].length >= n, 'idle player drew');
    assert.notEqual(s.turn, idle);
});
