/* Hangman AI. Setter: a random word from the list. Guesser:
   Easy: picks among the 12 most common letters of the language, a bit at random.
   Medium: most common letter not yet tried (frequencies computed from the language's word list).
   Hard: pattern matching: keeps the words that fit the revealed letters and the misses, plays the letter that
   appears in most of them, and solves when only one word fits. Custom words outside the list fall back to Medium. */
import { fold } from '../core/text.js';
import { think, pick } from './common.js';

const freqCache = new Map();
function frequencies(words) {
    if (freqCache.has(words)) return freqCache.get(words);
    const f = {};
    for (const w of words) for (const ch of new Set(fold(w))) f[ch] = (f[ch] || 0) + 1;
    const order = Object.keys(f).sort((a, b) => f[b] - f[a]);
    freqCache.set(words, order);
    return order;
}

export function candidates(v, words) {
    const pattern = v.mask.map(c => (c ? fold(c) : null));
    const tried = new Set([...v.guessed, ...v.wrongLetters]);
    return words.map(fold).filter(w => w.length === pattern.length
        && pattern.every((c, i) => (c ? w[i] === c : !tried.has(w[i])))
        && !v.wrongLetters.some(L => w.includes(L)));
}

export function chooseGuess(v, difficulty, words, rng) {
    const tried = new Set([...v.guessed, ...v.wrongLetters]);
    const order = frequencies(words).filter(L => !tried.has(L));
    const rest = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(L => !tried.has(L) && !order.includes(L));
    const fallback = () => order[0] || rest[0];
    if (difficulty === 'easy') return { letter: rng() < 0.85 && order.length ? pick(rng, order.slice(0, 12)) : (pick(rng, [...order, ...rest])) };
    if (difficulty === 'medium') return { letter: fallback() };
    const cands = [...new Set(candidates(v, words))];
    const hidden = v.mask.filter(c => !c).length;
    if (cands.length === 1 && hidden >= 2) return { solve: cands[0] };
    if (!cands.length) return { letter: fallback() };
    const count = {};
    for (const w of cands) for (const ch of new Set(w)) if (!tried.has(ch)) count[ch] = (count[ch] || 0) + 1;
    const letters = Object.keys(count).sort((a, b) => count[b] - count[a]);
    return { letter: letters[0] || fallback() };
}

export default {
    decide(v, me, ctx) {
        if (v.phase === 'setword' && v.setter === me && !v.word) return { action: { random: true }, delay: think(ctx.rng, 1200, 2500) };
        if (v.phase !== 'guess' || v.turn !== me || !v.mask) return null;
        const key = v.round + ':' + v.guessed.join() + ':' + v.wrongLetters.join();
        if (ctx.memory.key !== key) { ctx.memory.key = key; ctx.memory.plan = chooseGuess(v, ctx.difficulty, ctx.words, ctx.rng); }
        return { action: ctx.memory.plan, delay: think(ctx.rng, 700, 1700) };
    },
};
