import { test } from 'node:test';
import assert from 'node:assert/strict';
import cn, { makeKey, clueProblem } from '../../explore/party/logic/codenames.js';
import { makeRng } from '../../explore/party/core/rng.js';
import { makeCtx } from './_harness.js';

test('key: 9 / 8 / 7 neutral / 1 assassin', () => {
    const k = makeKey('red', makeRng(1));
    assert.equal(k.length, 25);
    assert.equal(k.filter(x => x === 'red').length, 9);
    assert.equal(k.filter(x => x === 'blue').length, 8);
    assert.equal(k.filter(x => x === 'neutral').length, 7);
    assert.equal(k.filter(x => x === 'assassin').length, 1);
});

test('clue validation', () => {
    const words = ['château', 'pomme', 'lune'];
    const rev = [null, null, 'red'];
    assert.equal(clueProblem('deux mots', words, rev), 'cn.oneWord');
    assert.equal(clueProblem('Chateau', words, rev), 'cn.onBoard', 'accent-insensitive');
    assert.equal(clueProblem('pommeraie', words, rev), 'cn.onBoard', 'contains a board word');
    assert.equal(clueProblem('lunettes', words, rev), null, 'revealed words are fine');
    assert.equal(clueProblem('fruit', words, rev), null);
});

function game(players = ['a', 'b', 'c', 'd']) {
    const ctx = makeCtx(cn, { players });
    const s = cn.setup(ctx);
    s.teams = { red: ['a', 'b'], blue: ['c', 'd'] };
    s.spymasters = { red: 'a', blue: 'c' };
    cn.act(s, 'a', { begin: true }, ctx);
    return { ctx, s };
}

test('teams need two players and a Spymaster each before starting', () => {
    const ctx = makeCtx(cn, { players: ['a', 'b', 'c', 'd'] });
    const s = cn.setup(ctx);
    s.teams = { red: ['a', 'b', 'c'], blue: ['d'] };
    s.spymasters = { red: 'a', blue: 'd' };
    assert.deepEqual(cn.act(s, 'a', { begin: true }, ctx), { error: 'cn.needTeams' });
});

test('only Spymasters receive the key', () => {
    const { ctx, s } = game();
    assert.ok(cn.view(s, 'a', ctx).key);
    assert.equal(cn.view(s, 'b', ctx).key, null);
    assert.equal(cn.view(s, 'zzz', ctx).key, null);
});

test('clue, guesses up to n+1, wrong card ends the turn, assassin loses', () => {
    const { ctx, s } = game();
    const t = s.turnTeam, spy = s.spymasters[t], op = s.teams[t].find(id => id !== spy);
    const own = s.key.map((k, i) => (k === t ? i : -1)).filter(i => i >= 0);
    assert.deepEqual(cn.act(s, op, { clue: 'test', n: 1 }, ctx), { error: 'not_your_turn' });
    cn.act(s, spy, { clue: 'zzqx', n: 1 }, ctx);
    assert.equal(s.phase, 'guess');
    cn.act(s, op, { propose: own[0] }, ctx);
    assert.equal(s.revealed[own[0]], t, 'single operative reveals straight away');
    cn.act(s, op, { propose: own[1] }, ctx);
    assert.equal(s.turnTeam, t === 'red' ? 'blue' : 'red', 'n+1 = 2 guesses used, turn passes');

    const g = game();
    const T = g.s.turnTeam, S = g.s.spymasters[T], O = g.s.teams[T].find(id => id !== S);
    cn.act(g.s, S, { clue: 'zzqx', n: 2 }, g.ctx);
    cn.act(g.s, O, { propose: g.s.key.indexOf('assassin') }, g.ctx);
    assert.ok(g.s.over);
    assert.deepEqual(g.s.over.winners.sort(), g.s.teams[T === 'red' ? 'blue' : 'red'].sort());
});

test('majority confirm with 3+ operatives; late joiners go to the smaller team', () => {
    const ctx = makeCtx(cn, { players: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
    const s = cn.setup(ctx);
    s.teams = { red: ['a', 'b', 'c', 'd'], blue: ['e', 'f', 'g'] };
    s.spymasters = { red: 'a', blue: 'e' };
    cn.act(s, 'a', { begin: true }, ctx);
    s.turnTeam = 'red';
    s.phase = 'clue';
    cn.act(s, 'a', { clue: 'zzqx', n: 3 }, ctx);
    const idx = s.key.indexOf('red');
    cn.act(s, 'b', { propose: idx }, ctx);
    assert.equal(s.revealed[idx], null, 'one of three operatives is not enough');
    cn.act(s, 'c', { propose: idx }, ctx);
    assert.equal(s.revealed[idx], 'red', 'two of three is a majority');
    cn.join(s, 'h', ctx);
    assert.ok(s.teams.blue.includes('h'));
});
