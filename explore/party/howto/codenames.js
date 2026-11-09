import { art, rect, label, ic, pill, circle } from '../client/howto-art.js';
import { modesStep } from './common.js';

// 25 cards. key: string of 25 chars R B N A; mode: 'key' (Spymaster view, coloured bars) or revealed set.
const KEY = 'RBNRA BRNBR NRBRN BNRBR RNBNR'.replace(/\s/g, '');
const CLS = { R: 'k-cnR', B: 'k-cnB', N: 'k-cnN', A: 'k-cnA' };
function grid({ show = 'none', revealed = [], hl = [] } = {}) {
    const w = 52, h = 34, g = 6, x0 = (320 - (5 * w + 4 * g)) / 2, y0 = (240 - (5 * h + 4 * g)) / 2, out = [];
    for (let k = 0; k < 25; k++) {
        const x = x0 + (k % 5) * (w + g), y = y0 + Math.floor(k / 5) * (h + g), c = KEY[k];
        if (revealed.includes(k)) out.push(rect(x, y, w, h, CLS[c], 6), c === 'A' ? ic('skull', x + w / 2, y + h / 2, 22, 'k-ic-white') : '');
        else {
            out.push(rect(x, y, w, h, hl.includes(k) ? 'k-card-hl' : 'k-card', 6), rect(x + 10, y + h / 2 - 2, w - 20, 4, 'k-soft2', 2));
            if (show === 'key') out.push(rect(x + 3, y + h - 7, w - 6, 4, CLS[c], 2), c === 'A' ? ic('skull', x + w / 2, y + 11, 13, 'k-ic') : '');
        }
    }
    return out.join('');
}

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(grid({ revealed: [0, 3, 9, 11, 13, 1, 5, 2] })),
        text: {
            en: 'Two teams, Red and Blue. Find <b>all your team\'s agents</b> (words) before the other team, without touching the <b>Assassin</b>.',
            fr: 'Deux équipes, Rouge et Bleue. Trouve <b>tous les agents de ton équipe</b> (des mots) avant l\'autre équipe, sans toucher l\'<b>Assassin</b>.',
        },
    },
    {
        title: { en: 'Teams', fr: 'Les équipes' },
        art: lang => art(rect(30, 50, 120, 140, 'k-paper', 14), rect(170, 50, 120, 140, 'k-paper', 14),
            rect(30, 50, 120, 8, 'k-cnR', 4), rect(170, 50, 120, 8, 'k-cnB', 4),
            pill(90, 90, lang === 'fr' ? 'Espion' : 'Spymaster', { w: 100, cls: 'k-pill-dark', ink: 'k-tbg', size: 10 }), pill(230, 90, lang === 'fr' ? 'Espion' : 'Spymaster', { w: 100, cls: 'k-pill-dark', ink: 'k-tbg', size: 10 }),
            [0, 1, 2].map(k => circle(64 + k * 26, 140, 9, 'k-cnR') + circle(204 + k * 26, 140, 9, 'k-cnB')).join('')),
        text: {
            en: 'Players pick Red or Blue (teams are balanced, with a shuffle button), and each team has one <b>Spymaster</b>. The others are Operatives. At least 4 players.',
            fr: 'Les joueurs choisissent Rouge ou Bleu (les équipes sont équilibrées, avec un bouton pour mélanger), et chaque équipe a un <b>Espion</b>. Les autres sont Agents. 4 joueurs minimum.',
        },
    },
    {
        title: { en: 'The key', fr: 'La clé' },
        art: () => art(grid({ show: 'key' })),
        text: {
            en: '25 words in the room\'s language. The starting team has <b>9</b> agents, the other <b>8</b>, plus <b>7 bystanders</b> and <b>1 Assassin</b>. Only the Spymasters see the key.',
            fr: '25 mots dans la langue de la partie. L\'équipe qui commence a <b>9</b> agents, l\'autre <b>8</b>, plus <b>7 passants</b> et <b>1 Assassin</b>. Seuls les Espions voient la clé.',
        },
    },
    {
        title: { en: 'The clue', fr: 'L\'indice' },
        art: lang => art(rect(60, 80, 200, 70, 'k-paper', 14), label(160, 106, lang === 'fr' ? 'OCÉAN' : 'OCEAN', { size: 22, cls: 'k-t', font: 'display' }), label(160, 134, '2', { size: 16, cls: 'k-ta', font: 'display' })),
        text: {
            en: 'The Spymaster gives <b>one word and a number</b>, like "Ocean, 2". The word cannot be on the board or contain one of its words; the other Spymaster can flag an illegal clue.',
            fr: 'L\'Espion donne <b>un mot et un nombre</b>, comme « Océan, 2 ». Le mot ne peut pas être sur le plateau ni en contenir un ; l\'autre Espion peut signaler un indice interdit.',
        },
    },
    {
        title: { en: 'Guessing', fr: 'Deviner' },
        art: () => art(grid({ revealed: [0], hl: [3, 8] })),
        text: {
            en: 'Operatives discuss and tap cards to propose them; a card flips when most of the team agrees. Your agent: keep going. A bystander or the other team\'s agent: your turn ends.',
            fr: 'Les agents discutent et touchent des cartes pour les proposer ; une carte se retourne quand la majorité de l\'équipe est d\'accord. Ton agent : continue. Un passant ou un agent adverse : ton tour s\'arrête.',
        },
    },
    {
        title: { en: 'The Assassin', fr: 'L\'Assassin' },
        art: () => art(grid({ revealed: [4, 0, 3] })),
        text: {
            en: 'You get up to <b>number + 1</b> guesses and may stop after one. Touch the <b>Assassin</b> and your team loses at once. Otherwise, the first team with all its agents found wins.',
            fr: 'Tu as jusqu\'à <b>nombre + 1</b> essais et peux t\'arrêter après un. Touche l\'<b>Assassin</b> et ton équipe perd aussitôt. Sinon, la première équipe qui trouve tous ses agents gagne.',
        },
    },
    modesStep({
        en: 'Against the AI, you play on Red; its clues come from a small table of word groups (like "fruit 3"), and it never peeks at the key. On one device, the key shows only after the phone goes to the Spymaster.',
        fr: 'Contre l\'IA, tu joues chez les Rouges ; ses indices viennent d\'une petite table de groupes de mots (comme « fruit 3 »), et elle ne regarde jamais la clé. Sur un seul appareil, la clé n\'apparaît qu\'une fois le téléphone passé à l\'Espion.',
    }),
];
