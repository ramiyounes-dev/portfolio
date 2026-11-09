import { art, rect, line, markX, markO } from '../client/howto-art.js';
import { modesStep, DUEL_NOTE } from './common.js';

// 9 × 9 squares in 3 × 3 small boards. cells: { 'c,r': 'x' | 'o' }, soft: small board [bc, br] to highlight.
const s = 20, x = 70, y = 30;
function big({ cells = {}, soft = null, all = false, claimed = {}, lineFrom = null } = {}) {
    const out = [rect(x - 6, y - 6, 9 * s + 12, 9 * s + 12, 'k-board', 6)];
    for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
        const on = all ? !claimed[`${bc},${br}`] : soft && soft[0] === bc && soft[1] === br;
        if (on) out.push(rect(x + bc * 3 * s + 2, y + br * 3 * s + 2, 3 * s - 4, 3 * s - 4, 'k-soft', 4));
    }
    for (let k = 1; k < 9; k++) {
        const cls = k % 3 ? 'k-line' : 'k-ink';
        if (k % 3) { out.push(line(x + k * s, y + 4, x + k * s, y + 9 * s - 4, cls), line(x + 4, y + k * s, x + 9 * s - 4, y + k * s, cls)); }
    }
    for (const k of [3, 6]) out.push(line(x + k * s, y, x + k * s, y + 9 * s, 'k-ink'), line(x, y + k * s, x + 9 * s, y + k * s, 'k-ink'));
    for (const [key, m] of Object.entries(cells)) {
        const [c, r] = key.split(',').map(Number), cx = x + c * s + s / 2, cy = y + r * s + s / 2;
        out.push(m === 'x' ? markX(cx, cy, 5.5) : markO(cx, cy, 6));
    }
    for (const [key, m] of Object.entries(claimed)) {
        const [bc, br] = key.split(',').map(Number), cx = x + bc * 3 * s + 1.5 * s, cy = y + br * 3 * s + 1.5 * s;
        out.push(rect(x + bc * 3 * s + 3, y + br * 3 * s + 3, 3 * s - 6, 3 * s - 6, 'k-paper', 4), m === 'x' ? markX(cx, cy, 18) : markO(cx, cy, 19));
    }
    if (lineFrom) out.push(line(...lineFrom, 'k-accs'));
    return out.join('');
}
const C = str => Object.fromEntries(str.trim().split(/\s+/).map(t => { const [c, r, m] = t.split(','); return [`${c},${r}`, m]; }));

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(big({ claimed: { '0,0': 'x', '1,1': 'x', '2,2': 'x', '2,0': 'o', '0,2': 'o' }, lineFrom: [x + 1.5 * s, y + 1.5 * s, x + 7.5 * s, y + 7.5 * s] })),
        text: {
            en: 'Win <b>three small boards in a row</b> on the big board: a row, a column or a diagonal.',
            fr: 'Gagne <b>trois petits plateaux alignés</b> sur le grand plateau : en ligne, en colonne ou en diagonale.',
        },
    },
    {
        title: { en: 'The board', fr: 'Le plateau' },
        art: () => art(big({ cells: C('4,4,x') })),
        text: {
            en: 'A big 3 × 3 grid where every cell holds a small tic-tac-toe board: 81 squares. X is drawn at random and plays first, anywhere.',
            fr: 'Une grande grille 3 × 3 dont chaque case contient un petit morpion : 81 cases. X est tiré au sort et joue en premier, où il veut.',
        },
    },
    {
        title: { en: 'Sending', fr: 'L\'envoi' },
        art: () => art(big({ cells: C('5,3,x 4,4,o'), soft: [2, 0] })),
        text: {
            en: 'The square you pick inside a small board <b>sends your opponent</b> to the matching small board. Play the top-right square, and they must play in the top-right board.',
            fr: 'La case que tu choisis dans un petit plateau <b>envoie ton adversaire</b> dans le petit plateau correspondant. Joue la case en haut à droite, et il doit jouer dans le plateau en haut à droite.',
        },
    },
    {
        title: { en: 'Claiming a board', fr: 'Gagner un plateau' },
        art: () => art(big({ cells: C('3,3,x 4,4,x 3,4,o 5,3,o 1,7,o'), claimed: { '0,0': 'o' } }), line(x + 3.5 * s, y + 3.5 * s, x + 5.5 * s, y + 5.5 * s, 'k-accs'), markX(x + 5.5 * s, y + 5.5 * s, 5.5)),
        text: {
            en: 'Three in a row inside a small board <b>claims it</b> for your mark. A full small board with no line belongs to nobody.',
            fr: 'Trois alignés dans un petit plateau te le <b>font gagner</b>. Un petit plateau plein sans ligne n\'appartient à personne.',
        },
    },
    {
        title: { en: 'Free choice', fr: 'Choix libre' },
        art: () => art(big({ all: true, claimed: { '1,1': 'x', '0,2': 'o' }, cells: C('4,7,o 3,6,x') })),
        text: {
            en: 'Sent to a board that is already won or full? Then you may play in <b>any open board</b>.',
            fr: 'Envoyé dans un plateau déjà gagné ou plein ? Tu peux alors jouer dans <b>n\'importe quel plateau ouvert</b>.',
        },
    },
    {
        title: { en: 'End of the game', fr: 'Fin de partie' },
        art: () => art(big({ claimed: { '0,0': 'x', '1,0': 'o', '2,0': 'x', '0,1': 'o', '1,1': 'x', '2,1': 'o', '0,2': 'o', '1,2': 'x', '2,2': 'o' } })),
        text: {
            en: 'If no move is left and nobody has a big line, it is a draw, or the host can decide it by most boards won. Each turn has a timer (30 s by default); when it runs out, a random move is played.',
            fr: 'S\'il ne reste aucun coup et que personne n\'a de grande ligne, c\'est une égalité, ou l\'hôte peut départager au nombre de plateaux gagnés. Chaque tour a un chrono (30 s par défaut) ; s\'il expire, un coup au hasard est joué.',
        },
    },
    modesStep(DUEL_NOTE),
];
