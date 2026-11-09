import { test } from 'node:test';
import assert from 'node:assert/strict';
import bs, { validFleet, randomFleet, cellsOf, FLEET } from '../../explore/party/logic/battleship.js';
import { makeRng } from '../../explore/party/core/rng.js';
import { makeCtx, advance } from './_harness.js';

const FIXED = [
    { type: 'carrier', r: 0, c: 0, dir: 'h' },
    { type: 'battleship', r: 1, c: 0, dir: 'h' },
    { type: 'cruiser', r: 2, c: 0, dir: 'h' },
    { type: 'submarine', r: 3, c: 0, dir: 'h' },
    { type: 'destroyer', r: 4, c: 0, dir: 'h' },
];

test('fleet validation: on grid, no overlaps, exact ships', () => {
    assert.ok(validFleet(FIXED));
    assert.ok(!validFleet(FIXED.slice(0, 4)));
    assert.ok(!validFleet(FIXED.map(s => (s.type === 'destroyer' ? { ...s, r: 0 } : s))), 'overlap');
    assert.ok(!validFleet(FIXED.map(s => (s.type === 'carrier' ? { ...s, c: 6 } : s))), 'off grid');
    const rng = makeRng(11);
    for (let i = 0; i < 30; i++) assert.ok(validFleet(randomFleet(rng)));
});

test('ship positions never reach the opponent or spectators', () => {
    const ctx = makeCtx(bs);
    const s = bs.setup(ctx);
    bs.act(s, 'a', { fleet: FIXED }, ctx);
    bs.act(s, 'b', { random: true }, ctx);
    assert.equal(s.phase, 'battle');
    const vb = bs.view(s, 'b', ctx), vspec = bs.view(s, 'zzz', ctx);
    assert.equal(vb.fleets, null);
    assert.deepEqual(vb.myFleet, s.fleets.b);
    assert.equal(JSON.stringify(vb).includes('"carrier","r":0,"c":0'), false);
    assert.equal(vspec.myFleet, null);
    assert.equal(vspec.fleets, null);
});

test('miss, hit, sunk and win', () => {
    const ctx = makeCtx(bs);
    const s = bs.setup(ctx);
    bs.act(s, 'a', { fleet: FIXED }, ctx);
    bs.act(s, 'b', { fleet: FIXED }, ctx);
    s.turn = 'a';
    bs.act(s, 'a', { cell: 99 }, ctx);
    assert.equal(s.last.result, 'miss');
    assert.equal(s.turn, 'b');
    bs.act(s, 'b', { cell: 98 }, ctx);
    bs.act(s, 'a', { cell: 40 }, ctx);   // destroyer at row 4
    assert.equal(s.last.result, 'hit');
    assert.equal(s.turn, 'a', 'a hit keeps the turn');
    assert.equal(bs.act(s, 'b', { cell: 97 }, ctx).error, 'not_your_turn');
    bs.act(s, 'a', { cell: 41 }, ctx);
    assert.equal(s.last.result, 'sunk');
    assert.equal(s.last.sunk, 'destroyer');
    // Sink the rest quickly
    for (const spec of FLEET) {
        for (const cell of cellsOf({ ...FIXED.find(x => x.type === spec.type), size: spec.size })) {
            if (s.over) break;
            if (s.shots.a[cell]) continue;
            s.turn = 'a';
            bs.act(s, 'a', { cell }, ctx);
        }
    }
    assert.deepEqual(s.over.winners, ['a']);
    assert.ok(bs.view(s, 'b', ctx).fleets.a, 'fleets revealed at the end');
});

test('a hit gives another shot; placement timeout places randomly', () => {
    const ctx = makeCtx(bs);
    const s = bs.setup(ctx);
    advance(bs, s, ctx, 120_000);
    assert.equal(s.phase, 'battle');
    assert.ok(validFleet(s.fleets.a) && validFleet(s.fleets.b));
    const shooter = s.turn, foe = s.players.find(x => x !== shooter);
    const target = cellsOf({ ...s.fleets[foe][0], size: 5 })[0];
    bs.act(s, shooter, { cell: target }, ctx);
    assert.equal(s.turn, shooter, 'hit: shoot again');
});
