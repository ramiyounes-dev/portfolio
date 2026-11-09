import { art, board, at, piece, dot, rect, arrow, label, pill, line, path } from '../client/howto-art.js';
import { modesStep, WATCH_NOTE, touch } from './common.js';

// Walls sit in the groove between squares and cover two squares.
const hWall = (x0, y0, s, c, r, cls = 'k-wall') => rect(x0 + c * s + 2, y0 + r * s - 3.5, 2 * s - 4, 7, cls, 3.5);
const vWall = (x0, y0, s, c, r, cls = 'k-wall') => rect(x0 + c * s - 3.5, y0 + r * s + 2, 7, 2 * s - 4, cls, 3.5);

function goal() {
    const s = 22, x = 61, y = 21, p = at(x, y, s);
    return art(
        board(x, y, 9, 9, s, { fill: (c, r) => (r === 8 ? 'k-soft' : r === 0 ? 'k-soft2' : null) }),
        piece(...p(4, 0), 8, 'a'), piece(...p(4, 8), 8, 'b'),
        arrow(36, 60, 36, 180), arrow(284, 180, 284, 60, { cls: 'k-arr-m' }),
    );
}
function setup() {
    const s = 22, x = 61, y = 21, p = at(x, y, s);
    const stack = (sx, cls) => Array.from({ length: 10 }, (_, k) => rect(sx, 40 + k * 16, 34, 7, cls, 3.5)).join('');
    return art(
        board(x, y, 9, 9, s), piece(...p(4, 0), 8, 'a'), piece(...p(4, 8), 8, 'b'),
        stack(12, 'k-wall'), stack(274, 'k-wall-b'),
        label(29, 22, '10', { cls: 'k-ta', size: 12 }), label(291, 22, '10', { cls: 'k-tm', size: 12 }),
    );
}
function moving() {
    const s = 36, x = 70, y = 30, p = at(x, y, s);
    return art(
        board(x, y, 5, 5, s, { fill: (c, r) => ((c === 2 && (r === 1 || r === 3)) || (r === 2 && c === 1) ? 'k-soft' : null) }),
        dot(...p(2, 1), 5), dot(...p(2, 3), 5), dot(...p(1, 2), 5),
        vWall(x, y, s, 3, 2), piece(...p(2, 2), 12, 'a'),
    );
}
function jumping() {
    const s = 30, y = 50;
    const left = 50, right = 180, pl = at(left, y, s), pr = at(right, y, s);
    return art(
        board(left, y, 3, 4, s, { fill: (c, r) => (c === 1 && r === 1 ? 'k-soft' : null) }),
        piece(...pl(1, 3), 10, 'a'), piece(...pl(1, 2), 10, 'b'), dot(...pl(1, 1), 4.5),
        arrow(pl(1, 3)[0] + 16, pl(1, 3)[1], pl(1, 1)[0] + 14, pl(1, 1)[1] + 4, { bend: -18 }),
        board(right, y, 3, 4, s, { fill: (c, r) => (r === 2 && c !== 1 ? 'k-soft' : null) }),
        piece(...pr(1, 3), 10, 'a'), piece(...pr(1, 2), 10, 'b'),
        hWall(right, y, s, 1, 2),
        dot(...pr(0, 2), 4.5), dot(...pr(2, 2), 4.5),
    );
}
function walls() {
    const s = 36, x = 70, y = 30, p = at(x, y, s);
    return art(
        board(x, y, 5, 5, s),
        hWall(x, y, s, 1, 2), vWall(x, y, s, 4, 2),
        rect(x + 0 * s + 2, y + 4 * s - 3.5, 2 * s - 4, 7, 'k-ghost', 3.5),
        piece(...p(2, 1), 11, 'b'), piece(...p(2, 3), 11, 'a'),
    );
}
function noBlock() {
    const s = 32, x = 64, y = 40, p = at(x, y, s);
    const gx = x + 4 * s + 2, gy = y + 3 * s - 3.5;
    return art(
        board(x, y, 6, 5, s, { fill: (c, r) => (r === 4 ? 'k-soft' : null) }),
        hWall(x, y, s, 0, 3), hWall(x, y, s, 2, 3),
        path(`M${p(2, 0)[0]} ${p(2, 0)[1] + 12} L${p(2, 1)[0]} ${p(2, 1)[1]} L${p(4, 1)[0]} ${p(4, 1)[1]} L${p(4, 4)[0]} ${p(4, 4)[1]}`, 'k-arr-m', ' stroke-dasharray="4 5"'),
        rect(gx, gy, 2 * s - 4, 7, 'k-dng', 3.5),
        line(gx + s - 12, gy - 14, gx + s + 8, gy + 20, 'k-dngs'), line(gx + s + 8, gy - 14, gx + s - 12, gy + 20, 'k-dngs'),
        piece(...p(2, 0), 10, 'a'),
    );
}
function controls(lang) {
    const fr = lang === 'fr';
    const s = 26, x = 69, y = 26, p = at(x, y, s);
    return art(
        board(x, y, 7, 4, s),
        piece(...p(3, 0), 9, 'a'), dot(...p(2, 0), 4), dot(...p(4, 0), 4), dot(...p(3, 1), 4),
        rect(x + 1 * s + 2, y + 3 * s - 3.5, 2 * s - 4, 7, 'k-wall', 3.5, ' opacity=".55"'),
        pill(70, 186, fr ? 'Avancer' : 'Move', { cls: 'k-pill-acc', ink: 'k-tbg' }),
        pill(146, 186, fr ? 'Mur' : 'Wall'),
        pill(232, 186, fr ? 'Tourner' : 'Rotate'),
        label(160, 222, fr ? 'Poser le mur' : 'Place wall', { size: 10 }),
    );
}

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: goal,
        text: {
            en: 'Race your pawn to the <b>opposite side</b> of the board. Amber goes down, Ivory goes up. The first pawn to reach any square of the far row wins.',
            fr: 'Amène ton pion de l\'<b>autre côté</b> du plateau. Ambre descend, Ivoire monte. Le premier pion qui atteint n\'importe quelle case de la dernière rangée gagne.',
        },
    },
    {
        title: { en: 'Board and walls', fr: 'Plateau et murs' },
        art: setup,
        text: {
            en: 'The board has 9 × 9 squares. Each pawn starts in the middle of its own edge, and each player has <b>10 walls</b>. Amber plays first.',
            fr: 'Le plateau fait 9 × 9 cases. Chaque pion part du milieu de son bord, et chaque joueur a <b>10 murs</b>. Ambre commence.',
        },
    },
    {
        title: { en: 'Moving', fr: 'Avancer' },
        art: moving,
        text: {
            en: 'On your turn, either move or place a wall. A move is <b>one square</b> up, down, left or right. No diagonals, and never through a wall.',
            fr: 'À ton tour, avance ou pose un mur. Un déplacement fait <b>une case</b> en haut, en bas, à gauche ou à droite. Pas de diagonale, et jamais à travers un mur.',
        },
    },
    {
        title: { en: 'Jumping', fr: 'Sauter' },
        art: jumping,
        text: {
            en: 'If the other pawn is right next to you, <b>jump over it</b>. If a wall or the edge stops the jump, step <b>diagonally</b> to either side of it instead.',
            fr: 'Si l\'autre pion est juste à côté, <b>saute par-dessus</b>. Si un mur ou le bord bloque le saut, va en <b>diagonale</b> d\'un côté ou de l\'autre.',
        },
    },
    {
        title: { en: 'Placing walls', fr: 'Poser un mur' },
        art: walls,
        text: {
            en: 'A wall covers <b>two squares</b>, flat or upright, in the groove between squares. Walls cannot overlap or cross, and they stay until the end of the game.',
            fr: 'Un mur couvre <b>deux cases</b>, à plat ou debout, dans la rainure entre les cases. Les murs ne peuvent ni se chevaucher ni se croiser, et restent jusqu\'à la fin.',
        },
    },
    {
        title: { en: 'Open paths', fr: 'Chemins ouverts' },
        art: noBlock,
        text: {
            en: 'You can slow a pawn down, but you can never <b>close every path</b> to its goal. A wall that would do it is refused and turns red.',
            fr: 'Tu peux ralentir un pion, mais jamais <b>fermer tous les chemins</b> vers son but. Un mur qui le ferait est refusé et devient rouge.',
        },
    },
    {
        title: { en: 'Controls', fr: 'Commandes' },
        art: controls,
        text: lang => (touch()
            ? (lang === 'fr'
                ? '<b>Touche un point</b> pour avancer ou sauter. Pour un mur, appuie sur <b>Mur</b>, glisse pour viser, <b>Tourner</b> le pivote, puis <b>Poser le mur</b>.'
                : '<b>Tap a dot</b> to move or jump. For a wall, press <b>Wall</b>, drag to aim, <b>Rotate</b> turns it, then press <b>Place wall</b>.')
            : (lang === 'fr'
                ? '<b>Clique un point</b> pour avancer ou sauter. <b>Mur</b> (ou W) : le mur suit la souris, clique pour le poser. <b>R</b> ou la molette le tourne, Échap revient au déplacement.'
                : '<b>Click a dot</b> to move or jump. <b>Wall</b> (or W): the wall follows your mouse, click to place it. <b>R</b> or the scroll wheel turns it, Esc goes back to moving.')),
    },
    modesStep(WATCH_NOTE),
];
