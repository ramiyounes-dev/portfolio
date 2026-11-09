import logic from '../logic/reversi.js';
import howto from '../howto/reversi.js';
import ai from '../ai/reversi.js';

export default {
    logic,
    ai,
    title: { en: 'Reversi', fr: 'Reversi (Othello)' },
    icon: 'reversi',
    strings: {
        en: {
            'set.showMoves': 'Show legal moves', 'set.timer': 'Turn timer', 'set.queueMode': 'Queue',
            'opt.queueMode.winner': 'Winner stays', 'opt.queueMode.rotate': 'Rotate both',
            black: 'Black', white: 'White', youAre: 'You play {c}', passed: '{name} has no move and passes',
        },
        fr: {
            'set.showMoves': 'Montrer les coups possibles', 'set.timer': 'Temps par tour', 'set.queueMode': 'File d\'attente',
            'opt.queueMode.winner': 'Le gagnant reste', 'opt.queueMode.rotate': 'Les deux changent',
            black: 'Noir', white: 'Blanc', youAre: 'Tu joues {c}', passed: '{name} n\'a aucun coup et passe',
        },
    },
    howto,

    status(v, api) {
        const { t, me, nameOf } = api;
        if (v.passed) return t('passed', { name: nameOf(v.passed) });
        if (!v.turn) return '';
        return v.turn === me ? t('yourTurn') : t('turnOf', { name: nameOf(v.turn) });
    },

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const mine = v.turn === me;
        // Rebuild only when the position changes, so flips in progress are never cut short or replayed
        const key = [v.board.join(''), v.turn, v.legal.join(','), t('black')].join('|');
        if (root._rvKey === key) return;
        const fresh = root._rvKey !== undefined && v.last && root._rvLast !== `${v.last.idx}:${v.board.filter(Boolean).length}`;
        root._rvKey = key;
        root._rvLast = v.last ? `${v.last.idx}:${v.board.filter(Boolean).length}` : '';
        const flips = new Set(fresh ? v.last.flips : []);
        const dist = i => Math.max(Math.abs((i % 8) - (v.last.idx % 8)), Math.abs(Math.floor(i / 8) - Math.floor(v.last.idx / 8)));
        const myCls = me === v.black ? 'b' : me === v.white ? 'w' : '';
        const cells = v.board.map((c, i) => {
            const legal = !c && mine && v.legal.includes(i);
            const hint = !c && !mine && v.legal.includes(i);
            const cls = c === 'B' ? 'b' : 'w';
            const anim = flips.has(i) ? ` flip from-${cls === 'b' ? 'w' : 'b'}" style="--d:${dist(i) * 70}ms` : fresh && v.last.idx === i ? ' drop' : '';
            return `<button type="button" class="rv-cell ${legal ? 'can' : ''}" data-i="${i}" ${legal ? '' : 'disabled'} aria-label="${'ABCDEFGH'[i % 8]}${Math.floor(i / 8) + 1}">
                ${c ? `<span class="rv-disc ${cls}${v.last && v.last.idx === i ? ' last' : ''}${anim}"></span>` : ''}
                ${legal ? `<span class="rv-dot"></span><span class="rv-ghost ${myCls}"></span>` : hint ? '<span class="rv-dot faint"></span>' : ''}</button>`;
        }).join('');
        const tag = (id, cls) => `<span class="ttt-tag ${v.turn === id ? 'on' : ''}"><span class="rv-mini ${cls}"></span>${esc(nameOf(id))} · ${v.scores[id]}</span>`;
        const myColor = me === v.black ? t('black') : me === v.white ? t('white') : null;
        root.innerHTML = `<div class="ttt-meta">${tag(v.black, 'b')}${tag(v.white, 'w')}</div>
            <div class="rv-stage"><div class="rv-board">${cells}</div></div>
            ${myColor ? `<p class="g-note">${esc(t('youAre', { c: myColor }))}</p>` : ''}`;
        root.querySelector('.rv-board').onclick = e => {
            const b = e.target.closest('button[data-i]');
            if (b && !b.disabled) send({ cell: Number(b.dataset.i) });
        };
    },
};
