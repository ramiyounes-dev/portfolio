import { art, rect, circle, label } from '../client/howto-art.js';
import { modesStep, DUEL_NOTE } from './common.js';
import { shipBody } from '../client/ships.js';

// 10 × 10 sea. ships: [c, r, len, 'h'|'v', sunk?]; shots: [c, r, 'hit'|'miss'].
function sea({ x = 70, y = 30, s = 18, ships = [], shots = [], sel = null } = {}) {
    const out = [rect(x - 6, y - 6, 10 * s + 12, 10 * s + 12, 'k-board', 8)];
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) out.push(rect(x + c * s, y + r * s, s, s, 'k-sea', 3));
    let threes = 0;
    for (const [c, r, len, o, sunk] of ships) {
        const type = { 5: 'carrier', 4: 'battleship', 2: 'destroyer' }[len] || (threes++ ? 'submarine' : 'cruiser');
        const state = sunk ? ' is-sunk' : sel && sel[0] === c && sel[1] === r ? ' is-sel' : '';
        const body = o === 'h' ? shipBody(type, len) : `<g transform="translate(100 0) rotate(90)">${shipBody(type, len)}</g>`;
        out.push(`<g class="ship${state}" transform="translate(${x + c * s} ${y + r * s}) scale(${s / 100})">${body}</g>`);
    }
    for (const [c, r, kind] of shots) {
        const cx = x + c * s + s / 2, cy = y + r * s + s / 2;
        out.push(kind === 'miss' ? circle(cx, cy, s * 0.2, 'k-splash') : circle(cx, cy, s * 0.3, 'k-burst') + circle(cx, cy, s * 0.12, 'k-burst-in'));
    }
    return out.join('');
}
const FLEET = [[1, 1, 5, 'h'], [7, 2, 4, 'v'], [0, 4, 3, 'v'], [3, 6, 3, 'h'], [5, 9, 2, 'h']];

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(sea({ ships: [[1, 1, 5, 'h', true], [7, 2, 4, 'v', true], [0, 4, 3, 'v', true], [3, 6, 3, 'h', true]], shots: [[5, 9, 'hit'], [4, 4, 'miss'], [8, 8, 'miss'], [2, 8, 'miss'], [6, 5, 'miss']] })),
        text: {
            en: 'Sink the <b>whole enemy fleet</b> before yours goes down.',
            fr: 'Coule <b>toute la flotte adverse</b> avant que la tienne ne sombre.',
        },
    },
    {
        title: { en: 'Your fleet', fr: 'Ta flotte' },
        art: lang => art(sea({ ships: FLEET, x: 30, s: 18 }),
            ...[[5, 'Carrier', 'Porte-avions'], [4, 'Battleship', 'Cuirassé'], [3, 'Cruiser', 'Croiseur'], [3, 'Submarine', 'Sous-marin'], [2, 'Destroyer', 'Torpilleur']].map(([n, en, fr], k) =>
                label(232, 46 + k * 34, `${lang === 'fr' ? fr : en} ${n}`, { size: 10, anchor: 'start' }))),
        text: {
            en: 'Each player has a private 10 × 10 grid and places <b>five ships</b>: Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2. Ships lie flat or upright and cannot overlap.',
            fr: 'Chaque joueur a une grille privée 10 × 10 et place <b>cinq navires</b> : porte-avions 5, cuirassé 4, croiseur 3, sous-marin 3, torpilleur 2. Ils sont couchés ou debout et ne se chevauchent pas.',
        },
    },
    {
        title: { en: 'Placing ships', fr: 'Placer les navires' },
        art: () => art(sea({ ships: FLEET, sel: [3, 6] }), rect(70 + 3 * 18 + 2, 30 + 7 * 18 + 2, 14, 50, 'k-ghost', 6)),
        text: {
            en: 'Pick a ship and tap where it starts; <b>Rotate</b> turns it. Or use <b>Random</b>. Press <b>Ready</b>; the battle starts when both players are ready. After 2 minutes, a random fleet is placed for anyone not ready. Your positions are never sent to your opponent.',
            fr: 'Choisis un navire et touche sa case de départ ; <b>Pivoter</b> le tourne. Ou utilise <b>Au hasard</b>. Appuie sur <b>Prêt</b> ; la bataille commence quand les deux joueurs sont prêts. Après 2 minutes, une flotte au hasard est placée pour qui n\'est pas prêt. Tes positions ne sont jamais envoyées à l\'adversaire.',
        },
    },
    {
        title: { en: 'Firing', fr: 'Tirer' },
        art: () => art(sea({ shots: [[3, 3, 'hit'], [4, 3, 'hit'], [2, 6, 'miss'], [7, 1, 'miss'], [6, 7, 'miss'], [3, 2, 'miss']] }), circle(70 + 5 * 18 + 9, 30 + 3 * 18 + 9, 8, 'k-ring')),
        text: {
            en: 'Fire at one square of the enemy grid. The result is announced: <b>miss</b>, <b>hit</b>, or <b>hit and sunk</b>. A hit lets you <b>fire again</b>; a miss passes the turn. The first shooter is drawn at random.',
            fr: 'Tire sur une case de la grille adverse. Le résultat est annoncé : <b>à l\'eau</b>, <b>touché</b> ou <b>touché-coulé</b>. Une touche te permet de <b>rejouer</b> ; un tir à l\'eau passe la main. Le premier tireur est tiré au sort.',
        },
    },
    {
        title: { en: 'Two grids', fr: 'Deux grilles' },
        art: () => art(
            sea({ x: 18, y: 66, s: 13, ships: FLEET, shots: [[1, 1, 'hit'], [4, 4, 'miss'], [8, 7, 'miss']] }),
            sea({ x: 172, y: 66, s: 13, shots: [[3, 3, 'hit'], [4, 3, 'hit'], [2, 6, 'miss'], [7, 1, 'miss']] }),
        ),
        text: {
            en: 'You see your own fleet with the shots it has taken, and a tracking grid of your shots.',
            fr: 'Tu vois ta flotte avec les tirs reçus, et une grille de suivi de tes tirs.',
        },
    },
    modesStep({
        en: DUEL_NOTE.en + ' Spectators only see shot results; both fleets are shown at the end.',
        fr: DUEL_NOTE.fr + ' Les spectateurs ne voient que les résultats des tirs ; les deux flottes sont montrées à la fin.',
    }),
];
