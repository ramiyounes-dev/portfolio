import { art, rect, circle, label, pill } from '../client/howto-art.js';
import { modesStep } from './common.js';

// One guess row: 4 colour pegs (indices into the game's palette) and a feedback square of black / white pins.
function row(pegs, y, { black = 0, white = 0, x = 70, empty = false } = {}) {
    const out = [rect(x - 12, y - 18, 196, 36, 'k-paper', 10)];
    pegs.forEach((c, k) => out.push(circle(x + 10 + k * 34, y, 11, c === null ? 'k-ghost' : `k-m${c}`)));
    if (!empty) {
        const pins = [...Array(black).fill('k-pinB'), ...Array(white).fill('k-pinW')];
        for (let k = 0; k < 4; k++) {
            const px = x + 158 + (k % 2) * 12, py = y - 6 + Math.floor(k / 2) * 12;
            out.push(circle(px, py, 4, pins[k] || 'k-ghost'));
        }
    }
    return out.join('');
}
const secret = (pegs, y = 40, hidden = false) => rect(82, y - 18, 156, 36, 'k-board', 10) + pegs.map((c, k) => (hidden ? circle(106 + k * 36, y, 11, 'k-pc-ink') + label(106 + k * 36, y, '?', { size: 12, cls: 'k-tbg', font: 'display' }) : circle(106 + k * 36, y, 11, `k-m${c}`))).join('');

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(secret([0, 4, 2, 3], 44, true), row([1, 4, 0, 5], 104, { black: 1, white: 1 }), row([0, 4, 2, 3], 152, { black: 4 })),
        text: {
            en: 'Crack the secret code in <b>as few guesses as possible</b>, or set a code nobody can crack. The highest total at the end wins.',
            fr: 'Trouve le code secret en <b>le moins d\'essais possible</b>, ou crée un code que personne ne trouve. Le meilleur total à la fin gagne.',
        },
    },
    {
        title: { en: 'The Codemaker', fr: 'Le créateur' },
        art: lang => art(secret([0, 4, 2, 3], 80), [0, 1, 2, 3, 4, 5].map(k => circle(85 + k * 30, 150, 10, `k-m${k}`)).join(''), pill(160, 200, lang === 'fr' ? 'Code au hasard' : 'Random code', { w: 150 })),
        text: {
            en: 'Each round, one player is the <b>Codemaker</b>, in turn. They set <b>4 pegs from 6 colours</b> (repeats allowed by default) or press <b>Random code</b>. After 45 s, a random code is set.',
            fr: 'À chaque manche, un joueur est le <b>créateur du code</b>, à tour de rôle. Il choisit <b>4 pions parmi 6 couleurs</b> (répétitions permises par défaut) ou appuie sur <b>Code au hasard</b>. Après 45 s, un code au hasard est choisi.',
        },
    },
    {
        title: { en: 'Private boards', fr: 'Plateaux privés' },
        art: () => art(rect(20, 40, 132, 160, 'k-paper', 12), rect(168, 40, 132, 160, 'k-paper', 12),
            [0, 1, 2].map(r => [0, 1, 2, 3].map(k => circle(48 + k * 25, 72 + r * 34, 8, `k-m${(r * 3 + k) % 6}`)).join('')).join(''),
            [0, 1].map(r => [0, 1, 2, 3].map(k => circle(196 + k * 25, 72 + r * 34, 8, `k-m${(r * 5 + k * 2) % 6}`)).join('')).join('')),
        text: {
            en: 'Everyone else is a <b>Codebreaker</b> and plays at the same time on a <b>private board</b>. Nobody sees the others\' guesses until the round ends.',
            fr: 'Tous les autres sont <b>décodeurs</b> et jouent en même temps sur un <b>plateau privé</b>. Personne ne voit les essais des autres avant la fin de la manche.',
        },
    },
    {
        title: { en: 'Feedback', fr: 'Indications' },
        art: () => art(row([1, 4, 0, 5], 80, { black: 1, white: 1 }), row([0, 2, 4, 3], 140, { black: 2, white: 2 })),
        text: {
            en: 'After each guess: a <b>black</b> pin is a right colour in the right place, a <b>white</b> pin a right colour in the wrong place. Only the counts are shown, not which peg is which. Up to <b>10 guesses</b>.',
            fr: 'Après chaque essai : un pion <b>noir</b> est une bonne couleur à la bonne place, un pion <b>blanc</b> une bonne couleur à la mauvaise place. Seuls les nombres sont donnés, pas quel pion est lequel. Jusqu\'à <b>10 essais</b>.',
        },
    },
    {
        title: { en: 'Points', fr: 'Points' },
        art: () => art(row([0, 4, 2, 3], 80, { black: 4 }), label(160, 140, '11 - 3 = 8   +2', { size: 15, cls: 'k-ta', font: 'display' })),
        text: {
            en: 'Cracking the code scores <b>11 minus the guesses used</b>, plus <b>+2</b> for the first to crack it. The Codemaker scores <b>+1 for every Codebreaker who fails</b>.',
            fr: 'Trouver le code rapporte <b>11 moins le nombre d\'essais</b>, plus <b>+2</b> pour le premier à le trouver. Le créateur marque <b>+1 par décodeur qui échoue</b>.',
        },
    },
    {
        title: { en: 'End', fr: 'Fin' },
        art: () => art(secret([0, 4, 2, 3], 60), row([0, 4, 2, 3], 130, { black: 4 }), row([2, 4, 0, 5], 180, { black: 1, white: 2 })),
        text: {
            en: 'A round ends when every Codebreaker has cracked it or run out of guesses, or when the timer ends. The code and all boards are shown. The game ends once everyone has been Codemaker.',
            fr: 'Une manche s\'arrête quand chaque décodeur a trouvé ou épuisé ses essais, ou à la fin du chrono. Le code et tous les plateaux sont montrés. La partie s\'arrête quand chacun a été créateur.',
        },
    },
    modesStep({
        en: 'Late joiners enter at the next round as Codebreakers with the lowest score.',
        fr: 'Les retardataires entrent à la manche suivante comme décodeurs avec le score le plus bas.',
    }),
];
