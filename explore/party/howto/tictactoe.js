import { art, board, at, markX, markO, rect, label, line } from '../client/howto-art.js';
import { modesStep, DUEL_NOTE } from './common.js';

const s = 56, x = 76, y = 36, p = at(x, y, s);
const marks = str => str.split('').map((m, k) => (m === 'x' ? markX(...p(k % 3, Math.floor(k / 3)), 14) : m === 'o' ? markO(...p(k % 3, Math.floor(k / 3)), 15) : '')).join('');

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(board(x, y, 3, 3, s), marks('xoxox..ox'), line(...p(0, 0), ...p(2, 2), 'k-accs')),
        text: {
            en: 'Be the first to line up <b>three of your marks</b> in a row, a column or a diagonal.',
            fr: 'Sois le premier à aligner <b>trois de tes symboles</b> sur une ligne, une colonne ou une diagonale.',
        },
    },
    {
        title: { en: 'Taking turns', fr: 'Chacun son tour' },
        art: () => art(board(x, y, 3, 3, s, { fill: (c, r) => (c === 2 && r === 0 ? 'k-soft' : null) }), marks('x...o....'), `<g opacity=".45">${markX(...p(2, 0), 14)}</g>`),
        text: {
            en: 'X and O take turns placing their mark in an <b>empty square</b>. X is drawn at random for the first game, then the players swap who starts.',
            fr: 'X et O posent chacun leur tour leur symbole dans une <b>case vide</b>. X est tiré au sort pour la première partie, puis les joueurs alternent.',
        },
    },
    {
        title: { en: 'A draw', fr: 'Égalité' },
        art: () => art(board(x, y, 3, 3, s), marks('xoxxoooxx')),
        text: {
            en: 'If all nine squares are full and nobody has a line, the game is a <b>draw</b>.',
            fr: 'Si les neuf cases sont pleines et que personne n\'a de ligne, la partie est une <b>égalité</b>.',
        },
    },
    {
        title: { en: 'The match', fr: 'Le match' },
        art: lang => art(
            rect(50, 70, 220, 100, 'k-paper', 16), markX(88, 104, 13), markO(232, 104, 14),
            label(160, 104, '2 - 1', { size: 24, cls: 'k-t', font: 'display' }), label(160, 146, lang === 'fr' ? 'en 2 manches gagnantes' : 'best of 3', { size: 11 }),
        ),
        text: {
            en: 'A match is <b>best of 3</b> by default: first to 2 game wins. Each turn has a timer (20 s by default); if it runs out, a random square is played for you.',
            fr: 'Un match se joue en <b>deux manches gagnantes</b> par défaut. Chaque tour a un chrono (20 s par défaut) ; s\'il expire, une case au hasard est jouée pour toi.',
        },
    },
    modesStep({
        en: DUEL_NOTE.en + ' When a match ends, the winner stays on (or both rotate out, if the host chooses).',
        fr: DUEL_NOTE.fr + ' À la fin d\'un match, le gagnant reste (ou les deux changent, si l\'hôte le choisit).',
    }),
];
