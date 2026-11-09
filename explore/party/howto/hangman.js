import { art, rect, line, circle, label, pill } from '../client/howto-art.js';
import { modesStep } from './common.js';

// Gallows with `parts` of 6 drawn (head, body, arms, legs), at (x, y) top-left.
function gallows(parts, x = 34, y = 40) {
    const out = [line(x, y + 140, x + 70, y + 140, 'k-ink'), line(x + 18, y + 140, x + 18, y, 'k-ink'), line(x + 18, y, x + 74, y, 'k-ink'), line(x + 74, y, x + 74, y + 20, 'k-ink')];
    const cx = x + 74;
    if (parts > 0) out.push(circle(cx, y + 32, 12, 'k-dngs'));
    if (parts > 1) out.push(line(cx, y + 44, cx, y + 84, 'k-dngs'));
    if (parts > 2) out.push(line(cx, y + 54, cx - 16, y + 70, 'k-dngs'));
    if (parts > 3) out.push(line(cx, y + 54, cx + 16, y + 70, 'k-dngs'));
    if (parts > 4) out.push(line(cx, y + 84, cx - 14, y + 108, 'k-dngs'));
    if (parts > 5) out.push(line(cx, y + 84, cx + 14, y + 108, 'k-dngs'));
    return out.join('');
}
// Word with hidden letters: shown letters in `known`, blanks for the rest.
function word(w, known, lang = 'en', { x = 150, y = 120, s = 22 } = {}) {
    if (lang === 'fr') { w = 'JARDIN'; known = known.replace('G', 'J').replace('E', 'I'); }
    return w.split('').map((ch, k) => line(x + k * s, y + 14, x + k * s + s - 6, y + 14, 'k-line')
        + (known.includes(ch) ? label(x + k * s + (s - 6) / 2, y, ch, { size: 16, cls: 'k-t', font: 'display' }) : '')).join('');
}
const W = 'GARDEN';

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: lang => art(gallows(2), word(W, 'GAE', lang)),
        text: {
            en: 'Guess the hidden word <b>letter by letter</b> before the drawing is complete. Points go to good guesses; the highest total at the end wins.',
            fr: 'Devine le mot caché <b>lettre par lettre</b> avant que le dessin soit complet. Les bonnes réponses rapportent des points ; le meilleur total à la fin gagne.',
        },
    },
    {
        title: { en: 'The Word Setter', fr: 'Le maître du mot' },
        art: lang => art(rect(70, 70, 180, 44, 'k-paper', 10), label(160, 92, '• • • • • •', { size: 14, cls: 'k-t' }),
            pill(160, 150, lang === 'fr' ? 'Mot au hasard' : 'Random word', { w: 150 })),
        text: {
            en: 'Each round, one player is the <b>Word Setter</b>, in turn. They type a secret word (letters only, 3 to 20) or press <b>Random word</b>. The host can make every word random.',
            fr: 'À chaque manche, un joueur est le <b>maître du mot</b>, à tour de rôle. Il tape un mot secret (lettres seulement, de 3 à 20) ou appuie sur <b>Mot au hasard</b>. L\'hôte peut rendre tous les mots aléatoires.',
        },
    },
    {
        title: { en: 'Guessing', fr: 'Deviner' },
        art: lang => art(gallows(1), word(W, 'GAE', lang), pill(200, 176, 'R', { w: 36, cls: 'k-pill-acc', ink: 'k-tbg', size: 14 })),
        text: {
            en: 'Guessers take turns. Guess <b>one letter</b>: a correct letter shows every copy, scores <b>+1 each</b>, and you guess again (up to 3 in a row). Accents do not matter: E also finds É, È and Ê.',
            fr: 'Les devineurs jouent chacun leur tour. Propose <b>une lettre</b> : une bonne lettre apparaît partout, rapporte <b>+1 par occurrence</b>, et tu rejoues (jusqu\'à 3 fois de suite). Les accents ne comptent pas : E trouve aussi É, È et Ê.',
        },
    },
    {
        title: { en: 'Wrong letters', fr: 'Mauvaises lettres' },
        art: lang => art(gallows(4), word(W, 'GAER', lang), label(196, 176, 'T  S  O  U', { size: 13, cls: 'k-tdng' })),
        text: {
            en: 'A wrong letter adds a part to the drawing (6 parts by default) and the turn passes. If your turn timer runs out, the turn passes too.',
            fr: 'Une mauvaise lettre ajoute une partie au dessin (6 parties par défaut) et le tour passe. Si ton chrono expire, le tour passe aussi.',
        },
    },
    {
        title: { en: 'Solve it', fr: 'Trouver le mot' },
        art: lang => art(gallows(3), word(W, 'GARDEN', lang), pill(200, 176, '+5 +2', { w: 90, cls: 'k-pill-acc', ink: 'k-tbg' })),
        text: {
            en: 'On your turn you can also try the <b>whole word</b>. Right: <b>+5 plus 1 per hidden letter</b>. Wrong: it counts as <b>2 wrong guesses</b>.',
            fr: 'À ton tour, tu peux aussi tenter le <b>mot entier</b>. Juste : <b>+5 plus 1 par lettre cachée</b>. Faux : cela compte comme <b>2 mauvaises lettres</b>.',
        },
    },
    {
        title: { en: 'End of a round', fr: 'Fin de manche' },
        art: lang => art(gallows(6), word(W, 'GAER', lang)),
        text: {
            en: 'The round ends when the word is found, or when the drawing is complete: then the setter scores <b>+5</b>. The game ends once everyone has been the setter, or after the host\'s number of rounds.',
            fr: 'La manche s\'arrête quand le mot est trouvé, ou quand le dessin est complet : le maître du mot marque alors <b>+5</b>. La partie s\'arrête quand chacun a été maître du mot, ou après le nombre de manches choisi par l\'hôte.',
        },
    },
    modesStep({
        en: 'Late joiners enter at the next round with the lowest score.',
        fr: 'Les retardataires entrent à la manche suivante avec le score le plus bas.',
    }),
];
