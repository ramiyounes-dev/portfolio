import { art, rect, label, tile, line, circle, pill } from '../client/howto-art.js';
import { modesStep } from './common.js';

const C = 'handshake', B = 'dagger';
const person = (cx, cy, cls = 'k-pc-a') => circle(cx, cy - 10, 9, cls) + `<path d="M${cx - 16} ${cy + 20}c2-14 8-20 16-20s14 6 16 20z" class="${cls}"/>`;

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: () => art(person(70, 110), person(250, 110, 'k-pc-b'), tile(C, 130, 120, 50, { cls: 'k-hl', icls: 'k-ic-acc' }), tile(B, 190, 120, 50)),
        text: {
            en: 'Each round, decide in secret whether to <b>cooperate</b> or <b>betray</b> your partner. Finish with the <b>highest total</b>.',
            fr: 'À chaque manche, décide en secret de <b>coopérer</b> ou de <b>trahir</b> ton partenaire. Termine avec le <b>meilleur total</b>.',
        },
    },
    {
        title: { en: 'Pairs', fr: 'Les paires' },
        art: () => art(
            person(60, 80), person(120, 80, 'k-pc-b'), line(78, 84, 102, 84, 'k-accs'),
            person(200, 80, 'k-pc-ink'), person(260, 80, 'k-pc-acc'), line(218, 84, 242, 84, 'k-accs'),
            person(160, 170, 'k-pc-dng'), pill(160, 216, '+2', { cls: 'k-pill-acc', ink: 'k-tbg' }),
        ),
        text: {
            en: 'Players are <b>paired up</b>, with new pairs every round so everyone meets everyone. With an odd number, one player sits out and gets <b>+2</b>.',
            fr: 'Les joueurs sont <b>mis en paires</b>, nouvelles à chaque manche, pour que chacun rencontre tout le monde. En nombre impair, un joueur se repose et gagne <b>+2</b>.',
        },
    },
    {
        title: { en: 'Choose', fr: 'Choisir' },
        art: lang => art(tile(C, 110, 110, 76, { cls: 'k-hl', icls: 'k-ic-acc' }), tile(B, 210, 110, 76),
            label(110, 172, lang === 'fr' ? 'Coopérer' : 'Cooperate', { size: 11, cls: 'k-t' }), label(210, 172, lang === 'fr' ? 'Trahir' : 'Betray', { size: 11, cls: 'k-t' })),
        text: {
            en: 'You and your partner each pick <b>Cooperate</b> or <b>Betray</b> before the timer ends (20 s by default). Both choices are shown together. No choice in time? One is drawn at random.',
            fr: 'Toi et ton partenaire choisissez <b>Coopérer</b> ou <b>Trahir</b> avant la fin du chrono (20 s par défaut). Les deux choix sont montrés ensemble. Pas de choix à temps ? Un est tiré au hasard.',
        },
    },
    {
        title: { en: 'Points', fr: 'Points' },
        art: () => {
            const x = 96, y = 46, s = 74, out = [];
            const cells = [['3 / 3', 'k-soft'], ['0 / 5', ''], ['5 / 0', ''], ['1 / 1', 'k-soft2']];
            cells.forEach(([t, f], k) => { const c = k % 2, r = Math.floor(k / 2); out.push(rect(x + c * s, y + r * s, s, s, f ? `k-paper ${f}` : 'k-paper', 8), label(x + c * s + s / 2, y + r * s + s / 2, t, { size: 15, cls: 'k-t', font: 'display' })); });
            out.push(tile(C, x + s / 2, y - 20, 26, { cls: 'k-paper' }), tile(B, x + s * 1.5, y - 20, 26, { cls: 'k-paper' }), tile(C, x - 22, y + s / 2, 26, { cls: 'k-paper' }), tile(B, x - 22, y + s * 1.5, 26, { cls: 'k-paper' }));
            return art(out);
        },
        text: {
            en: 'Both cooperate: <b>3 / 3</b>. You cooperate, they betray: <b>0 / 5</b>. You betray, they cooperate: <b>5 / 0</b>. Both betray: <b>1 / 1</b>.',
            fr: 'Les deux coopèrent : <b>3 / 3</b>. Tu coopères, il trahit : <b>0 / 5</b>. Tu trahis, il coopère : <b>5 / 0</b>. Les deux trahissent : <b>1 / 1</b>.',
        },
    },
    {
        title: { en: 'Talk first', fr: 'Parler d\'abord' },
        art: lang => art(person(60, 120), person(260, 120, 'k-pc-b'),
            pill(150, 84, lang === 'fr' ? 'Marché conclu ?' : 'Deal?', { w: 124 }), pill(170, 128, lang === 'fr' ? 'Fais-moi confiance' : 'Trust me', { w: 140, cls: 'k-pill-acc', ink: 'k-tbg' })),
        text: {
            en: 'If the host allows it, you can chat with your partner before choosing. Promises can be kept, or broken.',
            fr: 'Si l\'hôte le permet, tu peux discuter avec ton partenaire avant de choisir. Les promesses peuvent être tenues, ou trahies.',
        },
    },
    {
        title: { en: 'The end', fr: 'Fin' },
        art: () => art([0, 1, 2, 3].map(r => [0, 1, 2, 3, 4, 5].map(c => tile((r * 7 + c * 3) % 5 === 0 ? B : C, 58 + c * 41, 62 + r * 40, 32, { cls: 'k-paper', icls: (r * 7 + c * 3) % 5 === 0 ? 'k-ic-m' : 'k-ic-acc' })).join(''))),
        text: {
            en: 'Everyone sees who chose what against whom. After 10 rounds by default (the host can hide the count), the highest total wins, and the end screen shows each player\'s cooperation rate.',
            fr: 'Tout le monde voit qui a choisi quoi contre qui. Après 10 manches par défaut (l\'hôte peut cacher le compte), le meilleur total gagne, et l\'écran final montre le taux de coopération de chacun.',
        },
    },
    modesStep({
        en: 'Late joiners enter at the next pairing with the lowest score.',
        fr: 'Les retardataires entrent à la paire suivante avec le score le plus bas.',
    }),
];
