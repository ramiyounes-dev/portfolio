import { test } from 'node:test';
import assert from 'node:assert/strict';
import hm, { validWord, mask } from '../../explore/party/logic/hangman.js';
import { fold, sameWord } from '../../explore/party/core/text.js';
import { makeCtx, advance } from './_harness.js';

test('accent-insensitive folding', () => {
    assert.equal(fold('Éléphant'), 'ELEPHANT');
    assert.equal(fold('garçon'), 'GARCON');
    assert.equal(fold('cœur'), 'COEUR');
    assert.ok(sameWord('ŒUF', 'oeuf'));
    assert.deepEqual(mask('élève', ['E']), ['é', null, 'è', null, 'e']);
});

test('custom words: letters only, 3 to 20', () => {
    assert.ok(validWord('château'));
    assert.ok(!validWord('ab'));
    assert.ok(!validWord('two words'));
    assert.ok(!validWord('abc1'));
    assert.ok(!validWord('a'.repeat(21)));
});

function play(settings = {}) {
    const ctx = makeCtx(hm, { players: ['a', 'b', 'c'], settings });
    const s = hm.setup(ctx);
    return { ctx, s };
}

test('the setter\'s word stays secret from guessers', () => {
    const { ctx, s } = play();
    assert.equal(s.phase, 'setword');
    assert.equal(s.setter, 'a');
    hm.act(s, 'a', { word: 'Château' }, ctx);
    assert.equal(hm.view(s, 'b', ctx).word, null);
    assert.equal(JSON.stringify(hm.view(s, 'b', ctx)).toLowerCase().includes('chateau'), false);
    assert.equal(hm.view(s, 'a', ctx).word, 'château');
});

test('correct letters score per occurrence (accent-insensitive); wrong letters pass the turn', () => {
    const { ctx, s } = play();
    hm.act(s, 'a', { word: 'élève' }, ctx);
    const g = s.turn;
    hm.act(s, g, { letter: 'e' }, ctx);
    assert.equal(s.scores[g], 3, 'é, è and e all count');
    assert.equal(s.turn, g, 'guess again after a correct letter');
    assert.deepEqual(hm.act(s, g, { letter: 'E' }, ctx), { error: 'hm.already' });
    hm.act(s, g, { letter: 'z' }, ctx);
    assert.equal(s.wrong, 1);
    assert.notEqual(s.turn, g);
});

test('max three guesses in a row, then the turn passes', () => {
    const { ctx, s } = play();
    hm.act(s, 'a', { word: 'abcdefgh' }, ctx);
    const g = s.turn;
    for (const L of ['a', 'b', 'c']) hm.act(s, g, { letter: L }, ctx);
    assert.notEqual(s.turn, g);
});

test('solving scores 5 + hidden letters; a wrong solve costs two parts', () => {
    const { ctx, s } = play();
    hm.act(s, 'a', { word: 'pomme' }, ctx);
    const g = s.turn;
    hm.act(s, g, { solve: 'poire' }, ctx);
    assert.equal(s.wrong, 2);
    const g2 = s.turn;
    hm.act(s, g2, { letter: 'm' }, ctx);
    hm.act(s, g2, { solve: 'POMME' }, ctx);
    assert.equal(s.scores[g2], 2 + 5 + 3);
    assert.equal(s.phase, 'roundEnd');
});

test('the setter scores 5 when the drawing completes', () => {
    const { ctx, s } = play({ maxWrong: 4 });
    hm.act(s, 'a', { word: 'abc' }, ctx);
    for (const L of ['x', 'y', 'z', 'w']) hm.act(s, s.turn, { letter: L }, ctx);
    assert.equal(s.phase, 'roundEnd');
    assert.equal(s.scores.a, 5);
    assert.equal(hm.view(s, 'b', ctx).word, 'abc', 'word revealed at round end');
});

test('every player sets once, late joiners enter the rotation; random-only mode works', () => {
    const { ctx, s } = play();
    hm.act(s, 'a', { random: true }, ctx);
    assert.equal(s.phase, 'guess');
    hm.join(s, 'd', ctx);
    s.wrong = s.maxWrong - 1;
    hm.act(s, s.turn, { solve: 'qqqqq' }, ctx);
    advance(hm, s, ctx, 5000);
    assert.equal(s.setter, 'b');
    assert.ok(s.players.includes('d'));
    const r = play({ randomOnly: true });
    assert.equal(r.s.setter, null);
    assert.equal(r.s.phase, 'guess');
});
