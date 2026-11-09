/* Every AI, at every level: only legal moves, and AI-only games always finish. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './_ai.js';
import { GAMES } from '../../workers/party/registry.js';

const CASES = [
    ['ultimate', { players: ['a', 'b'], settings: { timer: 0 } }],
    ['rps', { players: ['a', 'b', 'c'], settings: { rounds: 6 } }],
    ['rps', { players: ['a', 'b'], settings: { target: 3 } }],
    ['dilemma', { players: ['a', 'b', 'c', 'd', 'e'], settings: { rounds: 6 } }],
    ['nim', { players: ['a', 'b', 'c'], settings: { games: 3, timer: 0 } }],
    ['dots', { players: ['a', 'b', 'c'], settings: { size: '4', timer: 0 } }],
    ['reversi', { players: ['a', 'b'], settings: { timer: 0 } }],
    ['memory', { players: ['a', 'b', 'c'], settings: { timer: 0 } }],
    ['mastermind', { players: ['a', 'b', 'c'], settings: { rounds: 3 } }],
    ['mastermind', { players: ['a', 'b'], settings: { rounds: 2, length: '5', colors: '8', dupes: false } }],
    ['hangman', { players: ['a', 'b', 'c'], settings: { rounds: 3, timer: 0 } }],
    ['hangman', { players: ['a', 'b'], settings: { rounds: 2, timer: 0 }, lang: 'fr' }],
    ['anagram', { players: ['a', 'b', 'c'], settings: { rounds: 4 } }],
    ['anagram', { players: ['a', 'b'], settings: { rounds: 3, turns: true }, lang: 'fr' }],
    ['battleship', { players: ['a', 'b'], settings: { timer: 0 } }],
    ['battleship', { players: ['a', 'b'], settings: { timer: 0 } }],
    ['blackjack', { players: ['a', 'b', 'c'], settings: { rounds: 5, timer: 0 } }],
    ['uno', { players: ['a', 'b', 'c', 'd'], settings: { target: 'single', timer: 0 } }],
    ['uno', { players: ['a', 'b'], settings: { target: '100', timer: 0, stacking: true } }],
    ['cheat', { players: ['a', 'b', 'c', 'd'], settings: { games: 1, timer: 0 } }],
    ['cheat', { players: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], settings: { games: 1, timer: 0 } }],
    ['codenames', { players: ['a', 'b', 'c', 'd'], settings: {} }],
    ['pictionary', { players: ['a', 'b', 'c', 'd'], settings: { rotations: 1 } }],
    ['pictionary', { players: ['a', 'b', 'c'], settings: { rotations: 1 }, lang: 'fr' }],
    ['codenames', { players: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], settings: {} , lang: 'fr' }],
];

for (const [id, opts] of CASES) {
    test(`${id} AI (${opts.players.length} players): legal moves, game finishes`, async () => {
        const ai = (await import(`../../explore/party/ai/${id}.js`)).default;
        for (const difficulty of ['easy', 'medium', 'hard']) {
            const { state, refused } = simulate(GAMES[id], ai, { ...opts, difficulty, seed: 7 });
            assert.ok(state.over, `${id} ${difficulty} finished`);
            assert.deepEqual(refused, [], `${id} ${difficulty} made no illegal move`);
        }
    });
}
