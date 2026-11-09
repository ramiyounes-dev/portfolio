import { art, rect, label, tile, link, ic } from '../client/howto-art.js';
import { modesStep } from './common.js';

const tri = { rock: [160, 52], scissors: [250, 184], paper: [70, 184] };

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(tile('rock', 70, 120, 64), tile('paper', 160, 120, 64, { cls: 'k-hl', icls: 'k-ic-acc' }), tile('scissors', 250, 120, 64), label(160, 178, '+1', { size: 15, cls: 'k-ta' })),
        text: {
            en: 'Pick the shape that <b>beats</b> the others, round after round, and finish with the best score.',
            fr: 'Choisis la forme qui <b>bat</b> celles des autres, manche après manche, et termine avec le meilleur score.',
        },
    },
    {
        title: { en: 'Secret picks', fr: 'Choix secrets' },
        art: () => art([60, 125, 190, 255].map((x, k) => rect(x - 26, 86, 52, 68, 'k-paper', 10) + (k < 3 ? ic('check', x, 120, 26, 'k-ic-acc') : label(x, 120, '...', { size: 14 })))),
        text: {
            en: 'Everyone picks Rock, Paper or Scissors <b>in secret</b> before the timer ends (10 s by default). You only see who has chosen. Too slow? A random pick is made for you.',
            fr: 'Chacun choisit Pierre, Feuille ou Ciseaux <b>en secret</b> avant la fin du chrono (10 s par défaut). Tu vois seulement qui a choisi. Trop lent ? Un choix au hasard est fait pour toi.',
        },
    },
    {
        title: { en: 'What beats what', fr: 'Qui bat qui' },
        art: () => art(tile('rock', ...tri.rock), tile('scissors', ...tri.scissors), tile('paper', ...tri.paper),
            link(tri.rock, tri.scissors, 38, { bend: -12 }), link(tri.scissors, tri.paper, 38, { bend: -12 }), link(tri.paper, tri.rock, 38, { bend: -12 })),
        text: {
            en: 'All picks are revealed at once. <b>Rock</b> beats Scissors, <b>Scissors</b> beat Paper, <b>Paper</b> beats Rock.',
            fr: 'Tous les choix sont révélés en même temps. La <b>Pierre</b> bat les Ciseaux, les <b>Ciseaux</b> battent la Feuille, la <b>Feuille</b> bat la Pierre.',
        },
    },
    {
        title: { en: 'Two players', fr: 'À deux' },
        art: () => art(tile('paper', 100, 110, 64, { cls: 'k-hl', icls: 'k-ic-acc' }), tile('rock', 220, 110, 64), label(160, 110, '>', { size: 22, cls: 'k-ta', font: 'display' }), label(100, 170, '+1', { size: 15, cls: 'k-ta' })),
        text: {
            en: 'In a duel, the winner of each round scores <b>+1</b>. First to <b>5</b> wins (the host can change the target).',
            fr: 'En duel, le gagnant de chaque manche marque <b>+1</b>. Le premier à <b>5</b> gagne (l\'hôte peut changer l\'objectif).',
        },
    },
    {
        title: { en: 'Three or more', fr: 'À trois ou plus' },
        art: () => art(
            tile('rock', 60, 90, 52, { cls: 'k-hl', icls: 'k-ic-acc' }), tile('scissors', 130, 90, 52), tile('scissors', 200, 90, 52), tile('rock', 270, 90, 52, { cls: 'k-hl', icls: 'k-ic-acc' }),
            label(60, 140, '+2', { size: 14, cls: 'k-ta' }), label(270, 140, '+2', { size: 14, cls: 'k-ta' }),
            label(130, 140, '0', { size: 14 }), label(200, 140, '0', { size: 14 }),
        ),
        text: {
            en: 'With 3 or more, you score <b>+1 for every player you beat</b>. If all three shapes appear, or everyone picks the same, nobody scores. Highest score after 10 rounds wins.',
            fr: 'À 3 ou plus, tu marques <b>+1 par joueur battu</b>. Si les trois formes apparaissent, ou si tout le monde choisit la même, personne ne marque. Le meilleur score après 10 manches gagne.',
        },
    },
    {
        title: { en: 'Lizard Spock', fr: 'Lézard Spock' },
        art: () => {
            const names = ['scissors', 'paper', 'rock', 'lizard', 'spock'];
            const pos = names.map((_, k) => [160 + 88 * Math.sin((k * 2 * Math.PI) / 5), 122 - 88 * Math.cos((k * 2 * Math.PI) / 5)]);
            const out = names.map((nm, k) => tile(nm, ...pos[k], 44));
            for (let k = 0; k < 5; k++) out.push(link(pos[k], pos[(k + 1) % 5], 28, { head: 6 }), link(pos[k], pos[(k + 3) % 5], 28, { head: 6, cls: 'k-arr-m' }));
            return art(out);
        },
        text: {
            en: 'The host can add Lizard and Spock. Scissors cut Paper, Paper covers Rock, Rock crushes Lizard, Lizard poisons Spock, Spock smashes Scissors, Scissors cut Lizard, Lizard eats Paper, Paper disproves Spock, Spock vaporises Rock, Rock crushes Scissors.',
            fr: 'L\'hôte peut ajouter Lézard et Spock. Les Ciseaux coupent la Feuille, la Feuille couvre la Pierre, la Pierre écrase le Lézard, le Lézard empoisonne Spock, Spock casse les Ciseaux, les Ciseaux coupent le Lézard, le Lézard mange la Feuille, la Feuille réfute Spock, Spock vaporise la Pierre, la Pierre écrase les Ciseaux.',
        },
    },
    modesStep({
        en: 'Joining late? You start at the next round with the lowest current score.',
        fr: 'Arrivé en cours ? Tu commences à la manche suivante avec le score le plus bas.',
    }),
];
