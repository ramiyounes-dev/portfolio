import { art, rect, circle } from '../client/howto-art.js';
import { modesStep, DUEL_NOTE } from './common.js';

// Green 8 × 8 board like the game. discs: string of 64 chars, b / w / . ; dots: legal moves; ring: last move.
function rv(rows, { x = 64, y = 24, s = 24, dots = [], ring = null, n = 8 } = {}) {
    const out = [rect(x - 6, y - 6, n * s + 12, n * s + 12, 'k-rvBoard', 10)];
    const str = rows.replace(/\s+/g, '');
    for (let k = 0; k < n * n; k++) {
        const c = k % n, r = Math.floor(k / n), cx = x + c * s + s / 2, cy = y + r * s + s / 2;
        out.push(rect(x + c * s, y + r * s, s, s, 'k-rvCell', 3));
        if (str[k] === 'b' || str[k] === 'w') out.push(circle(cx, cy, s * 0.4, str[k] === 'b' ? 'k-rvB' : 'k-rvW'));
        if (dots.includes(k)) out.push(circle(cx, cy, s * 0.12, 'k-dot'));
        if (ring === k) out.push(circle(cx, cy, s * 0.46, 'k-ring'));
    }
    return out.join('');
}
const START = '........ ........ ........ ...wb... ...bw... ........ ........ ........';

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(rv('bbbwwbbb bbwwbbbb bwbbwbwb bbwbbbwb bwbbwwbb bbbwbbwb wbbbbbbb bbwbbbbb')),
        text: {
            en: 'Finish with <b>more discs of your colour</b> on the board than your opponent. Equal counts are a draw.',
            fr: 'Termine avec <b>plus de pions de ta couleur</b> sur le plateau que ton adversaire. À égalité, c\'est un match nul.',
        },
    },
    {
        title: { en: 'The start', fr: 'Le départ' },
        art: () => art(rv(START)),
        text: {
            en: 'An 8 × 8 board starts with 4 discs in the centre, 2 black and 2 white, set diagonally. Colours are drawn at random and <b>Black moves first</b>.',
            fr: 'Le plateau 8 × 8 commence avec 4 pions au centre, 2 noirs et 2 blancs, en diagonale. Les couleurs sont tirées au sort et <b>Noir commence</b>.',
        },
    },
    {
        title: { en: 'Trap a line', fr: 'Encadrer une ligne' },
        art: () => art(rv('........ ........ ........ ...wb... ...bw... ........ ........ ........', { dots: [19, 26, 37, 44] })),
        text: {
            en: 'Place a disc so that one or more straight lines of the other colour sit <b>between your new disc and another of yours</b>. Across, up and down, or diagonally. Legal moves show as dots.',
            fr: 'Pose un pion de façon à <b>encadrer</b> une ou plusieurs lignes droites de l\'autre couleur <b>entre ton nouveau pion et un autre des tiens</b>. À l\'horizontale, à la verticale ou en diagonale. Les coups possibles sont marqués d\'un point.',
        },
    },
    {
        title: { en: 'Flip', fr: 'Retourner' },
        art: () => art(rv('........ ........ ...b.... ...bb... ...bw... ........ ........ ........', { ring: 19 })),
        text: {
            en: '<b>Every trapped disc flips</b> to your colour. A move is only allowed if it flips at least one disc.',
            fr: '<b>Chaque pion encadré se retourne</b> dans ta couleur. Un coup n\'est permis que s\'il retourne au moins un pion.',
        },
    },
    {
        title: { en: 'Pass and end', fr: 'Passer, finir' },
        art: () => art(rv('wwwwwwww wwwwwwww wwwwwwbw wwwwwbbw wwwwbbbw wwwbbb.. wwbbbb.. wwwwww..')),
        text: {
            en: 'No legal move? You must <b>pass</b>. When <b>neither player</b> can move, the game ends and the discs are counted. If your turn timer runs out, a random legal move is played.',
            fr: 'Aucun coup possible ? Tu dois <b>passer</b>. Quand <b>aucun joueur</b> ne peut jouer, la partie s\'arrête et on compte les pions. Si ton chrono expire, un coup possible au hasard est joué.',
        },
    },
    modesStep(DUEL_NOTE),
];
