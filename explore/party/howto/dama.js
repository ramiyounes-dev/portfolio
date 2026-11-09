import { art, board, at, piece, dot, ring, arrow, line, rect, group } from '../client/howto-art.js';
import { modesStep, WATCH_NOTE, touch } from './common.js';

const king = (cx, cy, r, who = 'a') => `<circle cx="${cx}" cy="${cy + 3}" r="${r}" class="k-pc-${who}-st"/><circle cx="${cx}" cy="${cy - 3}" r="${r}" class="k-pc-${who}-st"/>`;
const cross = (cx, cy, k = 7) => line(cx - k, cy - k, cx + k, cy + k, 'k-dngs') + line(cx + k, cy - k, cx - k, cy + k, 'k-dngs');

function goal() {
    const s = 24, x = 64, y = 24, p = at(x, y, s), out = [board(x, y, 8, 8, s)];
    const a = [[1, 2], [3, 2], [4, 3], [6, 2], [2, 1]], b = [[5, 4]];
    for (const [c, r] of a) out.push(piece(...p(c, r), 9, 'a'));
    for (const [c, r] of b) out.push(piece(...p(c, r), 9, 'b'));
    return art(out);
}
function setup() {
    const s = 24, x = 64, y = 24, p = at(x, y, s), out = [board(x, y, 8, 8, s, { fill: (c, r) => (r === 7 || r === 0 ? 'k-soft2' : null) })];
    for (let c = 0; c < 8; c++) { out.push(piece(...p(c, 1), 9, 'a'), piece(...p(c, 2), 9, 'a'), piece(...p(c, 5), 9, 'b'), piece(...p(c, 6), 9, 'b')); }
    return art(out);
}
function moving() {
    const s = 36, x = 70, y = 30, p = at(x, y, s);
    return art(
        board(x, y, 5, 5, s, { fill: (c, r) => ((r === 2 && c === 2) || (r === 1 && (c === 1 || c === 3)) ? 'k-soft' : null) }),
        piece(...p(2, 1), 12, 'a'), dot(...p(2, 2), 5), dot(...p(1, 1), 5), dot(...p(3, 1), 5),
        cross(...p(2, 0)), arrow(p(2, 1)[0], p(2, 1)[1] + 16, p(2, 2)[0], p(2, 2)[1] - 10),
    );
}
function capture() {
    const s = 36, x = 70, y = 30, p = at(x, y, s);
    return art(
        board(x, y, 5, 5, s),
        piece(...p(1, 0), 12, 'a'), piece(...p(1, 1), 12, 'b'), piece(...p(2, 2), 12, 'b'),
        ring(...p(1, 2), 12), ring(...p(3, 2), 12),
        arrow(p(1, 0)[0] - 16, p(1, 0)[1] + 4, p(1, 2)[0] - 16, p(1, 2)[1] - 4, { bend: 16 }),
        arrow(p(1, 2)[0] + 4, p(1, 2)[1] + 16, p(3, 2)[0] - 4, p(3, 2)[1] + 16, { bend: 16 }),
    );
}
function most() {
    const s = 36, x = 70, y = 30, p = at(x, y, s);
    return art(
        board(x, y, 5, 5, s),
        piece(...p(1, 0), 12, 'a'), piece(...p(1, 1), 12, 'b'), piece(...p(2, 2), 12, 'b'), piece(...p(2, 0), 12, 'b'),
        ring(...p(3, 2), 12),
        `<g class="k-fade">${arrow(p(1, 0)[0] + 6, p(1, 0)[1] - 14, p(3, 0)[0], p(3, 0)[1] - 12, { bend: -14, cls: 'k-arr-m' })}</g>`,
        cross(...p(3, 0)),
        arrow(p(1, 0)[0] - 16, p(1, 0)[1] + 4, p(1, 2)[0] - 16, p(1, 2)[1] - 4, { bend: 16 }),
        arrow(p(1, 2)[0] + 4, p(1, 2)[1] + 16, p(3, 2)[0] - 4, p(3, 2)[1] + 16, { bend: 16 }),
    );
}
function kings() {
    const s = 36, x = 70, y = 30, p = at(x, y, s);
    return art(
        board(x, y, 5, 5, s),
        king(...p(0, 2), 12), dot(...p(0, 0), 5), dot(...p(0, 1), 5), dot(...p(0, 3), 5), dot(...p(0, 4), 5), dot(...p(1, 2), 5),
        piece(...p(2, 2), 12, 'b'), ring(...p(3, 2), 12), ring(...p(4, 2), 12),
    );
}
function controls() {
    const s = 36, x = 70, y = 30, p = at(x, y, s);
    return art(
        board(x, y, 5, 5, s),
        circle2(...p(2, 1)), piece(...p(2, 1), 12, 'a'), piece(...p(1, 3), 12, 'a'), piece(...p(3, 3), 12, 'b'),
        dot(...p(2, 2), 5), dot(...p(1, 1), 5), dot(...p(3, 1), 5),
    );
}
const circle2 = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="16" class="k-hl"/>`;
void rect; void group;

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: goal,
        text: {
            en: 'Capture <b>every piece</b> of the other player, or leave them with <b>no legal move</b>. Either way, you win.',
            fr: 'Prends <b>tous les pions</b> de l\'autre joueur, ou laisse-le <b>sans aucun coup possible</b>. Dans les deux cas, tu gagnes.',
        },
    },
    {
        title: { en: 'The board', fr: 'Le plateau' },
        art: setup,
        text: {
            en: 'An 8 × 8 board, all squares used. Each side has <b>16 pieces</b> on its second and third rows. Amber plays first.',
            fr: 'Un plateau 8 × 8, toutes les cases servent. Chaque camp a <b>16 pions</b> sur ses deuxième et troisième rangées. Ambre commence.',
        },
    },
    {
        title: { en: 'Moving', fr: 'Déplacements' },
        art: moving,
        text: {
            en: 'A piece moves <b>one square</b> forward, left or right. Never backward, never diagonally.',
            fr: 'Un pion avance d\'<b>une case</b> vers l\'avant, la gauche ou la droite. Jamais en arrière, jamais en diagonale.',
        },
    },
    {
        title: { en: 'Capturing', fr: 'Prises' },
        art: capture,
        text: {
            en: 'Jump over an enemy piece next to you onto the empty square behind it, forward or sideways. If you can jump again, the same piece <b>keeps going</b>.',
            fr: 'Saute par-dessus un pion adverse voisin vers la case vide derrière, en avant ou sur le côté. Si tu peux sauter encore, le même pion <b>continue</b>.',
        },
    },
    {
        title: { en: 'Take the most', fr: 'Prendre le plus' },
        art: most,
        text: {
            en: 'Capturing is <b>mandatory</b>. When there is a choice, you must take the path that captures the <b>most pieces</b>.',
            fr: 'La prise est <b>obligatoire</b>. S\'il y a un choix, il faut prendre le chemin qui capture le <b>plus de pions</b>.',
        },
    },
    {
        title: { en: 'Kings', fr: 'Dames' },
        art: kings,
        text: {
            en: 'Reach the far row to become a <b>King</b>. A King moves any distance in a straight line, backward too, and captures from afar, landing on any free square past the piece.',
            fr: 'Atteins la dernière rangée pour devenir <b>Dame</b>. Une dame va aussi loin qu\'elle veut en ligne droite, même en arrière, et prend à distance en se posant sur une case libre derrière le pion.',
        },
    },
    {
        title: { en: 'Controls', fr: 'Commandes' },
        art: controls,
        text: lang => {
            const t = touch();
            return lang === 'fr'
                ? `<b>${t ? 'Touche' : 'Clique'} un pion</b>, puis un <b>point</b> pour le déplacer. Quand une prise est obligatoire, les pions concernés brillent et des anneaux montrent où atterrir.${t ? '' : ' Échap annule une sélection.'}`
                : `<b>${t ? 'Tap' : 'Click'} a piece</b>, then a <b>dot</b> to move it. When a capture is mandatory, the pieces that must capture glow and rings show where to land.${t ? '' : ' Esc cancels a selection.'}`;
        },
    },
    modesStep(WATCH_NOTE),
];
