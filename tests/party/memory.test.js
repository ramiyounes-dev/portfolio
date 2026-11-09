import { test } from 'node:test';
import assert from 'node:assert/strict';
import mem, { cardsFor } from '../../explore/party/logic/memory.js';
import { makeCtx, advance } from './_harness.js';

test('grid scales from 16 to 36 cards', () => {
    assert.equal(cardsFor(2), 16);
    assert.equal(cardsFor(4), 24);
    assert.equal(cardsFor(8), 36);
    assert.equal(cardsFor(2, '30'), 30);
});

test('hidden faces are never sent', () => {
    const ctx = makeCtx(mem);
    const s = mem.setup(ctx);
    const v = mem.view(s, 'a', ctx);
    assert.equal(v.cards.filter(Boolean).length, 0);
    mem.act(s, s.turn, { card: 0 }, ctx);
    const v2 = mem.view(s, 'b', ctx);
    assert.equal(v2.cards.filter(Boolean).length, 1);
    assert.equal(v2.cards[0], s.faces[0]);
});

test('a pair scores and the player goes again; a miss shows then passes the turn', () => {
    const ctx = makeCtx(mem);
    const s = mem.setup(ctx);
    const a = s.turn;
    const j = s.faces.findIndex((f, i) => i > 0 && f === s.faces[0]);
    mem.act(s, a, { card: 0 }, ctx);
    mem.act(s, a, { card: j }, ctx);
    assert.equal(s.pairs[a], 1);
    assert.equal(s.turn, a);
    const k = s.faces.findIndex((f, i) => !s.matched[i] && i !== 0);
    const miss = s.faces.findIndex((f, i) => !s.matched[i] && f !== s.faces[k]);
    mem.act(s, a, { card: k }, ctx);
    mem.act(s, a, { card: miss }, ctx);
    assert.equal(s.phase, 'showing');
    assert.deepEqual(mem.act(s, a, { card: 3 }, ctx), { error: 'illegal' }, 'no flipping while cards show');
    advance(mem, s, ctx, 1600);
    assert.notEqual(s.turn, a);
    assert.equal(mem.view(s, 'b', ctx).cards.filter(Boolean).length, 2, 'only the matched pair stays visible');
});

test('game ends when all pairs are found; late joiners get the lowest count', () => {
    const ctx = makeCtx(mem);
    const s = mem.setup(ctx);
    s.pairs = { a: 3, b: 1 };
    mem.join(s, 'c', ctx);
    assert.equal(mem.view(s, 'c', ctx).scores.c, 1);
    // Solve the board
    const seen = new Map();
    s.faces.forEach((f, i) => { (seen.get(f) || seen.set(f, []).get(f)).push(i); });
    for (const [, [x, y]] of seen) { s.flipped = []; s.phase = 'pick'; mem.act(s, s.turn, { card: x }, ctx); mem.act(s, s.turn, { card: y }, ctx); }
    assert.ok(s.over);
});

import { THEMES } from '../../explore/party/logic/memory.js';
import { DRAWINGS } from '../../explore/party/ai/drawings.js';

test('every Memory card face is a picture from the drawing library, with enough pairs for 36 cards', () => {
    const keys = new Set(DRAWINGS.map(d => d.en));
    for (const [name, list] of Object.entries(THEMES)) {
        assert.ok(new Set(list).size >= 18, `${name} has 18+ pictures`);
        for (const k of list) assert.ok(keys.has(k), `${name}: ${k} exists`);
    }
});
