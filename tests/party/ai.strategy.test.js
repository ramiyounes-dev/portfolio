import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../../explore/party/core/rng.js';
import { perfectMove } from '../../explore/party/ai/nim.js';
import { chooseMove, PERSONALITIES } from '../../explore/party/ai/dilemma.js';
import { choosePick } from '../../explore/party/ai/rps.js';
import { chooseCell } from '../../explore/party/ai/reversi.js';
import { initialBoard } from '../../explore/party/logic/reversi.js';
import { chooseEdge } from '../../explore/party/ai/dots.js';
import { simulate } from './_ai.js';
import { GAMES } from '../../workers/party/registry.js';
import nimAi from '../../explore/party/ai/nim.js';
import revAi from '../../explore/party/ai/reversi.js';

test('nim: normal play leaves nim-sum 0, misère leaves an odd number of single matches', () => {
    const m = perfectMove([1, 3, 5, 7].map((x, i) => (i === 0 ? 2 : x)), false);
    const after = [2, 3, 5, 7]; after[m.pile] -= m.take;
    assert.equal(after.reduce((a, b) => a ^ b, 0), 0);
    assert.deepEqual(perfectMove([1, 1, 4], true), { pile: 2, take: 3 }, 'leave 1,1,1');
    assert.deepEqual(perfectMove([1, 1, 4], false), { pile: 2, take: 4 }, 'normal: leave 1,1');
    assert.equal(perfectMove([1, 1], true), null, 'two singles to move in misère is lost');
    assert.equal(perfectMove([1, 2, 3], false), null);
});

test('nim: hard beats easy in duels', () => {
    let wins = 0;
    for (let seed = 1; seed <= 6; seed++) {
        const { state } = simulate(GAMES.nim, {
            decide: (v, me, ctx) => nimAi.decide(v, me, { ...ctx, difficulty: me === 'a' ? 'hard' : 'easy' }),
        }, { players: ['a', 'b'], seed, settings: { games: 3, timer: 0, preset: 'big' } });
        if (state.over.winners.includes('a')) wins++;
    }
    assert.ok(wins >= 5, `hard won ${wins}/6`);
});

test('dilemma personalities behave as advertised', () => {
    const rng = makeRng(1);
    const v = { partner: 'p', round: 3, rounds: 10, history: [{ rows: [{ a: 'me', b: 'p', ca: 'C', cb: 'B', pa: 0, pb: 5 }] }] };
    assert.equal(chooseMove('tft', v, 'me', rng), 'B');
    assert.equal(chooseMove('grudger', v, 'me', rng), 'B');
    assert.equal(chooseMove('dove', v, 'me', rng), 'C');
    assert.equal(chooseMove('tf2t', v, 'me', rng), 'C');
    assert.equal(chooseMove('adaptive', { ...v, round: 10 }, 'me', rng), 'B', 'betrays in the known last round');
    for (const lvl of ['easy', 'medium', 'hard']) assert.ok(Object.values(PERSONALITIES).some(p => p.level === lvl));
});

test('rps: medium counters a player who always throws rock', () => {
    const mem = { freq: { p: { rock: 9 } } };
    assert.equal(choosePick({ variant: 'classic', players: ['me', 'p'] }, 'me', mem, 'medium', makeRng(2)), 'paper');
});

test('reversi: hard takes a corner when offered; hard beats easy', () => {
    const b = Array(64).fill(null);
    b[9] = 'W'; b[18] = 'B'; b[1] = 'W'; b[2] = 'B';
    assert.equal(chooseCell(b, 'B', 'hard', makeRng(1)), 0);
    assert.ok([19, 26, 37, 44].includes(chooseCell(initialBoard(), 'B', 'medium', makeRng(1))));
    const { state } = simulate(GAMES.reversi, {
        decide: (v, me, ctx) => revAi.decide(v, me, { ...ctx, difficulty: me === 'a' ? 'hard' : 'easy' }),
    }, { players: ['a', 'b'], seed: 3, settings: { timer: 0 } });
    assert.deepEqual(state.over.winners, ['a']);
});

test('dots: takes a free box, never offers one when a safe line exists', () => {
    // 2x2 board, box (0,0) has three sides
    const v = { R: 2, C: 2, h: ['x', null, null, null, null, null], v: ['x', 'x', null, null, null, null] };
    assert.deepEqual(chooseEdge(v, 'hard', makeRng(1)), { kind: 'h', r: 1, c: 0 });
    const w = { R: 2, C: 2, h: ['x', null, null, null, null, null], v: ['x', null, null, null, null, null] };
    for (let i = 0; i < 10; i++) {
        const e = chooseEdge(w, 'hard', makeRng(i));
        assert.ok(!(e.kind === 'h' && e.r === 1 && e.c === 0) && !(e.kind === 'v' && e.r === 0 && e.c === 1), 'does not draw the third side');
    }
});

import { choose as memChoose } from '../../explore/party/ai/memory.js';
import { chooseGuess as mmGuess, allCodes, consistent } from '../../explore/party/ai/mastermind.js';
import { feedback } from '../../explore/party/logic/mastermind.js';
import { chooseGuess as hmGuess, candidates } from '../../explore/party/ai/hangman.js';
import anaAi from '../../explore/party/ai/anagram.js';
import { WORDS } from '../../explore/party/words/index.js';

test('memory: flips a remembered match, never a matched card', () => {
    const v = { cards: ['cat', null, null, null], matched: [null, null, null, null], flipped: [0] };
    assert.equal(memChoose(v, { 2: 'cat' }, makeRng(1)), 2);
    const w = { cards: [null, null, null, null], matched: ['a', 'a', null, null], flipped: [] };
    for (let i = 0; i < 5; i++) assert.ok([2, 3].includes(memChoose(w, {}, makeRng(i))));
});

test('mastermind: hard (Knuth) cracks every tested code within 6 guesses', () => {
    const codes = allCodes(4, 6, true);
    for (const secret of [[0, 1, 2, 3], [5, 5, 5, 5], [3, 1, 4, 1], [2, 0, 5, 3]]) {
        const v = { len: 4, colors: 6, dupes: true, mine: { guesses: [] } };
        let n = 0;
        for (; n < 8; n++) {
            const g = mmGuess(v, 'hard', makeRng(n));
            const f = feedback(secret, g);
            v.mine.guesses.push({ guess: g, ...f });
            if (f.black === 4) break;
        }
        assert.ok(n + 1 <= 6, `cracked ${secret} in ${n + 1}`);
    }
    assert.equal(consistent(codes, [{ guess: [0, 0, 1, 1], black: 4, white: 0 }]).length, 1);
});

test('hangman: pattern matching narrows to real words and solves', () => {
    const words = ['apple', 'ample', 'angle', 'zebra'];
    const v = { mask: ['a', null, null, 'l', 'e'], guessed: ['A', 'L', 'E'], wrongLetters: ['N'], round: 1 };
    assert.deepEqual(candidates(v, words).sort(), ['AMPLE', 'APPLE']);
    const w = { ...v, wrongLetters: ['N', 'M'] };
    assert.deepEqual(hmGuess(w, 'hard', words, makeRng(1)), { solve: 'APPLE' });
    assert.ok(hmGuess(v, 'medium', WORDS.fr, makeRng(1)).letter);
});

test('anagram: solves with the right delay per level', () => {
    for (const [difficulty, lo, hi] of [['hard', 3000, 7000 * 1.3], ['medium', 8000, 15000 * 1.3]]) {
        const d = anaAi.decide({ phase: 'guess', done: false, players: ['me'], round: 1, letters: 'ELPPA' }, 'me',
            { difficulty, memory: {}, rng: makeRng(4), words: ['apple'], now: 0, firing: false });
        assert.equal(d.action.answer, 'APPLE');
        assert.ok(d.delay >= lo && d.delay <= hi, `${difficulty} ${d.delay}`);
    }
});

import { chooseShot } from '../../explore/party/ai/battleship.js';
import { basic } from '../../explore/party/ai/blackjack.js';
import { suspicion } from '../../explore/party/ai/cheat.js';
import bsAi from '../../explore/party/ai/battleship.js';

test('battleship: targets around an open hit; hard beats easy on average', () => {
    const shots = Array(100).fill(null); shots[55] = 'h';
    const v = { shots: { me: shots }, players: ['me', 'f'], sunk: { f: [] } };
    for (const d of ['medium', 'hard']) assert.ok([45, 54, 56, 65].includes(chooseShot(v, 'me', d, makeRng(2))), d);
    let hard = 0;
    for (let seed = 1; seed <= 6; seed++) {
        const { state } = simulate(GAMES.battleship, { decide: (vv, me, ctx) => bsAi.decide(vv, me, { ...ctx, difficulty: me === 'a' ? 'hard' : 'easy' }) },
            { players: ['a', 'b'], seed, settings: { timer: 0 } });
        if (state.over.winners[0] === 'a') hard++;
    }
    assert.ok(hard >= 5, `hard won ${hard}/6`);
});

test('blackjack basic strategy spot checks', () => {
    assert.equal(basic(['8♠', '8♥'], 'K', true, true), 'split');
    assert.equal(basic(['6♠', '5♥'], '6', true, true), 'double');
    assert.equal(basic(['10♠', '6♥'], '10', true, true), 'hit');
    assert.equal(basic(['10♠', '3♥'], '4', true, true), 'stand');
    assert.equal(basic(['A♠', '7♥'], '9', true, true), 'hit');
    assert.equal(basic(['A♠', '7♥'], '2', true, true), 'stand');
});

test('bullshit: an impossible claim is called for sure', () => {
    const mine = [{ id: 1, r: '7', s: '♠' }, { id: 2, r: '7', s: '♥' }];
    const v = { claim: { pid: 'b', rank: '7', count: 3 }, mine, counts: { me: 2, b: 10, c: 12 }, pileCount: 25 };
    assert.equal(suspicion(v, 'me', {}, 'medium'), 1);
    const w = { ...v, claim: { pid: 'b', rank: '7', count: 1 } };
    assert.ok(suspicion(w, 'me', {}, 'medium') < 0.5);
});

import { chooseClue } from '../../explore/party/ai/codenames.js';
import { ASSOC } from '../../explore/party/words/assoc.js';
import { fold } from '../../explore/party/core/text.js';

test('codenames: category data only uses board words; hard clues avoid the assassin and the other team', () => {
    for (const lang of ['en', 'fr']) {
        const board = new Set(WORDS[lang].map(fold));
        const missing = Object.values(ASSOC[lang]).flat().filter(w => !board.has(fold(w)));
        assert.ok(missing.length <= 12, `${lang}: words not on the list: ${missing.join(', ')}`);
    }
    const words = ['apple', 'banana', 'cherry', 'lion', 'tiger', 'car', 'bus', 'ghost', 'witch', 'hammer', ...Array(15).fill(0).map((_, i) => 'x' + i)];
    const key = ['red', 'red', 'assassin', 'red', 'red', 'blue', 'blue', 'neutral', 'neutral', 'blue', ...Array(15).fill('neutral')];
    const v = { words, key, revealed: Array(25).fill(null) };
    const c = chooseClue(v, 'red', 'hard', 'en', makeRng(1));
    assert.notEqual(c.clue, 'fruit', 'fruit would point at the assassin (cherry)');
    assert.equal(c.clue, 'safari');
    assert.equal(c.n, 2);
});

import { DRAWINGS, strokesFor } from '../../explore/party/ai/drawings.js';
import { recognise } from '../../explore/party/ai/pictionary.js';
import pcLogic from '../../explore/party/logic/pictionary.js';

test('pictionary library: at least 60 concepts in both languages, every drawing valid and recognisable', () => {
    assert.ok(DRAWINGS.length >= 60);
    let recognised = 0;
    for (const d of DRAWINGS) {
        assert.ok(d.en && d.fr, 'labelled in both languages');
        const strokes = strokesFor(d, makeRng(5));
        for (const st of strokes) assert.ok(st.pts.length >= 4 && st.pts.every(n => Number.isInteger(n) && n >= 0 && n <= 1000));
        const seen = recognise({ sketch: strokes[0].pts.slice(0, 2) });
        if (seen && seen.d === d) recognised++;
    }
    assert.ok(recognised >= DRAWINGS.length * 0.85, `recognised ${recognised}/${DRAWINGS.length}`);
});

import pcAi from '../../explore/party/ai/pictionary.js';
import { advance } from './_harness.js';

test('pictionary: the human never draws against the AI; AI guessers score from the drawing', () => {
    const ctx = { now: 0, rng: makeRng(2), lang: 'fr', words: WORDS.fr, settings: { timer: 80, rotations: 2, hints: true, difficulty: 'any' }, isAway: () => false };
    const s = pcLogic.setup({ ...ctx, players: ['you', 'b', 'c'] });
    pcAi.prepare(s, 'you', { ctx });
    const drawers = [];
    for (let i = 0; i < 30 && !s.over; i++) { if (s.phase === 'choose') drawers.push(s.drawer); advance(pcLogic, s, ctx, 100_000); }
    assert.ok(s.over);
    assert.deepEqual(drawers, ['b', 'c', 'b', 'c']);
    assert.ok(DRAWINGS.some(d => d.fr === s.used[0]), 'words come from the drawing library');
    const { state } = simulate(GAMES.pictionary, pcAi, { players: ['a', 'b', 'c', 'd'], difficulty: 'hard', seed: 4, settings: { rotations: 1 } });
    assert.ok(Object.values(state.scores).some(x => x >= 10), 'AI guessers found drawings');
});

test('pictionary same-device: the drawer credits who said it first', () => {
    const ctx = { now: 0, rng: makeRng(1), lang: 'en', words: WORDS.en, settings: { timer: 80, rotations: 1, hints: true, difficulty: 'any', loud: true }, isAway: () => false };
    const s = pcLogic.setup({ ...ctx, players: ['a', 'b', 'c'] });
    pcLogic.act(s, 'a', { choose: 0 }, ctx);
    assert.deepEqual(pcLogic.awaiting(s), ['a']);
    assert.equal(pcLogic.act(s, 'a', { credit: 'a' }, ctx).error, 'illegal');
    pcLogic.act(s, 'a', { credit: 'c' }, ctx);
    assert.equal(s.scores.c, 10);
    assert.equal(s.scores.a, 2);
    assert.equal(s.phase, 'reveal');
});
