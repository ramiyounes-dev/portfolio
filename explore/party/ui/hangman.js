import logic from '../logic/hangman.js';
import howto from '../howto/hangman.js';
import ai from '../ai/hangman.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
// pathLength="1" lets a new part be drawn on with one dash animation (see .hm-man .new)
const PARTS = [
    cls => `<path d="M150 52a18 18 0 1 1 0 36a18 18 0 1 1 0-36" pathLength="1" class="${cls}"/>`,  // head
    cls => `<line x1="150" y1="88" x2="150" y2="150" pathLength="1" class="${cls}"/>`,             // body
    cls => `<line x1="150" y1="104" x2="124" y2="130" pathLength="1" class="${cls}"/>`,            // left arm
    cls => `<line x1="150" y1="104" x2="176" y2="130" pathLength="1" class="${cls}"/>`,            // right arm
    cls => `<line x1="150" y1="150" x2="128" y2="186" pathLength="1" class="${cls}"/>`,            // left leg
    cls => `<line x1="150" y1="150" x2="172" y2="186" pathLength="1" class="${cls}"/>`,            // right leg
];

export default {
    logic,
    ai,
    // same device: hide the screen around the Word Setter only
    privateInfo: (v, id) => v.phase === 'setword' ? v.setter === id : (!!v.word && v.phase !== 'roundEnd'),
    wordGame: true,
    title: { en: 'Hangman', fr: 'Le Pendu' },
    icon: 'hangman',
    strings: {
        en: {
            'set.rounds': 'Rounds', 'opt.rounds.0': 'Everyone sets once', 'set.maxWrong': 'Wrong guesses allowed', 'set.randomOnly': 'Always random word',
            'set.difficulty': 'Words', 'opt.difficulty.easy': 'Short', 'opt.difficulty.any': 'Any', 'opt.difficulty.hard': 'Long', 'set.timer': 'Turn timer',
            setterYou: 'You are the Word Setter', setterOther: '{name} is choosing a word', wordPh: 'Your secret word (letters only)',
            setWord: 'Use this word', random: 'Random word', roundOf: 'Round {n} of {m}', roundN: 'Round {n}',
            guessLetter: 'Guess a letter', solve: 'Solve the word', solvePh: 'The whole word', solveBtn: 'Solve', streak: 'Correct, guess again ({n} left)',
            yourGuess: 'Your turn: a letter or the whole word', watching: '{name} is guessing', solved: '{name} solved it: {word}', notSolved: 'The word was {word}',
            setterScores: '{name} (setter) scores 5', guessersWin: 'Guessers win the round', wrongCount: '{n} / {m} wrong',
            lastHit: '{name}: {l} ×{n}', lastMiss: '{name}: {l} is not in the word', lastSolveMiss: '{name} tried {w}: wrong',
            'hm.badWord': 'Letters only, 3 to 20 characters', 'hm.already': 'Already guessed', youSetIt: 'You set this word: {word}',
        },
        fr: {
            'set.rounds': 'Manches', 'opt.rounds.0': 'Chacun choisit une fois', 'set.maxWrong': 'Erreurs permises', 'set.randomOnly': 'Toujours un mot au hasard',
            'set.difficulty': 'Mots', 'opt.difficulty.easy': 'Courts', 'opt.difficulty.any': 'Tous', 'opt.difficulty.hard': 'Longs', 'set.timer': 'Temps par tour',
            setterYou: 'Tu choisis le mot', setterOther: '{name} choisit un mot', wordPh: 'Ton mot secret (lettres seulement)',
            setWord: 'Utiliser ce mot', random: 'Mot au hasard', roundOf: 'Manche {n} sur {m}', roundN: 'Manche {n}',
            guessLetter: 'Propose une lettre', solve: 'Trouver le mot', solvePh: 'Le mot entier', solveBtn: 'Valider', streak: 'Bien vu, rejoue (encore {n})',
            yourGuess: 'À toi : une lettre ou le mot entier', watching: '{name} propose', solved: '{name} a trouvé : {word}', notSolved: 'Le mot était {word}',
            setterScores: '{name} (le meneur) marque 5', guessersWin: 'Les devineurs gagnent la manche', wrongCount: '{n} / {m} erreurs',
            lastHit: '{name} : {l} ×{n}', lastMiss: '{name} : pas de {l}', lastSolveMiss: '{name} a proposé {w} : raté',
            'hm.badWord': 'Lettres seulement, de 3 à 20 caractères', 'hm.already': 'Déjà proposée', youSetIt: 'Tu as choisi ce mot : {word}',
        },
    },
    howto,

    status(v, api) {
        const { t } = api;
        return v.totalRounds ? t('roundOf', { n: v.round, m: v.totalRounds }) : t('roundN', { n: v.round });
    },

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const key = `${v.round}:${v.phase}`;
        if (root.dataset.key !== key) {
            root.dataset.key = key;
            root._hmStage = root._hmWord = null;     // fresh skeleton: draw everything once
            root.innerHTML = `<div class="hm-msg"></div><div class="hm-stage"></div><div class="hm-word"></div><div class="hm-last g-note"></div>
                <div class="hm-set hidden"><input class="p-input" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false"><div class="p-row"><button class="p-btn primary" data-set="1" type="button"></button><button class="p-btn" data-rand="1" type="button"></button></div></div>
                <div class="hm-keys g-keyboard"></div>
                <form class="hm-solve hidden"><input class="p-input" maxlength="24" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="p-btn" type="submit"></button></form>`;
            root.querySelector('.hm-set').onclick = e => {
                if (e.target.closest('[data-rand]')) send({ random: true });
                if (e.target.closest('[data-set]')) send({ word: root.querySelector('.hm-set input').value });
            };
            root.querySelector('.hm-set input').onkeydown = e => { if (e.key === 'Enter') send({ word: e.target.value }); };
            root.querySelector('.hm-keys').onclick = e => { const b = e.target.closest('button[data-l]'); if (b && !b.disabled) send({ letter: b.dataset.l }); };
            root.querySelector('.hm-solve').onsubmit = e => { e.preventDefault(); const i = e.target.querySelector('input'); if (i.value.trim()) send({ solve: i.value }); i.value = ''; };
        }
        const $ = s => root.querySelector(s);
        const myTurn = v.turn === me;

        // Message line
        let msg = '';
        if (v.phase === 'setword') msg = v.setter === me ? t('setterYou') : t('setterOther', { name: nameOf(v.setter) });
        else if (v.phase === 'guess') msg = myTurn ? (v.streak ? t('streak', { n: 3 - v.streak }) : t('yourGuess')) : (v.setter === me ? t('youSetIt', { word: v.word }) : t('watching', { name: nameOf(v.turn) }));
        else if (v.result) msg = v.result.solved ? t('solved', { name: nameOf(v.result.by), word: v.result.word }) : `${t('notSolved', { word: v.result.word })} · ${v.setter ? t('setterScores', { name: nameOf(v.setter) }) : ''}`;
        $('.hm-msg').innerHTML = `<p class="g-big-msg">${esc(msg)}</p>`;

        // Drawing
        const shown = Math.round((v.wrong / v.maxWrong) * PARTS.length);
        // Redrawn on every update: only parts added since last time are drawn on, the rest stay still
        const before = root._hmShown ?? shown;
        root._hmShown = v.phase === 'setword' ? 0 : shown;
        const stageKey = v.phase === 'setword' ? '' : `${shown}|${v.wrong}|${v.maxWrong}|${t('wrongCount', { n: 0, m: 0 })}`;
        if (root._hmStage !== stageKey) {      // untouched when nothing changed, so a drawing in progress is not cut short
            root._hmStage = stageKey;
            $('.hm-stage').innerHTML = v.phase === 'setword' ? '' : `<svg class="hm-svg" viewBox="0 0 220 210" aria-label="${esc(t('wrongCount', { n: v.wrong, m: v.maxWrong }))}">
            <g class="hm-gallows"><line x1="30" y1="200" x2="120" y2="200"/><line x1="70" y1="200" x2="70" y2="20"/><line x1="70" y1="20" x2="150" y2="20"/><line x1="150" y1="20" x2="150" y2="52"/></g>
            <g class="hm-man">${PARTS.slice(0, shown).map((part, i) => part(i >= before ? 'new' : '')).join('')}</g></svg><p class="p-mono center">${esc(t('wrongCount', { n: v.wrong, m: v.maxWrong }))}</p>`;
        }

        // Word
        if (v.mask) {
            const chars = v.phase === 'roundEnd' && v.result ? [...v.result.word] : v.mask;
            const was = root._hmChars && root._hmChars.length === chars.length ? root._hmChars : null;
            root._hmChars = [...chars];
            const wordKey = chars.join(',') + v.phase;
            if (root._hmWord !== wordKey) {
                root._hmWord = wordKey;
                $('.hm-word').innerHTML = `<div class="hm-letters">${chars.map((c, i) => `<span class="hm-slot ${c ? 'on' : ''} ${c && was && !was[i] ? 'new' : ''} ${v.phase === 'roundEnd' && !v.mask[i] ? 'missed' : ''}">${c ? esc(c.toUpperCase()) : ''}</span>`).join('')}</div>`;
            }
        } else { $('.hm-word').innerHTML = ''; root._hmChars = null; root._hmWord = null; }

        // Last guess
        const lg = v.lastGuess;
        $('.hm-last').textContent = v.phase === 'guess' && lg
            ? (lg.solve ? (lg.ok ? '' : t('lastSolveMiss', { name: nameOf(lg.pid), w: lg.solve })) : lg.hits ? t('lastHit', { name: nameOf(lg.pid), l: lg.letter, n: lg.hits }) : t('lastMiss', { name: nameOf(lg.pid), l: lg.letter }))
            : '';

        // Setter input
        const setting = v.phase === 'setword' && v.setter === me;
        $('.hm-set').classList.toggle('hidden', !setting);
        $('.hm-set input').placeholder = t('wordPh');
        $('[data-set]').textContent = t('setWord');
        $('[data-rand]').textContent = t('random');

        // Keyboard + solve
        const guessing = v.phase === 'guess';
        $('.hm-keys').classList.toggle('hidden', !guessing);
        $('.hm-keys').classList.toggle('idle', !myTurn);
        if (guessing) {
            $('.hm-keys').innerHTML = LETTERS.map(L => {
                const ok = v.guessed.includes(L), no = v.wrongLetters.includes(L);
                return `<button type="button" class="g-key ${ok ? 'ok' : ''} ${no ? 'no' : ''}" data-l="${L}" ${ok || no || !myTurn ? 'disabled' : ''}>${L}</button>`;
            }).join('');
        }
        $('.hm-solve').classList.toggle('hidden', !(guessing && myTurn));
        $('.hm-solve input').placeholder = t('solvePh');
        $('.hm-solve button').textContent = t('solveBtn');
    },
};
