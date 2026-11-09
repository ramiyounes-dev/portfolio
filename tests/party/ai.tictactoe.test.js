import { test } from 'node:test';
import assert from 'node:assert/strict';
import ttt from '../../explore/party/logic/tictactoe.js';
import ai, { chooseCell } from '../../explore/party/ai/tictactoe.js';
import { makeRng } from '../../explore/party/core/rng.js';
import { simulate } from './_ai.js';

test('hard AI wins when it can and blocks otherwise', () => {
    const rng = makeRng(3);
    assert.equal(chooseCell(['X', 'X', null, 'O', 'O', null, null, null, null], 'X', 'hard', rng), 2);
    assert.equal(chooseCell(['X', 'X', null, 'O', null, null, null, null, null], 'O', 'hard', rng), 2);
    assert.equal(chooseCell(['X', 'X', null, 'O', null, null, null, null, null], 'O', 'medium', makeRng(1)), 2);
});

test('hard vs hard is always a draw; every level only plays legal moves', () => {
    for (let seed = 1; seed <= 4; seed++) {
        const { state, refused } = simulate(ttt, ai, { difficulty: 'hard', seed, settings: { bestOf: 1, timer: 0 } });
        assert.equal(refused.length, 0);
        assert.ok(state.over);
        assert.deepEqual(state.over.winners, [], 'perfect play draws');
    }
    for (const difficulty of ['easy', 'medium']) {
        const { state, refused } = simulate(ttt, ai, { difficulty, seed: 9, settings: { bestOf: 5, timer: 0 } });
        assert.equal(refused.length, 0);
        assert.ok(state.over);
    }
});
