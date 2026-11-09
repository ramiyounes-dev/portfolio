import logic from '../logic/ultimate.js';
import howto from '../howto/ultimate.js';
import ai from '../ai/ultimate.js';

export default {
    logic,
    ai,
    title: { en: 'Ultimate Tic-Tac-Toe', fr: 'Super Morpion' },
    icon: 'ultimate',
    strings: {
        en: {
            'set.timer': 'Turn timer', 'set.tiebreak': 'If no line', 'set.queueMode': 'Queue',
            'opt.tiebreak.draw': 'Draw', 'opt.tiebreak.boards': 'Most boards wins',
            'opt.queueMode.winner': 'Winner stays', 'opt.queueMode.rotate': 'Rotate both',
            playAnywhere: 'Play in any highlighted board', playHere: 'Play in the highlighted board',
            'ut.byLine': 'Three boards in a row', 'ut.byBoards': 'No line left: most boards won', 'ut.drawn': 'No line possible: draw',
            youAre: 'You play {m}',
        },
        fr: {
            'set.timer': 'Temps par tour', 'set.tiebreak': 'Sans ligne', 'set.queueMode': 'File d\'attente',
            'opt.tiebreak.draw': 'Égalité', 'opt.tiebreak.boards': 'Le plus de grilles',
            'opt.queueMode.winner': 'Le gagnant reste', 'opt.queueMode.rotate': 'Les deux changent',
            playAnywhere: 'Joue dans n\'importe quelle grille en surbrillance', playHere: 'Joue dans la grille en surbrillance',
            'ut.byLine': 'Trois grilles alignées', 'ut.byBoards': 'Plus de ligne possible : le plus de grilles gagne', 'ut.drawn': 'Aucune ligne possible : égalité',
            youAre: 'Tu joues {m}',
        },
    },
    howto,

    status(v, api) {
        const { t, me, nameOf } = api;
        if (!v.turn) return '';
        if (v.turn !== me) return t('turnOf', { name: nameOf(v.turn) });
        return v.playable.length === 1 ? t('playHere') : t('playAnywhere');
    },

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const mine = v.turn === me;
        const myMark = v.players.includes(me) ? (me === v.x ? 'X' : 'O') : null;
        const o = v.players.find(id => id !== v.x);
        // The board is redrawn on every update: only a newly claimed small board pops in
        const prevSmall = root._utSmall;
        root._utSmall = [...v.small];
        const boards = [...Array(9)].map((_, b) => {
            const res = v.small[b];
            const live = v.playable.includes(b);
            const cells = [...Array(9)].map((__, i) => {
                const idx = b * 9 + i, c = v.cells[idx];
                const can = mine && live && !c;
                return `<button type="button" class="ut-cell ${can ? 'can' : ''} ${v.last === idx ? 'last' : ''}" data-i="${idx}" ${can ? '' : 'disabled'} aria-label="${b + 1}.${i + 1}${c ? ' ' + c : ''}">${c ? `<span class="mark-${c.toLowerCase()}">${c}</span>` : ''}</button>`;
            }).join('');
            return `<div class="ut-board ${live ? 'live' : ''} ${res ? 'done' : ''} ${v.line && v.line.includes(b) ? 'win' : ''}">${cells}
                ${res && res !== 'D' ? `<span class="ut-claim mark-${res.toLowerCase()}${prevSmall && !prevSmall[b] ? ' new' : ''}">${res}</span>` : ''}</div>`;
        }).join('');
        root.innerHTML = `
            <div class="ttt-meta">
              <span class="ttt-tag ${v.turn === v.x ? 'on' : ''}"><b class="mark-x">X</b> ${esc(nameOf(v.x))}</span>
              <span class="ttt-tag ${v.turn === o ? 'on' : ''}"><b class="mark-o">O</b> ${esc(nameOf(o))}</span>
            </div>
            <div class="ut-big">${boards}</div>
            ${myMark ? `<p class="g-note">${esc(t('youAre', { m: myMark }))}</p>` : ''}`;
        root.querySelector('.ut-big').onclick = e => {
            const b = e.target.closest('button[data-i]');
            if (b && !b.disabled) send({ cell: Number(b.dataset.i) });
        };
    },
};
