import logic from '../logic/mastermind.js';
import howto from '../howto/mastermind.js';
import ai from '../ai/mastermind.js';
import { icon } from '../client/icons.js';

const COLORS = ['#d9483b', '#e8902e', '#f2d14a', '#4caf6a', '#3b82d9', '#8e5bd9', '#e86fb3', '#efe9dc'];

function peg(c, extra = '') { return `<span class="mm-peg ${extra}" style="${c === null || c === undefined ? '' : `--c:${COLORS[c]}`}"></span>`; }
function pins(black, white, len) {
    const out = [];
    for (let i = 0; i < len; i++) out.push(`<i class="${i < black ? 'b' : i < black + white ? 'w' : ''}"></i>`);
    return `<span class="mm-pins" aria-label="${black} black, ${white} white">${out.join('')}</span>`;
}

export default {
    logic,
    ai,
    privateInfo: true,
    title: { en: 'Mastermind', fr: 'Mastermind' },
    icon: 'mastermind',
    strings: {
        en: {
            'set.length': 'Code length', 'set.colors': 'Colours', 'set.dupes': 'Repeated colours', 'set.maxGuesses': 'Max guesses', 'set.rounds': 'Rounds',
            'opt.rounds.0': 'Everyone makes a code', 'set.timer': 'Round timer', 'opt.length.4': '4', 'opt.length.5': '5', 'opt.colors.6': '6', 'opt.colors.8': '8',
            makerYou: 'You are the Codemaker: build a secret code', makerOther: '{name} is making a code', random: 'Random code', lock: 'Lock the code',
            breakHint: 'Crack the code: tap colours, then Guess', guess: 'Guess', clear: 'Clear', yourCode: 'Your code', solvedIn: 'Cracked in {n} (+{p})',
            outOfGuesses: 'Out of guesses', waiting: 'Waiting for the others', roundOf: 'Round {n} of {m}', roundN: 'Round {n}',
            theCode: 'The code was', guesses: '{n} guesses', cracked: 'cracked', failed: 'failed', progress: '{n}/{m}', 'mm.noDupes': 'No repeated colours in this room',
            makerGains: 'Codemaker +{n}',
        },
        fr: {
            'set.length': 'Longueur du code', 'set.colors': 'Couleurs', 'set.dupes': 'Couleurs répétées', 'set.maxGuesses': 'Essais max', 'set.rounds': 'Manches',
            'opt.rounds.0': 'Chacun crée un code', 'set.timer': 'Temps par manche', 'opt.length.4': '4', 'opt.length.5': '5', 'opt.colors.6': '6', 'opt.colors.8': '8',
            makerYou: 'Tu crées le code : compose une combinaison secrète', makerOther: '{name} crée un code', random: 'Code au hasard', lock: 'Valider le code',
            breakHint: 'Trouve le code : touche des couleurs, puis Essayer', guess: 'Essayer', clear: 'Effacer', yourCode: 'Ton code', solvedIn: 'Trouvé en {n} (+{p})',
            outOfGuesses: 'Plus d\'essais', waiting: 'On attend les autres', roundOf: 'Manche {n} sur {m}', roundN: 'Manche {n}',
            theCode: 'Le code était', guesses: '{n} essais', cracked: 'trouvé', failed: 'raté', progress: '{n}/{m}', 'mm.noDupes': 'Pas de couleur répétée dans cette partie',
            makerGains: 'Créateur +{n}',
        },
    },
    howto,

    status(v, api) { return v.totalRounds ? api.t('roundOf', { n: v.round, m: v.totalRounds }) : api.t('roundN', { n: v.round }); },
    turnOf(v) {
        if (v.phase === 'code') return [v.maker];
        if (v.phase === 'break') return Object.keys(v.progress).filter(id => !v.progress[id].solved && !v.progress[id].out);
        return [];
    },

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const key = `${v.round}:${v.phase}:${v.mine ? v.mine.guesses.length : ''}`;
        if (root.dataset.key !== key) { root.dataset.key = key; root._cur = Array(v.len).fill(null); }
        const cur = root._cur;
        const editing = (v.phase === 'code' && v.maker === me) || (v.phase === 'break' && v.mine && !v.mine.solved && !v.mine.out);
        const editor = editing ? `
            <div class="mm-row edit">${cur.map((c, i) => `<button type="button" class="mm-slot" data-slot="${i}">${peg(c)}</button>`).join('')}</div>
            <div class="mm-palette">${COLORS.slice(0, v.colors).map((c, i) => `<button type="button" class="mm-color" data-c="${i}" style="--c:${c}" aria-label="colour ${i + 1}"></button>`).join('')}</div>
            <div class="p-row">${v.phase === 'code' ? `<button type="button" class="p-btn" data-rand="1">${esc(t('random'))}</button>` : `<button type="button" class="p-btn" data-clear="1">${esc(t('clear'))}</button>`}
              <button type="button" class="p-btn primary" data-go="1" ${cur.includes(null) ? 'disabled' : ''}>${esc(v.phase === 'code' ? t('lock') : t('guess'))}</button></div>` : '';

        const progress = `<ul class="g-list">${Object.entries(v.progress).map(([id, p]) => `<li><span class="p-name">${esc(nameOf(id))}</span>
            <span class="g-right">${p.solved ? `${icon('check')} ${esc(t('cracked'))} +${p.pts}` : p.out ? esc(t('failed')) : esc(t('progress', { n: p.n, m: v.maxGuesses }))}</span></li>`).join('')}</ul>`;

        let html = '';
        if (v.phase === 'code') {
            html = `<p class="g-big-msg">${esc(v.maker === me ? t('makerYou') : t('makerOther', { name: nameOf(v.maker) }))}</p>${editor}`;
        } else if (v.phase === 'break') {
            if (v.maker === me) html = `<p class="p-label">${esc(t('yourCode'))}</p><div class="mm-row">${v.code.map(c => peg(c)).join('')}</div>${progress}`;
            else if (v.mine) {
                const rows = v.mine.guesses.map(g => `<div class="mm-row">${g.guess.map(c => peg(c)).join('')}${pins(g.black, g.white, v.len)}</div>`).join('');
                const note = v.mine.solved ? t('solvedIn', { n: v.mine.guesses.length, p: v.progress[me].pts }) : v.mine.out ? t('outOfGuesses') : t('breakHint');
                html = `<p class="g-big-msg">${esc(note)}</p><div class="mm-board">${rows}</div>${editor}
                    <p class="p-mono center">${esc(t('progress', { n: v.mine.guesses.length, m: v.maxGuesses }))}</p>${v.mine.solved || v.mine.out ? progress : ''}`;
            } else html = progress;
        } else if (v.phase === 'reveal' && v.boards) {
            const gains = v.result && v.result.gains[v.maker];
            html = `<p class="p-label">${esc(t('theCode'))}</p><div class="mm-row">${v.code.map(c => peg(c)).join('')}</div>
                ${gains ? `<p class="g-note">${esc(t('makerGains', { n: gains }))}</p>` : ''}
                <div class="mm-reveal">${Object.entries(v.boards).map(([id, b]) => `<div class="mm-rb"><p class="p-mono">${esc(nameOf(id))} · ${b.solved ? icon('check') + ' +' + (b.pts || 0) : esc(t('failed'))}</p>
                ${b.guesses.map(g => `<div class="mm-row small">${g.guess.map(c => peg(c)).join('')}${pins(g.black, g.white, v.len)}</div>`).join('')}</div>`).join('')}</div>`;
        }
        root.innerHTML = html;
        root.onclick = e => {
            const c = e.target.closest('[data-c]');
            if (c) { const i = cur.indexOf(null); if (i >= 0) { cur[i] = Number(c.dataset.c); this.render(root, v, api); } return; }
            const sl = e.target.closest('[data-slot]');
            if (sl) { cur[Number(sl.dataset.slot)] = null; this.render(root, v, api); return; }
            if (e.target.closest('[data-clear]')) { cur.fill(null); this.render(root, v, api); return; }
            if (e.target.closest('[data-rand]')) { send({ random: true }); return; }
            if (e.target.closest('[data-go]') && !cur.includes(null)) send(v.phase === 'code' ? { code: [...cur] } : { guess: [...cur] });
        };
    },
};
