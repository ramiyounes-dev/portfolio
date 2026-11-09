import { art, rect, line, circle, label } from '../client/howto-art.js';
import { modesStep } from './common.js';

// Piles of matches, one row per pile. taken: [pile, from] greys the matches from index `from` to the end.
function piles(list, { sel = null, gone = null, x0 = 60, y0 = 40 } = {}) {
    const out = [], gap = 160 / Math.max(1, list.length - 1);
    list.forEach((n, i) => {
        const y = y0 + i * Math.min(gap, 46);
        for (let k = 0; k < n; k++) {
            const x = x0 + k * 26;
            const picked = sel && sel[0] === i && k >= sel[1];
            const off = gone && gone[0] === i && k >= gone[1];
            const cls = off ? 'k-line' : picked ? 'k-accs' : 'k-ink';
            out.push(`<g${off ? ' opacity=".35"' : ''}>${line(x, y + 14, x, y - 10, cls)}${circle(x, y - 13, 4, picked ? 'k-acc' : off ? 'k-soft2' : 'k-dng')}</g>`);
        }
    });
    return out.join('');
}

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(piles([0, 0, 1, 0], { sel: [2, 0] })),
        text: {
            en: 'Players take matches from the piles in turn. By default (misère), whoever takes the <b>last match loses</b>. In normal mode, the last match wins.',
            fr: 'Les joueurs prennent des allumettes dans les tas, chacun son tour. Par défaut (misère), celui qui prend la <b>dernière allumette perd</b>. En mode normal, la dernière allumette gagne.',
        },
    },
    {
        title: { en: 'The piles', fr: 'Les tas' },
        art: () => art(piles([1, 3, 5, 7])),
        text: {
            en: 'The game starts with piles of 1, 3, 5 and 7 matches. The host can pick another preset or a random setup.',
            fr: 'La partie commence avec des tas de 1, 3, 5 et 7 allumettes. L\'hôte peut choisir un autre départ ou un tirage au hasard.',
        },
    },
    {
        title: { en: 'Your turn', fr: 'Ton tour' },
        art: () => art(piles([1, 3, 5, 7], { sel: [3, 4] }), rect(60 + 4 * 26 - 12, 40 + 3 * 46 - 30, 3 * 26, 52, 'k-ghost', 8)),
        text: {
            en: 'Take <b>at least one</b> match from <b>exactly one</b> pile: any number, up to the whole pile. Tap a match to select it and every match to its right, then confirm.',
            fr: 'Prends <b>au moins une</b> allumette dans <b>un seul</b> tas : autant que tu veux, jusqu\'au tas entier. Touche une allumette pour la choisir avec toutes celles à sa droite, puis valide.',
        },
    },
    {
        title: { en: 'Think ahead', fr: 'Anticiper' },
        art: () => art(piles([0, 2, 2, 0])),
        text: {
            en: 'Every move changes what your opponents can do next. Try to leave a position where any move they make helps you. If your turn timer runs out, one match is taken from a random pile for you.',
            fr: 'Chaque coup change ce que les autres pourront faire ensuite. Essaie de laisser une position où tout coup adverse t\'arrange. Si ton chrono expire, une allumette est prise dans un tas au hasard pour toi.',
        },
    },
    {
        title: { en: 'Scoring', fr: 'Points' },
        art: lang => art(rect(70, 60, 180, 120, 'k-paper', 16), label(160, 100, '5', { size: 34, cls: 'k-t', font: 'display' }), label(160, 146, lang === 'fr' ? 'parties' : 'games', { size: 11 })),
        text: {
            en: 'With 2 players, the winner of each game scores 1. With 3 or more in misère, everyone except the player who took the last match gets +1; in normal mode, the taker gets +2. After 5 games by default, the highest total wins.',
            fr: 'À 2 joueurs, le gagnant de chaque partie marque 1. À 3 ou plus en misère, tout le monde sauf celui qui a pris la dernière allumette gagne +1 ; en mode normal, le preneur gagne +2. Après 5 parties par défaut, le meilleur total gagne.',
        },
    },
    modesStep({
        en: 'Late joiners enter at the next game with the lowest score.',
        fr: 'Les retardataires entrent à la partie suivante avec le score le plus bas.',
    }),
];
