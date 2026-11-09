import { test } from 'node:test';
import assert from 'node:assert/strict';
import ch, { makeDeck, honest } from '../../explore/party/logic/cheat.js';
import { makeCtx, advance } from './_harness.js';

function table(players = ['a', 'b', 'c'], settings = {}) {
    const ctx = makeCtx(ch, { players, settings });
    const s = ch.setup(ctx);
    return { ctx, s };
}

test('all cards are dealt evenly; the ace of spades starts with Aces', () => {
    const { s } = table();
    const counts = s.order.map(id => s.hands[id].length);
    assert.equal(counts.reduce((a, b) => a + b, 0), 52);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
    assert.ok(s.hands[s.turn].some(c => c.r === 'A' && c.s === '♠'));
    assert.equal(s.order.length, 3);
    assert.equal(makeDeck(2).length, 104);
    const big = table(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    assert.equal(Object.values(big.s.hands).flat().length, 104, 'two decks for 7+ players');
});

test('played cards stay hidden; only the claim is public', () => {
    const { ctx, s } = table();
    const p = s.turn;
    const ids = s.hands[p].slice(0, 2).map(c => c.id);
    ch.act(s, p, { cards: ids }, ctx);
    const other = s.order.find(id => id !== p);
    const v = ch.view(s, other, ctx);
    assert.deepEqual(v.claim, { pid: p, rank: 'A', count: 2 });
    assert.equal(JSON.stringify(v).includes('"cards"'), false);
});

test('calling Bullshit: the liar or the wrong challenger picks up the pile', () => {
    for (const lie of [true, false]) {
        const { ctx, s } = table();
        const p = s.turn;
        const caller = s.order.find(id => id !== p);
        s.hands[p] = [{ id: 1001, r: 'A', s: '♥' }, { id: 1002, r: lie ? '7' : 'A', s: '♣' }, { id: 1003, r: '9', s: '♦' }];
        s.pile = [{ id: 2000, r: 'K', s: '♠' }];
        ch.act(s, p, { cards: [1001, 1002] }, ctx);
        const before = { p: s.hands[p].length, c: s.hands[caller].length };
        ch.act(s, caller, { call: true }, ctx);
        if (lie) assert.equal(s.hands[p].length, before.p + 3, 'liar takes the whole pile');
        else assert.equal(s.hands[caller].length, before.c + 3, 'challenger takes the pile');
        assert.equal(s.reveal.liar, lie);
        assert.equal(s.pile.length, 0);
        assert.equal(s.rankIdx, 1, 'next rank: 2');
    }
    assert.ok(honest([{ r: '5' }, { r: '5' }], '5'));
    assert.ok(!honest([{ r: '5' }, { r: '6' }], '5'));
});

test('no call: cards stay in the pile and play moves on', () => {
    const { ctx, s } = table();
    const p = s.turn;
    ch.act(s, p, { cards: [s.hands[p][0].id] }, ctx);
    assert.deepEqual(ch.act(s, p, { call: true }, ctx), { error: 'illegal' }, 'cannot call yourself');
    advance(ch, s, ctx, 5000);
    assert.equal(s.pile.length, 1);
    assert.equal(s.phase, 'play');
    assert.notEqual(s.turn, p);
    assert.deepEqual(ch.act(s, s.turn, { cards: [] }, ctx), { error: 'cheat.count' });
});

test('emptying your hand wins only if it survives the window or an honest call', () => {
    const { ctx, s } = table(['a', 'b', 'c'], { games: 1 });
    const p = s.turn;
    s.hands[p] = [{ id: 1, r: 'A', s: '♥' }];
    ch.act(s, p, { cards: [1] }, ctx);
    const caller = s.order.find(id => id !== p);
    ch.act(s, caller, { call: true }, ctx);   // honest: caller picks up
    assert.ok(s.over);
    assert.deepEqual(s.lastPlaces, [p]);
    assert.equal(s.scores[p], 3);

    const r = table(['a', 'b', 'c'], { games: 1 });
    const q = r.s.turn;
    r.s.hands[q] = [{ id: 1, r: '9', s: '♥' }];
    ch.act(r.s, q, { cards: [1] }, r.ctx);
    ch.act(r.s, r.s.order.find(id => id !== q), { call: true }, r.ctx);
    assert.ok(!r.s.over, 'caught lying on the last card: keeps playing');
    assert.ok(r.s.hands[q].length >= 1);
});

test('turn timer plays one card automatically', () => {
    const { ctx, s } = table(['a', 'b', 'c'], { timer: 30 });
    const p = s.turn, n = s.hands[p].length;
    advance(ch, s, ctx, 30_000);
    assert.equal(s.hands[p].length, n - 1);
    assert.equal(s.phase, 'challenge');
});

test('random games always finish (simulated clock)', () => {
    for (let seed = 1; seed <= 8; seed++) {
        const ctx = makeCtx(ch, { players: ['a', 'b', 'c', 'd'], seed, settings: { games: 1, window: 3 } });
        const s = ch.setup(ctx);
        let steps = 0;
        while (!s.over && steps++ < 5000) {
            if (s.phase === 'play') {
                const hand = s.hands[s.turn];
                const honestCards = hand.filter(c => c.r === ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][s.rankIdx]).slice(0, s.maxPlay);
                ch.act(s, s.turn, { cards: (honestCards.length ? honestCards : [ctx.rng.pick(hand)]).map(c => c.id) }, ctx);
            } else if (s.phase === 'challenge' && ctx.rng() < 0.2) {
                ch.act(s, s.order.find(id => id !== s.claim.pid), { call: true }, ctx);
            } else advance(ch, s, ctx, 5000);
        }
        assert.ok(s.over, `seed ${seed} finished in ${steps} steps`);
    }
});
