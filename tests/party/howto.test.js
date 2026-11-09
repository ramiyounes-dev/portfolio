/* How to play: every game has 5 to 8 steps in English and French, each with a 4:3 picture,
   the last step covers the modes, and the catalog badges match each game's real player range. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { playersBadge, playersLine } from '../../explore/party/client/howto.js';

const root = new URL('../../explore/', import.meta.url).pathname;
const uiDir = path.join(root, 'party/ui');
const PARTY = fs.readdirSync(uiDir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
const ALL = [...PARTY, 'quoridor', 'dama', 'connect4'];
const pick = (v, lang) => (typeof v === 'function' ? v(lang) : v[lang]);
const BANNED = /[–—]|\p{Extended_Pictographic}/u;

test('every game has a How to play list of 5 to 8 steps', async () => {
    assert.equal(ALL.length, 20);
    for (const id of ALL) {
        const steps = (await import(`../../explore/party/howto/${id}.js`)).default;
        assert.ok(steps.length >= 5 && steps.length <= 8, `${id}: ${steps.length} steps`);
        for (const [k, s] of steps.entries()) {
            for (const lang of ['en', 'fr']) {
                const title = pick(s.title, lang), text = pick(s.text, lang), art = pick(s.art, lang);
                assert.ok(title && text, `${id} step ${k + 1} ${lang} has a title and text`);
                assert.ok(title.length <= 22, `${id} step ${k + 1} ${lang} title is short: ${title}`);
                assert.match(art, /^<svg class="ht-svg" viewBox="0 0 320 240"/, `${id} step ${k + 1} picture is 320 × 240`);
                assert.doesNotMatch(title + text, BANNED, `${id} step ${k + 1} ${lang}: no emoji or long dash`);
            }
        }
        assert.match(pick(steps.at(-1).text, 'en'), /vs AI.*Same device.*Online/, `${id}: last step covers the modes`);
    }
});

test('every party game UI uses its step list', () => {
    for (const id of PARTY) {
        const src = fs.readFileSync(path.join(uiDir, id + '.js'), 'utf8');
        assert.match(src, new RegExp(`import howto from '\\.\\./howto/${id}\\.js'`), `${id} imports its steps`);
        assert.match(src, /^\s{4}howto,$/m, `${id} declares howto`);
        assert.doesNotMatch(src, /^\s{4}rules: \{/m, `${id} has no old rules sheet`);
    }
});

test('catalog badges match each game\'s player range', async () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const entries = [...html.matchAll(/<li class="entry" data-min="(\d+)" data-max="(\d+)">\s*<a class="entry-link" href="([^"]+)\/"/g)];
    assert.equal(entries.length, 20);
    const slugs = { 'ultimate-tictactoe': 'ultimate', 'rock-paper-scissors': 'rps', 'prisoners-dilemma': 'dilemma', 'dots-and-boxes': 'dots', 'anagram-race': 'anagram', bullshit: 'cheat' };
    for (const [, min, max, dir] of entries) {
        const id = slugs[dir] || dir;
        const logic = (await import(`../../explore/party/logic/${id}.js`)).default;
        assert.equal(Number(min), logic.min, `${dir} min`);
        assert.equal(Number(max), Math.min(12, logic.max), `${dir} max`);
    }
});

test('player badges tell duels from group games', () => {
    assert.match(playersBadge(2, 2, 'en'), /is-duel.*2 players/);
    assert.match(playersBadge(3, 12, 'fr'), /is-group.*3-12 joueurs/);
    assert.equal(playersLine(2, 2, 'en'), 'A duel for exactly 2 players.');
    assert.equal(playersLine(2, 99, 'fr'), 'De 2 à 12 joueurs.');
});
