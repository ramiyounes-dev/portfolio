import logic from '../logic/memory.js';
import howto from '../howto/memory.js';
import ai from '../ai/memory.js';
import { hue } from '../client/app.js';
import { pictureSvg, pictureLabel } from '../client/pictures.js';

const COLS = { 16: 4, 20: 4, 24: 4, 30: 5, 36: 6 };

export default {
    logic,
    ai,
    title: { en: 'Memory', fr: 'Jeu des paires' },
    icon: 'memory',
    strings: {
        en: {
            'set.size': 'Cards', 'set.theme': 'Cards theme', 'set.reveal': 'Reveal time', 'set.timer': 'Turn timer',
            'opt.size.auto': 'Auto', 'opt.size.16': '16', 'opt.size.20': '20', 'opt.size.24': '24', 'opt.size.30': '30', 'opt.size.36': '36',
            'opt.theme.mixed': 'Mixed', 'opt.theme.nature': 'Nature', 'opt.theme.objects': 'Objects',
            'opt.reveal.1': '1 s', 'opt.reveal.1.5': '1.5 s', 'opt.reveal.2.5': '2.5 s',
            pickTwo: 'Flip two cards', pickOne: 'Flip one more', noMatch: 'No match', pairsLeft: '{n} pairs left',
        },
        fr: {
            'set.size': 'Cartes', 'set.theme': 'Thème des cartes', 'set.reveal': 'Temps d\'affichage', 'set.timer': 'Temps par tour',
            'opt.size.auto': 'Auto', 'opt.size.16': '16', 'opt.size.20': '20', 'opt.size.24': '24', 'opt.size.30': '30', 'opt.size.36': '36',
            'opt.theme.mixed': 'Mélange', 'opt.theme.nature': 'Nature', 'opt.theme.objects': 'Objets',
            'opt.reveal.1': '1 s', 'opt.reveal.1.5': '1,5 s', 'opt.reveal.2.5': '2,5 s',
            pickTwo: 'Retourne deux cartes', pickOne: 'Encore une carte', noMatch: 'Pas de paire', pairsLeft: 'Encore {n} paires',
        },
    },
    howto,

    status(v, api) {
        const { t, me, nameOf } = api;
        if (v.phase === 'showing') return t('noMatch');
        if (v.turn !== me) return t('turnOf', { name: nameOf(v.turn) });
        return v.flipped.length ? t('pickOne') : t('pickTwo');
    },

    render(root, v, api) {
        const { t, me, esc, send } = api;
        const mine = v.turn === me && v.phase === 'pick';
        const cols = COLS[v.n] || 6;
        const left = v.matched.filter(m => !m).length / 2;
        root.innerHTML = `<p class="g-note">${esc(t('pairsLeft', { n: left }))}</p>
            <div class="mm-grid" style="grid-template-columns:repeat(${cols},1fr);--cols:${cols};--rows:${Math.ceil(v.cards.length / cols)}">
            ${v.cards.map((face, i) => {
                const up = !!face;
                const owner = v.matched[i];
                const can = mine && !up;
                return `<button type="button" class="mm-card ${up ? 'up' : ''} ${owner ? 'got' : ''} ${v.phase === 'showing' && v.flipped.includes(i) ? 'miss' : ''}" data-i="${i}" ${can ? '' : 'disabled'}
                    style="${owner ? `--own:hsl(${hue(owner)} 62% 55%)` : ''}" aria-label="${up ? esc(pictureLabel(face, api.lang)) : '?'}">
                    <span class="mm-inner"><span class="mm-back"></span><span class="mm-face">${face ? pictureSvg(face) : ''}</span></span></button>`;
            }).join('')}</div>`;
        root.querySelector('.mm-grid').onclick = e => {
            const b = e.target.closest('button[data-i]');
            if (b && !b.disabled) send({ card: Number(b.dataset.i) });
        };
    },
};
