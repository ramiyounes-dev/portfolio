import { art, rect, circle, line, label } from '../client/howto-art.js';
import { modesStep } from './common.js';

// n × n boxes. h / v: lists of drawn edges 'r,c'; boxes: { 'r,c': 'a' | 'b' }; hl: the newest edge.
function grid(n, { h = [], v = [], boxes = {}, hl = null, x = null, y = null, s = null } = {}) {
    s = s || Math.min(46, 180 / n);
    x = x ?? (320 - n * s) / 2; y = y ?? (240 - n * s) / 2;
    const out = [rect(x - 14, y - 14, n * s + 28, n * s + 28, 'k-board', 10)];
    for (const [k, who] of Object.entries(boxes)) {
        const [r, c] = k.split(',').map(Number);
        out.push(rect(x + c * s + 3, y + r * s + 3, s - 6, s - 6, who === 'a' ? 'k-soft' : 'k-soft2', 4),
            label(x + c * s + s / 2, y + r * s + s / 2, who === 'a' ? 'A' : 'B', { size: s * 0.36, cls: who === 'a' ? 'k-ta' : 'k-t', font: 'display' }));
    }
    const edge = (x1, y1, x2, y2, key) => line(x1, y1, x2, y2, key === hl ? 'k-accs' : 'k-ink');
    for (const k of h) { const [r, c] = k.split(',').map(Number); out.push(edge(x + c * s, y + r * s, x + (c + 1) * s, y + r * s, 'h' + k)); }
    for (const k of v) { const [r, c] = k.split(',').map(Number); out.push(edge(x + c * s, y + r * s, x + c * s, y + (r + 1) * s, 'v' + k)); }
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) out.push(circle(x + c * s, y + r * s, 3.6, 'k-pc-ink'));
    return out.join('');
}

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(grid(4, { h: ['0,0', '1,0', '0,1', '1,1', '2,1', '3,2', '4,3'], v: ['0,0', '0,1', '0,2', '1,1', '1,2', '2,3'], boxes: { '0,0': 'a', '0,1': 'b', '1,1': 'a' } })),
        text: {
            en: 'Join dots to close boxes. When every line is drawn, the player with the <b>most boxes</b> wins. Ties are shared.',
            fr: 'Relie les points pour fermer des cases. Quand toutes les lignes sont tracées, le joueur qui a le <b>plus de cases</b> gagne. Les égalités sont partagées.',
        },
    },
    {
        title: { en: 'The grid', fr: 'La grille' },
        art: () => art(grid(4)),
        text: {
            en: 'A grid of dots: 4 × 4 boxes for 2 players, 5 × 5 for 3 or 4, and 6 × 6 for 5 or 6. The host can change it.',
            fr: 'Une grille de points : 4 × 4 cases à 2 joueurs, 5 × 5 à 3 ou 4, et 6 × 6 à 5 ou 6. L\'hôte peut la changer.',
        },
    },
    {
        title: { en: 'Your turn', fr: 'Ton tour' },
        art: () => art(grid(4, { h: ['0,0', '2,2'], v: ['1,3', '0,1'], hl: 'h2,2' })),
        text: {
            en: 'Draw <b>one line</b> between two neighbouring dots, across or up and down, where there is no line yet. If your turn timer runs out, a random line is drawn for you.',
            fr: 'Trace <b>une ligne</b> entre deux points voisins, horizontale ou verticale, là où il n\'y en a pas encore. Si ton chrono expire, une ligne au hasard est tracée pour toi.',
        },
    },
    {
        title: { en: 'Close a box', fr: 'Fermer une case' },
        art: () => art(grid(4, { h: ['1,1', '2,1'], v: ['1,1', '1,2'], boxes: { '1,1': 'a' }, hl: 'v1,2' })),
        text: {
            en: 'If your line closes the <b>fourth side</b> of one or two boxes, you claim them and <b>must play again</b>. Otherwise the turn passes.',
            fr: 'Si ta ligne ferme le <b>quatrième côté</b> d\'une ou deux cases, elles sont à toi et tu <b>dois rejouer</b>. Sinon, le tour passe.',
        },
    },
    {
        title: { en: 'Third sides', fr: 'Troisième côté' },
        art: () => art(grid(4, { h: ['0,0', '1,0', '0,1', '0,2', '1,2'], v: ['0,0', '0,3'], hl: 'h1,2' })),
        text: {
            en: 'Drawing the third side of a box hands it to the next player, and maybe a whole chain after it. Late joiners enter at the end of the round with bonus points equal to the lowest box count (the host can switch this off).',
            fr: 'Tracer le troisième côté d\'une case l\'offre au joueur suivant, et parfois toute une chaîne. Les retardataires entrent à la fin du tour avec un bonus égal au plus petit nombre de cases (l\'hôte peut le désactiver).',
        },
    },
    modesStep(null),
];
