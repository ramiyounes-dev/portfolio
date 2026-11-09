import { art, rect, label } from '../client/howto-art.js';
import { pictureSvg } from '../client/pictures.js';
import { modesStep } from './common.js';

const pic = (key, cx, cy, size) => pictureSvg(key).replace('<svg class="pic"', `<svg x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" class="k-ic"`);
// Cards: list of keys, '' = face down; got: indices claimed (accent frame); up: indices face up.
function cards(cols, rows, faces, { got = [], up = [], w = 44, h = 54, gap = 8 } = {}) {
    const x0 = (320 - (cols * w + (cols - 1) * gap)) / 2, y0 = (240 - (rows * h + (rows - 1) * gap)) / 2, out = [];
    for (let k = 0; k < cols * rows; k++) {
        const x = x0 + (k % cols) * (w + gap), y = y0 + Math.floor(k / cols) * (h + gap);
        const f = faces[k];
        if (f && (up.includes(k) || got.includes(k))) out.push(rect(x, y, w, h, got.includes(k) ? 'k-card-hl' : 'k-card', 7), pic(f, x + w / 2, y + h / 2, Math.min(w, h) * 0.78));
        else if (f !== null) out.push(rect(x, y, w, h, 'k-cardback', 7), rect(x + 5, y + 5, w - 10, h - 10, 'k-cardback-in', 4));
    }
    return out.join('');
}
const F = ['cat', 'sun', 'key', 'boat', 'tree', 'cat', 'boat', 'apple', 'sun', 'apple', 'key', 'tree'];

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(cards(6, 2, F, { got: [0, 5, 3, 6] })),
        text: {
            en: 'Find matching <b>pairs</b> of pictures among face-down cards. When every pair is found, the player with the <b>most pairs</b> wins. Ties are shared.',
            fr: 'Retrouve les <b>paires</b> d\'images parmi les cartes face cachée. Quand toutes les paires sont trouvées, le joueur qui en a le <b>plus</b> gagne. Les égalités sont partagées.',
        },
    },
    {
        title: { en: 'The cards', fr: 'Les cartes' },
        art: () => art(cards(4, 4, Array(16).fill('x'), { w: 40, h: 46, gap: 6 })),
        text: {
            en: 'A grid of face-down cards made of pairs, with pictures only, so it works in any language: 16 cards for 2 players, up to 36 for 6 to 8. The host picks the size and theme.',
            fr: 'Une grille de cartes face cachée, faite de paires, avec seulement des images, donc dans toutes les langues : 16 cartes à 2 joueurs, jusqu\'à 36 de 6 à 8. L\'hôte choisit la taille et le thème.',
        },
    },
    {
        title: { en: 'Flip two', fr: 'Deux cartes' },
        art: () => art(cards(6, 2, F, { up: [1, 7] })),
        text: {
            en: 'On your turn, flip <b>2 cards</b>. Everyone sees them.',
            fr: 'À ton tour, retourne <b>2 cartes</b>. Tout le monde les voit.',
        },
    },
    {
        title: { en: 'A pair', fr: 'Une paire' },
        art: () => art(cards(6, 2, F, { got: [1, 8] }), label(160, 200, '+1', { size: 15, cls: 'k-ta' })),
        text: {
            en: 'A match? You keep the pair, score <b>+1</b> and <b>play again</b>.',
            fr: 'Ça correspond ? Tu gardes la paire, marques <b>+1</b> et <b>rejoues</b>.',
        },
    },
    {
        title: { en: 'No match', fr: 'Pas de paire' },
        art: () => art(cards(6, 2, F, { up: [2, 4] })),
        text: {
            en: 'No match: both cards stay visible for about 1.5 seconds, then turn back over and the turn passes. Remember where they were. If your turn timer runs out, the turn passes too.',
            fr: 'Pas de paire : les deux cartes restent visibles environ 1,5 seconde, puis se retournent et le tour passe. Retiens où elles étaient. Si ton chrono expire, le tour passe aussi.',
        },
    },
    modesStep({
        en: 'Late joiners enter at the end of the turn order with the lowest pair count.',
        fr: 'Les retardataires entrent en fin d\'ordre de jeu avec le plus petit nombre de paires.',
    }),
];
