import { test } from 'node:test';
import assert from 'node:assert/strict';
import pd, { pairings, PAYOFF } from '../../explore/party/logic/dilemma.js';
import { makeCtx, advance } from './_harness.js';

test('payoff matrix', () => {
    assert.deepEqual(PAYOFF.CC, [3, 3]);
    assert.deepEqual(PAYOFF.CB, [0, 5]);
    assert.deepEqual(PAYOFF.BC, [5, 0]);
    assert.deepEqual(PAYOFF.BB, [1, 1]);
});

test('round robin: everyone meets everyone, odd counts get a bye', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const met = new Set();
    for (let k = 0; k < 3; k++) for (const [x, y] of pairings(ids, k).pairs) met.add([x, y].sort().join(''));
    assert.equal(met.size, 6);
    const odd = pairings(['a', 'b', 'c'], 0);
    assert.equal(odd.pairs.length, 1);
    assert.ok(odd.bye);
    const byes = new Set([0, 1, 2].map(k => pairings(['a', 'b', 'c'], k).bye));
    assert.equal(byes.size, 3, 'each player sits out once over three rounds');
    assert.deepEqual(pairings(['a', 'b'], 5).pairs[0].sort(), ['a', 'b']);
});

test('choices are secret and scored on reveal, bye gets +2', () => {
    const ctx = makeCtx(pd, { players: ['a', 'b', 'c'] });
    const s = pd.setup(ctx);
    const [x, y] = s.pairs[0];
    pd.act(s, x, { choice: 'B' }, ctx);
    assert.equal(JSON.stringify(pd.view(s, y, ctx)).includes('"B"'), false, 'partner cannot see the choice');
    pd.act(s, y, { choice: 'C' }, ctx);
    assert.equal(s.phase, 'reveal');
    assert.equal(s.scores[x], 5);
    assert.equal(s.scores[y], 0);
    assert.equal(s.scores[s.bye], 2);
});

test('chat is only visible to the two partners', () => {
    const ctx = makeCtx(pd, { players: ['a', 'b', 'c', 'd'] });
    const s = pd.setup(ctx);
    const [x, y] = s.pairs[0];
    const outsider = s.players.find(id => id !== x && id !== y);
    pd.act(s, x, { type: 'say', text: 'I will cooperate' }, ctx);
    assert.equal(pd.view(s, y, ctx).chat.length, 1);
    assert.equal(pd.view(s, outsider, ctx).chat.length, 0);
});

test('game ends after the round count with cooperation %', () => {
    const ctx = makeCtx(pd, { players: ['a', 'b'], settings: { rounds: 3 } });
    const s = pd.setup(ctx);
    for (let r = 0; r < 3; r++) {
        pd.act(s, 'a', { choice: 'C' }, ctx);
        pd.act(s, 'b', { choice: r === 2 ? 'B' : 'C' }, ctx);
        if (!s.over) advance(pd, s, ctx, 5000);
    }
    assert.ok(s.over);
    const a = s.over.ranking.find(r => r.id === 'a'), b = s.over.ranking.find(r => r.id === 'b');
    assert.equal(a.coop, 100);
    assert.equal(b.coop, 67);
    assert.equal(b.score, 3 + 3 + 5);
});

test('hidden round count is not sent to players', () => {
    const ctx = makeCtx(pd, { settings: { hideRounds: true } });
    const s = pd.setup(ctx);
    assert.equal(pd.view(s, 'a', ctx).rounds, null);
});
