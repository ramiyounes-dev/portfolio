import { art, rect, label, pill } from '../client/howto-art.js';
import { modesStep } from './common.js';

const tiles = (letters, y = 90, { s = 34, gap = 6, cls = 'k-paper', ink = 'k-t' } = {}) => {
    const w = letters.length * s + (letters.length - 1) * gap, x0 = (320 - w) / 2;
    return letters.split('').map((ch, k) => rect(x0 + k * (s + gap), y - s / 2, s, s, ch === '_' ? 'k-ghost' : cls, 7) + (ch === '_' ? '' : label(x0 + k * (s + gap) + s / 2, y, ch, { size: 17, cls: ink, font: 'display' }))).join('');
};

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: lang => art(tiles('TEPLAN', 80), tiles(lang === 'fr' ? 'PLANTE' : 'PLANET', 160, { cls: 'k-acc', ink: 'k-tbg' })),
        text: {
            en: 'Unscramble the letters into a real word, <b>faster</b> than everyone else.',
            fr: 'Remets les lettres dans l\'ordre pour former un vrai mot, <b>plus vite</b> que les autres.',
        },
    },
    {
        title: { en: 'Each round', fr: 'Chaque manche' },
        art: lang => art(tiles(lang === 'fr' ? 'MIERA' : 'RTEAW', 90), tiles(lang === 'fr' ? 'AI___' : 'WA___', 160)),
        text: {
            en: 'Everyone sees the <b>same scrambled word</b> at the same time: 4 to 7 letters by default, from the room\'s language. Type your answer, or tap the tiles to build it.',
            fr: 'Tout le monde voit le <b>même mot mélangé</b> en même temps : de 4 à 7 lettres par défaut, dans la langue de la partie. Tape ta réponse, ou touche les lettres pour la former.',
        },
    },
    {
        title: { en: 'Points', fr: 'Points' },
        art: () => art([['1', '3', 70], ['2', '2', 160], ['3', '1', 250]].map(([rank, pts, x]) => rect(x - 36, 70, 72, 100, 'k-paper', 12) + label(x, 102, rank, { size: 26, cls: 'k-t', font: 'display' }) + label(x, 144, `+${pts}`, { size: 14, cls: 'k-ta' }))),
        text: {
            en: 'First correct answer: <b>3</b> points, second: <b>2</b>, third: <b>1</b>. Later answers score 0 but count as found. Wrong answers cost nothing, but you wait 1 second between tries.',
            fr: 'Première bonne réponse : <b>3</b> points, deuxième : <b>2</b>, troisième : <b>1</b>. Les suivantes valent 0 mais comptent comme trouvées. Une erreur ne coûte rien, mais il faut attendre 1 seconde entre deux essais.',
        },
    },
    {
        title: { en: 'Other words', fr: 'Autres mots' },
        art: lang => art(tiles(lang === 'fr' ? 'CHIEN' : 'ELVIS', 80), tiles(lang === 'fr' ? 'NICHE' : 'LIVES', 160, { cls: 'k-acc', ink: 'k-tbg' })),
        text: {
            en: 'Another real word with exactly the same letters is accepted if it is in the word list. Accents do not matter: "eleve" finds "élève".',
            fr: 'Un autre vrai mot avec exactement les mêmes lettres est accepté s\'il est dans la liste. Les accents ne comptent pas : « eleve » trouve « élève ».',
        },
    },
    {
        title: { en: 'Hints', fr: 'Indices' },
        art: lang => art(tiles('P_____', 100), pill(160, 170, lang === 'fr' ? 'Indice : points ÷ 2' : 'Hint: points ÷ 2', { w: 170 })),
        text: {
            en: 'The <b>Hint</b> button shows the first letter but halves your points for that round. The host can switch hints off.',
            fr: 'Le bouton <b>Indice</b> montre la première lettre mais divise tes points par deux pour la manche. L\'hôte peut désactiver les indices.',
        },
    },
    {
        title: { en: 'End', fr: 'Fin' },
        art: () => art(rect(80, 60, 160, 120, 'k-paper', 16), label(160, 104, '10', { size: 34, cls: 'k-t', font: 'display' }), label(160, 146, '30 s', { size: 12 })),
        text: {
            en: 'A round ends when everyone has found the word or the timer runs out (30 s by default). After 10 rounds, the highest score wins.',
            fr: 'Une manche s\'arrête quand tout le monde a trouvé ou que le chrono expire (30 s par défaut). Après 10 manches, le meilleur score gagne.',
        },
    },
    modesStep({
        en: 'On one device, players solve the same letters one after another, passing the phone; the fastest times score 3, 2 and 1. Late joiners enter at the next word with the lowest score.',
        fr: 'Sur un seul appareil, les joueurs résolvent les mêmes lettres l\'un après l\'autre en se passant le téléphone ; les temps les plus rapides marquent 3, 2 et 1. Les retardataires entrent au mot suivant avec le score le plus bas.',
    }),
];
