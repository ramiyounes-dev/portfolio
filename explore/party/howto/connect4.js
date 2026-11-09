import { art, rect, circle, arrow, line } from '../client/howto-art.js';
import { modesStep, WATCH_NOTE, touch } from './common.js';

// A 7 × 6 grid of holes; discs: { 'c,r': 'a' | 'b' }, r = 0 is the top row.
function grid(discs = {}, { hl = [], x = 62, y = 40, s = 28, ghost = null } = {}) {
    const out = [rect(x - 8, y - 8, 7 * s + 16, 6 * s + 16, 'k-board', 10)];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
        const cx = x + c * s + s / 2, cy = y + r * s + s / 2, d = discs[`${c},${r}`];
        out.push(circle(cx, cy, s * 0.38, d ? `k-pc-${d}` : 'k-hole'));
        if (hl.some(([hc, hr]) => hc === c && hr === r)) out.push(circle(cx, cy, s * 0.44, 'k-ring'));
    }
    if (ghost !== null) out.push(circle(x + ghost * s + s / 2, y - 22, s * 0.38, 'k-pc-a'));
    return out.join('');
}
const D = str => Object.fromEntries(str.trim().split(/\s+/).map(t => { const [c, r, w] = t.split(','); return [`${c},${r}`, w]; }));

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(grid(D('1,5,a 2,4,a 3,3,a 4,2,a 2,5,b 3,5,b 3,4,b 4,5,a 4,4,b 4,3,b 5,5,b'), { hl: [[1, 5], [2, 4], [3, 3], [4, 2]] })),
        text: {
            en: 'Be the first to line up <b>four of your discs</b> in a row: across, up and down, or diagonally.',
            fr: 'Sois le premier à aligner <b>quatre de tes jetons</b> : à l\'horizontale, à la verticale ou en diagonale.',
        },
    },
    {
        title: { en: 'The grid', fr: 'La grille' },
        art: () => art(grid({}), circle(40, 120, 10, 'k-pc-a'), circle(280, 120, 10, 'k-pc-b')),
        text: {
            en: 'The grid stands upright: <b>7 columns</b> of <b>6 holes</b>. Amber and Ivory take turns, one disc per turn. Amber plays first.',
            fr: 'La grille est debout : <b>7 colonnes</b> de <b>6 trous</b>. Ambre et Ivoire jouent chacun leur tour, un jeton par tour. Ambre commence.',
        },
    },
    {
        title: { en: 'Dropping a disc', fr: 'Lâcher un jeton' },
        art: () => art(grid(D('3,5,b 3,4,a 2,5,a'), { ghost: 3, hl: [[3, 3]] }), arrow(62 + 3 * 28 + 14, 26, 62 + 3 * 28 + 14, 40 + 3 * 28 + 2)),
        text: {
            en: 'Pick a column and your disc <b>falls to the lowest free hole</b>. A full column cannot take more discs.',
            fr: 'Choisis une colonne : ton jeton <b>tombe dans le trou libre le plus bas</b>. Une colonne pleine n\'accepte plus de jeton.',
        },
    },
    {
        title: { en: 'Block and build', fr: 'Bloquer' },
        art: () => art(grid(D('1,5,a 2,5,a 3,5,a 4,5,b 0,5,b 2,4,b 3,4,a'), { hl: [[4, 5], [0, 5]] })),
        text: {
            en: 'Watch the other player\'s lines and <b>drop into the gap</b> before they finish. A disc can block one line and start another.',
            fr: 'Surveille les lignes de l\'adversaire et <b>bouche le trou</b> avant qu\'il les termine. Un jeton peut bloquer une ligne et en commencer une autre.',
        },
    },
    {
        title: { en: 'Winning', fr: 'Gagner' },
        art: () => art(grid(D('0,5,a 1,5,b 2,5,a 3,5,b 4,5,a 5,5,b 6,5,a 0,4,b 1,4,a 2,4,b 3,4,a 4,4,b 5,4,a 6,4,b 0,3,a 1,3,b 2,3,a 3,3,b 4,3,a 5,3,b 6,3,a'), {})),
        text: {
            en: 'Four in a row ends the game at once. If the grid fills up with no line of four, it is a <b>draw</b>. Wins add up across rematches.',
            fr: 'Quatre alignés terminent la partie tout de suite. Si la grille se remplit sans ligne de quatre, c\'est une <b>égalité</b>. Les victoires s\'additionnent d\'une revanche à l\'autre.',
        },
    },
    {
        title: { en: 'Controls', fr: 'Commandes' },
        art: () => art(grid(D('3,5,b 2,5,a'), { ghost: 4 }), line(62 + 4 * 28 + 14, 40, 62 + 4 * 28 + 14, 208, 'k-arr-m')),
        text: lang => (touch()
            ? (lang === 'fr' ? '<b>Touche une colonne</b> pour lâcher un jeton, ou <b>glisse</b> le long de la grille et relâche.' : '<b>Tap a column</b> to drop a disc, or <b>slide</b> along the grid and let go.')
            : (lang === 'fr' ? '<b>Clique une colonne</b> pour lâcher un jeton. Au clavier : <b>← →</b> choisissent une colonne, <b>Entrée</b> lâche, ou appuie sur <b>1 à 7</b>.' : '<b>Click a column</b> to drop a disc. With the keyboard, <b>← →</b> pick a column and <b>Enter</b> drops, or press <b>1 to 7</b>.')),
    },
    modesStep(WATCH_NOTE),
];
