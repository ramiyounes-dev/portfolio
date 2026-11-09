import logic from '../logic/nim.js';
import howto from '../howto/nim.js';
import ai from '../ai/nim.js';

export default {
    logic,
    ai,
    title: { en: 'Nim', fr: 'Nim' },
    icon: 'nim',
    strings: {
        en: {
            'set.preset': 'Piles', 'set.mode': 'Mode', 'set.games': 'Games', 'set.timer': 'Turn timer',
            'opt.preset.classic': '1·3·5·7', 'opt.preset.small': '3·4·5', 'opt.preset.big': '2·4·6·8·10', 'opt.preset.random': 'Random',
            'opt.mode.misere': 'Misère', 'opt.mode.normal': 'Normal',
            gameOf: 'Game {n} of {m}', misere: 'Last match loses', normal: 'Last match wins',
            pickHint: 'Tap the leftmost match you want to take from one pile', take: 'Take {n}', cancel: 'Cancel',
            took: '{name} took {n} from pile {p}', lostGame: '{name} took the last match', wonGame: '{name} took the last match and wins',
        },
        fr: {
            'set.preset': 'Tas', 'set.mode': 'Mode', 'set.games': 'Parties', 'set.timer': 'Temps par tour',
            'opt.preset.classic': '1·3·5·7', 'opt.preset.small': '3·4·5', 'opt.preset.big': '2·4·6·8·10', 'opt.preset.random': 'Au hasard',
            'opt.mode.misere': 'Misère', 'opt.mode.normal': 'Normal',
            gameOf: 'Partie {n} sur {m}', misere: 'La dernière allumette perd', normal: 'La dernière allumette gagne',
            pickHint: 'Touche l\'allumette la plus à gauche à prendre dans un seul tas', take: 'Prendre {n}', cancel: 'Annuler',
            took: '{name} a pris {n} dans le tas {p}', lostGame: '{name} a pris la dernière allumette', wonGame: '{name} a pris la dernière allumette et gagne',
        },
    },
    howto,

    status(v, api) {
        const { t, me, nameOf } = api;
        if (v.phase === 'between' && v.result) return v.mode === 'normal' ? t('wonGame', { name: nameOf(v.result.taker) }) : t('lostGame', { name: nameOf(v.result.taker) });
        if (!v.turn) return '';
        return v.turn === me ? t('yourTurn') : t('turnOf', { name: nameOf(v.turn) });
    },

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const sig = v.piles.join(',') + '|' + v.turn;
        if (root.dataset.sig !== sig) { root.dataset.sig = sig; root._sel = null; }
        const sel = root._sel;
        const mine = v.phase === 'play' && v.turn === me;
        // Matches just taken burn out and lift away; the others stay where they are
        const prev = root._nimPrev && root._nimPrev.length === v.piles.length ? root._nimPrev : null;
        root._nimPrev = [...v.piles];
        const tilt = (p, i) => ((p * 7 + i * 13) % 9) - 4;                 // a small fixed lean per match
        const piles = v.piles.map((count, p) => {
            const gone = prev ? Math.max(0, prev[p] - count) : 0;
            const sticks = [...Array(count + gone)].map((_, i) => {
                if (i >= count) return `<span class="nim-stick gone" style="--tilt:${tilt(p, i)}deg;--d:${(i - count) * 60}ms" aria-hidden="true"><span></span></span>`;
                const chosen = sel && sel.pile === p && i >= count - sel.take;
                return `<button type="button" class="nim-stick ${chosen ? 'sel' : ''}" style="--tilt:${tilt(p, i)}deg" data-p="${p}" data-i="${i}" ${mine ? '' : 'disabled'} aria-label="${p + 1}:${i + 1}"><span></span></button>`;
            }).join('');
            return `<div class="nim-pile ${sel && sel.pile === p ? 'active' : ''} ${count ? '' : 'empty'}"><span class="nim-label">${p + 1}</span><div class="nim-sticks">${sticks}</div><span class="nim-count">${count}</span></div>`;
        }).join('');
        const last = v.lastMove ? `<p class="g-note">${esc(t('took', { name: nameOf(v.lastMove.pid), n: v.lastMove.take, p: v.lastMove.pile + 1 }))}</p>` : '';
        root.innerHTML = `
            <div class="ttt-meta"><span class="p-mono">${esc(t('gameOf', { n: v.game, m: v.games }))}</span><span class="p-badge">${esc(t(v.mode))}</span></div>
            <div class="nim-board ${mine ? 'mine' : ''} ${sel ? 'selecting' : ''}">${piles}</div>
            ${mine ? (sel ? `<div class="p-row"><button type="button" class="p-btn primary" data-go="1">${esc(t('take', { n: sel.take }))}</button><button type="button" class="p-btn" data-x="1">${esc(t('cancel'))}</button></div>`
                : `<p class="g-note">${esc(t('pickHint'))}</p>`) : last}`;
        root.onclick = e => {
            const stick = e.target.closest('.nim-stick');
            if (stick && !stick.disabled) {
                const p = Number(stick.dataset.p), i = Number(stick.dataset.i);
                root._sel = { pile: p, take: v.piles[p] - i };
                this.render(root, v, api);
                return;
            }
            if (e.target.closest('[data-x]')) { root._sel = null; this.render(root, v, api); return; }
            if (e.target.closest('[data-go]') && root._sel) send({ pile: root._sel.pile, take: root._sel.take });
        };
    },
};
