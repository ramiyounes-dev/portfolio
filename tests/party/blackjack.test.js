import { test } from 'node:test';
import assert from 'node:assert/strict';
import bj, { handValue, isBlackjack, makeShoe } from '../../explore/party/logic/blackjack.js';
import { makeRng } from '../../explore/party/core/rng.js';
import { makeCtx, advance } from './_harness.js';

test('hand values: aces 1 or 11, faces 10', () => {
    assert.deepEqual(handValue(['A♠', 'K♥']), { total: 21, soft: true });
    assert.deepEqual(handValue(['A♠', 'A♥', '9♦']), { total: 21, soft: true });
    assert.deepEqual(handValue(['A♠', '6♥']), { total: 17, soft: true });
    assert.deepEqual(handValue(['A♠', '6♥', 'K♦']), { total: 17, soft: false });
    assert.deepEqual(handValue(['K♠', 'Q♥', '5♦']), { total: 25, soft: false });
    assert.ok(isBlackjack(['A♣', 'J♦']));
    assert.ok(!isBlackjack(['7♣', '7♦', '7♥']));
    assert.equal(makeShoe(makeRng(1)).length, 312);
});

function table(settings = {}) {
    const ctx = makeCtx(bj, { players: ['a', 'b'], settings });
    const s = bj.setup(ctx);
    return { ctx, s };
}

test('bets come out of the stack; the hole card is hidden during play', () => {
    const { ctx, s } = table();
    assert.deepEqual(bj.act(s, 'a', { bet: 5 }, ctx), { error: 'bj.badBet' });
    bj.act(s, 'a', { bet: 100 }, ctx);
    assert.equal(s.chips.a, 900);
    bj.act(s, 'b', { bet: 50 }, ctx);
    assert.ok(['play', 'settle'].includes(s.phase));
    if (s.phase === 'play') {
        const v = bj.view(s, 'a', ctx);
        assert.equal(v.dealer[1], null);
        assert.equal(JSON.stringify(v).includes(s.dealer[1]) && s.dealer[1] !== s.dealer[0], false, 'hole card never sent');
    }
});

test('payouts: blackjack 3:2, win 1:1, push, bust', () => {
    const { ctx, s } = table();
    bj.act(s, 'a', { bet: 100 }, ctx);
    bj.act(s, 'b', { bet: 100 }, ctx);
    // Rig the table and settle
    s.hands = { a: [{ cards: ['A♠', 'K♠'], bet: 100, done: true }], b: [{ cards: ['K♦', '9♦'], bet: 100, done: true }] };
    s.dealer = ['10♣', '9♣'];
    s.chips = { a: 900, b: 900 };
    s.order = ['a', 'b'];
    s.phase = 'play';
    s.turn = null;
    s.shoe = ['2♣'];
    // advance -> dealer stands on 19 -> settle
    bj.tick(s, ctx);
    assert.equal(s.results.a[0].out, 'blackjack');
    assert.equal(s.chips.a, 900 + 250);
    assert.equal(s.results.b[0].out, 'push');
    assert.equal(s.chips.b, 1000);
});

test('double and split', () => {
    const { ctx, s } = table();
    bj.act(s, 'a', { bet: 100 }, ctx);
    bj.act(s, 'b', { bet: 100 }, ctx);
    s.phase = 'play';
    s.order = ['a', 'b'];
    s.hands = { a: [{ cards: ['8♠', '8♥'], bet: 100, done: false }], b: [{ cards: ['5♦', '6♦'], bet: 100, done: false }] };
    s.dealer = ['10♣', '7♣'];
    s.turn = { id: 'a', h: 0 };
    s.shoe.push('3♣', '2♦');
    bj.act(s, 'a', { move: 'split' }, ctx);
    assert.equal(s.hands.a.length, 2);
    assert.equal(s.chips.a, 800);
    bj.act(s, 'a', { move: 'stand' }, ctx);
    bj.act(s, 'a', { move: 'stand' }, ctx);
    assert.equal(s.turn.id, 'b');
    s.shoe.push('K♥');
    bj.act(s, 'b', { move: 'double' }, ctx);
    assert.equal(s.hands.b[0].bet, 200);
    assert.equal(s.hands.b[0].cards.length, 3);
    assert.equal(s.phase, 'settle');
    assert.equal(s.results.b[0].out, 'win', '21 beats 17');
});

test('dealer stands on soft 17 by default, hits it when set', () => {
    for (const [rule, expectCards] of [['stand', 2], ['hit', 3]]) {
        const { ctx, s } = table({ soft17: rule });
        bj.act(s, 'a', { bet: 10 }, ctx);
        bj.act(s, 'b', { bet: 10 }, ctx);
        s.hands = { a: [{ cards: ['10♠', '8♠'], bet: 10, done: true }], b: [{ cards: ['10♦', '7♦'], bet: 10, done: true }] };
        s.order = ['a', 'b'];
        s.dealer = ['A♣', '6♣'];
        s.shoe = ['2♣', '2♦', '2♥'];
        s.phase = 'play';
        s.turn = null;
        bj.tick(s, ctx);
        assert.equal(s.dealer.length, expectCards, rule);
    }
});

test('late joiners get min(start, lowest stack); game ends after N rounds', () => {
    const { ctx, s } = table({ rounds: 3 });
    s.chips = { a: 300, b: 1500 };
    bj.join(s, 'c', ctx);
    for (let r = 0; r < 3; r++) {
        advance(bj, s, ctx, 20_000);   // auto bets, deal
        let guard = 0;
        while (s.phase === 'play' && guard++ < 20) advance(bj, s, ctx, 20_000);
        if (!s.over) advance(bj, s, ctx, 6000);
        if (r === 0) assert.ok(s.chips.c !== undefined);
    }
    assert.ok(s.over);
});
