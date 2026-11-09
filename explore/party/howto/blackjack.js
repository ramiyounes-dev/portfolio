import { art, playing, card, rect, label, pill, circle } from '../client/howto-art.js';
import { modesStep } from './common.js';

const chips = (cx, cy, n = 3) => Array.from({ length: n }, (_, k) => circle(cx, cy - k * 5, 12, 'k-acc') + circle(cx, cy - k * 5, 8, 'k-chipin')).join('');

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(playing(90, 70, 'K', '♠'), playing(146, 70, '9', '♥'), label(230, 103, '19', { size: 30, cls: 'k-t', font: 'display' }), chips(160, 190, 4)),
        text: {
            en: 'Beat the automated <b>dealer</b> by getting closer to 21 without going over, and end with the <b>most chips</b> at the table.',
            fr: 'Bats le <b>croupier</b> automatique en t\'approchant de 21 sans le dépasser, et termine avec le <b>plus de jetons</b> de la table.',
        },
    },
    {
        title: { en: 'The table', fr: 'La table' },
        art: () => art(rect(40, 40, 240, 160, 'k-paper', 80), card(124, 64, { back: true }), card(150, 64, { back: true }), chips(90, 160), chips(160, 170), chips(230, 160)),
        text: {
            en: 'A 6-deck shoe, reshuffled when 75% has been used. Each player starts with <b>1,000 chips</b> by default. Card values: 2 to 10 as shown, J, Q and K count 10, an Ace counts 1 or 11.',
            fr: 'Un sabot de 6 jeux, remélangé quand 75 % a servi. Chaque joueur commence avec <b>1 000 jetons</b> par défaut. Valeurs : de 2 à 10 comme indiqué, V, D et R valent 10, l\'As vaut 1 ou 11.',
        },
    },
    {
        title: { en: 'Bet and deal', fr: 'Mise et donne' },
        art: () => art(card(110, 30, { back: true, w: 40, h: 56 }), playing(156, 30, '7', '♣', { w: 40, h: 56 }), playing(110, 130, 'A', '♦', { w: 40, h: 56 }), playing(156, 130, '5', '♠', { w: 40, h: 56 }), chips(250, 170)),
        text: {
            en: '<b>Bet</b> at least 10 before the timer ends, or the minimum is bet for you. Everyone gets 2 cards face up; the dealer gets 1 up and 1 down.',
            fr: '<b>Mise</b> au moins 10 avant la fin du chrono, sinon la mise minimale est faite pour toi. Chacun reçoit 2 cartes visibles ; le croupier en reçoit 1 visible et 1 cachée.',
        },
    },
    {
        title: { en: 'Your choices', fr: 'Tes choix' },
        art: lang => {
            const L = lang === 'fr' ? ['Carte', 'Rester', 'Doubler', 'Séparer'] : ['Hit', 'Stand', 'Double', 'Split'];
            return art(playing(110, 40, '8', '♥'), playing(164, 40, '8', '♣'), pill(80, 160, L[0], { w: 70, cls: 'k-pill-acc', ink: 'k-tbg' }), pill(160, 160, L[1], { w: 76 }), pill(240, 160, L[2], { w: 76 }), pill(160, 200, L[3], { w: 76 }));
        },
        text: {
            en: 'In turn: <b>Hit</b> takes a card, <b>Stand</b> stops. <b>Double</b> (first two cards only) doubles the bet for exactly one card. <b>Split</b> turns two cards of the same rank into two hands. Over 21 is a <b>bust</b>.',
            fr: 'Chacun son tour : <b>Carte</b> en prend une, <b>Rester</b> s\'arrête. <b>Doubler</b> (deux premières cartes) double la mise pour une seule carte. <b>Séparer</b> fait deux mains de deux cartes de même rang. Au-delà de 21, c\'est <b>perdu</b>.',
        },
    },
    {
        title: { en: 'The dealer', fr: 'Le croupier' },
        art: () => art(playing(90, 80, '10', '♠'), playing(144, 80, '6', '♦'), playing(198, 80, '3', '♣', { hl: true }), label(160, 186, '19', { size: 22, cls: 'k-t', font: 'display' })),
        text: {
            en: 'The dealer shows the hidden card and draws until 17 or more. By default the dealer stands on soft 17 (an Ace counted as 11).',
            fr: 'Le croupier retourne sa carte cachée et tire jusqu\'à 17 ou plus. Par défaut, il reste sur un 17 souple (un As compté 11).',
        },
    },
    {
        title: { en: 'Payouts', fr: 'Gains' },
        art: () => art(playing(70, 70, 'A', '♠'), playing(118, 70, 'K', '♥'), label(230, 103, '3:2', { size: 30, cls: 'k-ta', font: 'display' })),
        text: {
            en: 'Beat the dealer: <b>1:1</b>. Blackjack (an Ace and a 10-value card as your first two): <b>3:2</b>. A tie is a <b>push</b>: your bet comes back. If the dealer busts, every hand still in play wins.',
            fr: 'Battre le croupier : <b>1:1</b>. Blackjack (un As et une carte de valeur 10 comme deux premières cartes) : <b>3:2</b>. Une égalité rend ta mise. Si le croupier dépasse 21, chaque main encore en jeu gagne.',
        },
    },
    {
        title: { en: 'End', fr: 'Fin' },
        art: () => art(chips(100, 150, 2), chips(160, 150, 6), chips(220, 150, 3)),
        text: {
            en: 'After 10 rounds, or when one player has all the chips, the most chips wins. A player with no chips watches, unless the host allows rebuys.',
            fr: 'Après 10 manches, ou quand un joueur a tous les jetons, celui qui en a le plus gagne. Un joueur sans jetons regarde, sauf si l\'hôte permet de se recaver.',
        },
    },
    modesStep({
        en: 'Late joiners sit down at the next bet with the smaller of 1,000 and the lowest stack.',
        fr: 'Les retardataires s\'assoient à la mise suivante avec le plus petit montant entre 1 000 et la pile la plus basse.',
    }),
];
