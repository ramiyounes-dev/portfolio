import { art, rect, label, ic, group } from '../client/howto-art.js';
import { modesStep } from './common.js';

// UNO card in the game's colours. c: R Y G B K (black for wilds); face: text or an icon name prefixed with '@'.
function uno(x, y, c, face, { w = 46, h = 68, rot = 0, hl = false } = {}) {
    const t = rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : '';
    const inner = face.startsWith('@')
        ? ic(face.slice(1), x + w / 2, y + h / 2, w * 0.5, 'k-ic-white')
        : label(x + w / 2, y + h / 2 + 1, face, { size: face.length > 2 ? 12 : 20, cls: 'k-tw', font: 'display' });
    const body = rect(x, y, w, h, c === 'K' ? 'k-uK' : `k-u${c}`, 7) + (c === 'K' ? '' : rect(x + 2, y + 2, w - 4, h - 4, 'k-wline', 6))
        + `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w * 0.36}" ry="${h * 0.3}" transform="rotate(30 ${x + w / 2} ${y + h / 2})" class="k-wline"/>` + inner
        + (hl ? rect(x - 4, y - 4, w + 8, h + 8, 'k-ring', 10) : '');
    return t ? group(t, body) : body;
}
const hand = (cards, y = 140) => {
    const w = 46, step = 34, x0 = 160 - ((cards.length - 1) * step + w) / 2;
    return cards.map(([c, f, hl], k) => uno(x0 + k * step, y + (hl ? -10 : 0), c, f, { hl })).join('');
};

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(uno(137, 30, 'R', '7'), hand([['B', '2'], ['R', '4', true]])),
        text: {
            en: 'Be the first to <b>empty your hand</b>. You score the cards left in everyone else\'s hands, and the first to <b>500</b> points wins (or play a single hand).',
            fr: 'Sois le premier à <b>vider ta main</b>. Tu marques les cartes restées dans les mains des autres, et le premier à <b>500</b> points gagne (ou joue une seule main).',
        },
    },
    {
        title: { en: 'The deck', fr: 'Le paquet' },
        art: () => art(uno(30, 60, 'R', '5', { rot: -8 }), uno(84, 60, 'Y', '9', { rot: -3 }), uno(138, 60, 'G', '@skip', { rot: 2 }), uno(192, 60, 'B', '@reverse', { rot: 6 }), uno(246, 60, 'K', '@wild', { rot: 10 })),
        text: {
            en: '108 cards in red, yellow, green and blue: numbers, Skip, Reverse and Draw Two, plus 4 Wild and 4 Wild Draw Four. A second deck is added for 9 to 12 players. Everyone gets <b>7 cards</b>.',
            fr: '108 cartes rouges, jaunes, vertes et bleues : chiffres, Passe, Inversion et +2, plus 4 Jokers et 4 Jokers +4. Un second paquet s\'ajoute de 9 à 12 joueurs. Chacun reçoit <b>7 cartes</b>.',
        },
    },
    {
        title: { en: 'Your turn', fr: 'Ton tour' },
        art: () => art(uno(137, 22, 'G', '6'), hand([['G', '2', true], ['R', '9'], ['B', '6', true], ['Y', '1'], ['K', '@wild', true]])),
        text: {
            en: 'Play <b>one card</b> that matches the top card by <b>colour, number or symbol</b>, or a Wild. Cannot or will not play? <b>Draw 1</b>; if it fits, you may play it straight away.',
            fr: 'Joue <b>une carte</b> de même <b>couleur, chiffre ou symbole</b> que celle du dessus, ou un Joker. Tu ne peux pas ou ne veux pas jouer ? <b>Pioche 1</b> ; si elle va, tu peux la jouer tout de suite.',
        },
    },
    {
        title: { en: 'Action cards', fr: 'Cartes action' },
        art: () => art(uno(46, 80, 'R', '@skip'), uno(110, 80, 'Y', '@reverse'), uno(174, 80, 'G', '+2'), uno(238, 80, 'K', '@wild')),
        text: {
            en: '<b>Skip</b>: the next player misses a turn. <b>Reverse</b>: changes direction (a Skip with 2 players). <b>Draw Two</b>: the next player draws 2 and misses a turn. <b>Wild</b>: you choose the next colour.',
            fr: '<b>Passe</b> : le joueur suivant passe son tour. <b>Inversion</b> : change de sens (un Passe à 2 joueurs). <b>+2</b> : le suivant pioche 2 et passe son tour. <b>Joker</b> : tu choisis la couleur suivante.',
        },
    },
    {
        title: { en: 'Wild Draw Four', fr: 'Joker +4' },
        art: () => art(uno(137, 70, 'K', '+4', { hl: true })),
        text: {
            en: 'Choose the colour; the next player draws 4 and misses a turn. It is only allowed if you hold no card of the current colour, so they may <b>challenge</b>. Guilty: you draw 4 instead. Innocent: they draw 6.',
            fr: 'Choisis la couleur ; le suivant pioche 4 et passe son tour. Il n\'est permis que si tu n\'as aucune carte de la couleur en cours, alors il peut <b>contester</b>. Coupable : tu pioches 4 à sa place. Innocent : il pioche 6.',
        },
    },
    {
        title: { en: 'Say UNO', fr: 'Dire UNO' },
        art: () => art(hand([['B', '3']], 60), rect(110, 160, 100, 40, 'k-pill-acc', 20), label(160, 180, 'UNO', { size: 16, cls: 'k-tbg', font: 'display' })),
        text: {
            en: 'When you play your second-to-last card, press <b>UNO</b>. If someone presses <b>Catch</b> before the next player moves, you draw 2. Draw cards do not stack unless the host turns it on.',
            fr: 'Quand tu joues ton avant-dernière carte, appuie sur <b>UNO</b>. Si quelqu\'un appuie sur <b>Contre-UNO</b> avant que le suivant joue, tu pioches 2. Les cartes +2 et +4 ne se cumulent pas, sauf si l\'hôte l\'active.',
        },
    },
    {
        title: { en: 'Scoring', fr: 'Points' },
        art: () => art(uno(50, 70, 'Y', '8'), uno(110, 70, 'B', '@skip'), uno(170, 70, 'K', '@wild'), label(260, 104, '78', { size: 28, cls: 'k-ta', font: 'display' })),
        text: {
            en: 'Numbers count face value, Skip, Reverse and Draw Two count 20, Wilds 50. If your turn timer runs out, you draw and the turn passes.',
            fr: 'Les chiffres valent leur valeur, Passe, Inversion et +2 valent 20, les Jokers 50. Si ton chrono expire, tu pioches et le tour passe.',
        },
    },
    modesStep({
        en: 'On one device, each hand is shown only after a "Pass the phone" screen. Late joiners are dealt in at the next hand with the lowest score.',
        fr: 'Sur un seul appareil, chaque main ne s\'affiche qu\'après un écran « Passe le téléphone ». Les retardataires reçoivent des cartes à la main suivante avec le score le plus bas.',
    }),
];
