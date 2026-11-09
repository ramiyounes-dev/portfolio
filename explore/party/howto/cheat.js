import { art, playing, playingBack, label, pill, rect } from '../client/howto-art.js';
import { modesStep, SECRET_NOTE } from './common.js';

const pile = (x, y, n) => Array.from({ length: n }, (_, k) => playingBack(x + k * 3, y - k * 3, { rot: (k % 3) * 4 - 4 })).join('');
const fan = (cards, y = 150) => cards.map(([r, s], k) => playing(70 + k * 36, y, r, s, { rot: (k - (cards.length - 1) / 2) * 5 })).join('');

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(fan([['5', '♠'], ['J', '♥']], 90), label(240, 124, '0', { size: 40, cls: 'k-ta', font: 'display' })),
        text: {
            en: 'Be the first to get rid of <b>all your cards</b>, by playing honestly or by bluffing.',
            fr: 'Sois le premier à te débarrasser de <b>toutes tes cartes</b>, honnêtement ou en bluffant.',
        },
    },
    {
        title: { en: 'The deal', fr: 'La donne' },
        art: () => art(fan([['A', '♠'], ['3', '♦'], ['7', '♣'], ['7', '♥'], ['Q', '♠'], ['K', '♦']], 80)),
        text: {
            en: 'All cards are dealt as evenly as possible: one 52-card deck up to 6 players, two decks for 7 to 12. Hands are private and sorted.',
            fr: 'Toutes les cartes sont distribuées le plus également possible : un jeu de 52 cartes jusqu\'à 6 joueurs, deux jeux de 7 à 12. Les mains sont privées et triées.',
        },
    },
    {
        title: { en: 'The rank goes up', fr: 'Le rang monte' },
        art: () => art(['A', '2', '3', '4', '5'].map((r, k) => playing(40 + k * 50, 92, r, k % 2 ? '♥' : '♠', { w: 40, hl: k === 2 })).join('')),
        text: {
            en: 'The rank to play goes up by one each turn: <b>A, 2, 3 … 10, J, Q, K</b>, then back to A. The holder of the ace of spades starts, with Aces.',
            fr: 'Le rang à jouer monte d\'un cran à chaque tour : <b>A, 2, 3 … 10, V, D, R</b>, puis retour à l\'As. Celui qui a l\'as de pique commence, avec les As.',
        },
    },
    {
        title: { en: 'Play face down', fr: 'Face cachée' },
        art: lang => art(pile(120, 70, 3), pill(160, 186, '2 × 3', { w: 90, cls: 'k-pill-acc', ink: 'k-tbg' })),
        text: {
            en: 'Place <b>1 to 4 cards face down</b> (up to 8 with two decks). They are announced like "2 × 3": how many, and the current rank. The cards may be honest or a bluff, and since you must play at least one, sometimes you have to bluff.',
            fr: 'Pose <b>1 à 4 cartes face cachée</b> (jusqu\'à 8 avec deux jeux). Elles sont annoncées comme « 2 × 3 » : combien, et le rang en cours. Elles peuvent être vraies ou fausses, et comme il faut en poser au moins une, il faut parfois bluffer.',
        },
    },
    {
        title: { en: 'Call it', fr: 'Accuser' },
        art: lang => art(pile(60, 70, 3), rect(170, 90, 120, 44, 'k-pill-acc', 22), label(230, 112, lang === 'fr' ? 'Menteur !' : 'Bullshit!', { size: 14, cls: 'k-tbg', font: 'display' }), label(230, 160, '5 s', { size: 12 })),
        text: {
            en: 'After each play, anyone else can press <b>Bullshit!</b> during a short window (5 s by default). The cards are shown: if the player lied, <b>they pick up the whole pile</b>; if not, <b>the caller does</b>.',
            fr: 'Après chaque pose, n\'importe qui d\'autre peut appuyer sur <b>Menteur !</b> pendant un court délai (5 s par défaut). Les cartes sont montrées : si le joueur a menti, <b>il ramasse toute la pile</b> ; sinon, <b>c\'est l\'accusateur</b>.',
        },
    },
    {
        title: { en: 'Winning', fr: 'Gagner' },
        art: () => art(['3', '2', '1'].map((p, k) => rect(52 + k * 80, 80, 56, 80, 'k-paper', 10) + label(80 + k * 80, 108, String(k + 1), { size: 24, cls: 'k-t', font: 'display' }) + label(80 + k * 80, 142, `+${p}`, { size: 13, cls: 'k-ta' })).join('')),
        text: {
            en: 'You win by reaching 0 cards once your last play survives the window, or is called and was honest. Caught lying? Pick up the pile and play on. Over several games: 1st scores 3, 2nd 2, 3rd 1.',
            fr: 'Tu gagnes en arrivant à 0 carte si ta dernière pose passe le délai, ou si on t\'accuse alors que tu disais vrai. Pris à mentir ? Ramasse la pile et continue. Sur plusieurs parties : 1er 3 points, 2e 2, 3e 1.',
        },
    },
    modesStep({
        en: SECRET_NOTE.en + ' During the window, the phone lies on the table with one Bullshit! button per player.',
        fr: SECRET_NOTE.fr + ' Pendant le délai, le téléphone est posé sur la table avec un bouton Menteur ! par joueur.',
    }),
];
