import { art, rect, label, pill, ic, circle } from '../client/howto-art.js';
import { pictureSvg } from '../client/pictures.js';
import { modesStep } from './common.js';

const pic = (key, x, y, size) => pictureSvg(key).replace('<svg class="pic"', `<svg x="${x}" y="${y}" width="${size}" height="${size}" class="k-ic"`);
const canvas = (key, x = 40, y = 24, w = 150, h = 150) => rect(x, y, w, h, 'k-card', 10) + (key ? pic(key, x + 10, y + 10, Math.min(w, h) - 20) : '');

export default [
    {
        title: { en: 'Goal', fr: 'But' },
        art: lang => art(canvas('house', 85, 30), pill(160, 208, lang === 'fr' ? 'maison' : 'house', { w: 100, cls: 'k-pill-acc', ink: 'k-tbg' })),
        text: {
            en: 'Draw a word so others can guess it, and guess the others\' drawings <b>fast</b>. The highest score at the end wins.',
            fr: 'Dessine un mot pour le faire deviner, et devine <b>vite</b> les dessins des autres. Le meilleur score à la fin gagne.',
        },
    },
    {
        title: { en: 'Pick a word', fr: 'Choisir un mot' },
        art: lang => art((lang === 'fr' ? ['bateau', 'lune', 'guitare'] : ['boat', 'moon', 'guitar']).map((w, k) => pill(160, 70 + k * 48, w, { w: 150, cls: k === 1 ? 'k-pill-acc' : 'k-pill', ink: k === 1 ? 'k-tbg' : 'k-t', h: 34, size: 13 })).join('')),
        text: {
            en: 'Players draw in turn, in join order. The drawer picks <b>1 of 3 words</b> within 10 seconds, or one is picked at random.',
            fr: 'Les joueurs dessinent à tour de rôle, dans l\'ordre d\'arrivée. Le dessinateur choisit <b>1 mot parmi 3</b> en 10 secondes, sinon un mot est tiré au hasard.',
        },
    },
    {
        title: { en: 'Draw', fr: 'Dessiner' },
        art: () => art(canvas('moon', 30, 24, 180, 190), ['k-pc-ink', 'k-dng', 'k-uB', 'k-uG', 'k-acc'].map((c, k) => circle(250, 44 + k * 30, 10, c)).join(''), ic('eraser', 290, 84, 26, 'k-ic'), ic('bucket', 290, 134, 26, 'k-ic-acc'), ic('refresh', 290, 184, 24, 'k-ic-m')),
        text: {
            en: 'Draw with a few colours, 3 brush sizes and an eraser. Switch to <b>Fill</b> and tap inside a closed shape to paint it. Undo and clear help too. Everyone sees the drawing live.',
            fr: 'Dessine avec quelques couleurs, 3 tailles de pinceau et une gomme. Passe en <b>Remplir</b> et touche l\'intérieur d\'une forme fermée pour la peindre. Annuler et effacer aident aussi. Tout le monde voit le dessin en direct.',
        },
    },
    {
        title: { en: 'Guess', fr: 'Deviner' },
        art: lang => art(canvas('boat', 20, 30, 140, 140),
            pill(240, 60, lang === 'fr' ? 'Nina a trouvé' : 'Nina guessed it', { w: 140, size: 10 }),
            pill(240, 104, lang === 'fr' ? 'bateu : presque !' : 'baot: close!', { w: 140, size: 10, cls: 'k-pill-acc', ink: 'k-tbg' }),
            pill(240, 148, lang === 'fr' ? 'voilier ?' : 'ship?', { w: 140, size: 10 })),
        text: {
            en: 'Type guesses in the box. A right answer is <b>never shown</b> to others: they only see "Name guessed it". One letter off? You get a private "Close!". Accents and capitals do not matter.',
            fr: 'Tape tes propositions dans la case. Une bonne réponse n\'est <b>jamais montrée</b> aux autres : ils voient seulement « Nom a trouvé ». À une lettre près ? Tu reçois un « Presque ! » privé. Accents et majuscules ne comptent pas.',
        },
    },
    {
        title: { en: 'Points', fr: 'Points' },
        art: lang => art(['+10', '+8', '+6', '+5'].map((p, k) => rect(30 + k * 66, 70, 56, 70, k ? 'k-paper' : 'k-hl', 10) + label(58 + k * 66, 92, String(k + 1), { size: 16, cls: 'k-t', font: 'display' }) + label(58 + k * 66, 120, p, { size: 13, cls: 'k-ta' })).join(''), label(160, 186, lang === 'fr' ? 'dessinateur : +2 par bonne réponse' : 'drawer: +2 per right guess', { size: 11, cls: 'k-tm' })),
        text: {
            en: 'First right guess <b>+10</b>, then +8, +6, +5, +4 and so on (at least 2). The drawer gets <b>+2 for every right guess</b>. Nobody guesses? Nobody scores.',
            fr: 'Première bonne réponse <b>+10</b>, puis +8, +6, +5, +4 et ainsi de suite (au moins 2). Le dessinateur gagne <b>+2 par bonne réponse</b>. Personne ne trouve ? Personne ne marque.',
        },
    },
    {
        title: { en: 'Hints and the end', fr: 'Indices et fin' },
        art: () => art(rect(60, 80, 200, 60, 'k-paper', 14), label(160, 110, 'G _ _ T _ R', { size: 20, cls: 'k-t', font: 'display' }), label(160, 172, '80 s', { size: 12 })),
        text: {
            en: 'Optional hints show some letters as time passes. A turn ends when everyone has guessed or the timer runs out (80 s by default), and the word is shown. After everyone has drawn twice, the highest score wins.',
            fr: 'Des indices optionnels montrent des lettres au fil du temps. Un tour s\'arrête quand tout le monde a trouvé ou que le chrono expire (80 s par défaut), et le mot est montré. Quand chacun a dessiné deux fois, le meilleur score gagne.',
        },
    },
    modesStep({
        en: 'Against the AI, you always guess: bots draw from a library of 88 drawings and race you to the answer. On one device, everyone shouts guesses and the drawer taps who found it first.',
        fr: 'Contre l\'IA, tu devines toujours : les bots dessinent à partir de 88 dessins et font la course avec toi. Sur un seul appareil, tout le monde crie ses réponses et le dessinateur touche qui a trouvé en premier.',
    }),
];
