import logic from '../logic/tictactoe.js';
import howto from '../howto/tictactoe.js';
import ai from '../ai/tictactoe.js';

export default {
    logic,
    ai,
    title: { en: 'Tic-Tac-Toe', fr: 'Morpion' },
    icon: 'tictactoe',
    strings: {
        en: {
            'set.bestOf': 'Best of', 'set.timer': 'Turn timer', 'set.queueMode': 'Queue',
            'opt.queueMode.winner': 'Winner stays', 'opt.queueMode.rotate': 'Rotate both',
            gameOf: 'Game {n} · best of {b}', youAre: 'You play {m}', wonGame: '{name} takes this game', drawGame: 'Draw, nobody scores',
        },
        fr: {
            'set.bestOf': 'Au meilleur de', 'set.timer': 'Temps par tour', 'set.queueMode': 'File d\'attente',
            'opt.queueMode.winner': 'Le gagnant reste', 'opt.queueMode.rotate': 'Les deux changent',
            gameOf: 'Manche {n} · au meilleur de {b}', youAre: 'Tu joues {m}', wonGame: '{name} remporte la manche', drawGame: 'Égalité, personne ne marque',
        },
    },
    howto,

    status(v, api) {
        const { t, me, nameOf } = api;
        if (v.phase === 'between' && v.result) return v.result.draw ? t('drawGame') : t('wonGame', { name: nameOf(v.result.winner) });
        if (!v.turn) return '';
        return v.turn === me ? t('yourTurn') : t('turnOf', { name: nameOf(v.turn) });
    },

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const myMark = v.players.includes(me) ? (me === v.x ? 'X' : 'O') : null;
        const canPlay = v.phase === 'play' && v.turn === me;
        const o = v.players.find(id => id !== v.x);
        // The board is redrawn on every update: only a mark that was not there last time pops in
        const prev = root._tttCells;
        const fresh = i => !!(prev && v.cells[i] && !prev[i]);
        root._tttCells = [...v.cells];
        root.innerHTML = `
            <div class="ttt-meta">
              <span class="ttt-tag ${v.turn === v.x ? 'on' : ''}"><b class="mark-x">X</b> ${esc(nameOf(v.x))}</span>
              <span class="p-mono">${esc(t('gameOf', { n: v.game, b: v.bestOf }))}</span>
              <span class="ttt-tag ${v.turn === o ? 'on' : ''}"><b class="mark-o">O</b> ${esc(nameOf(o))}</span>
            </div>
            <div class="g-board ttt" style="grid-template-columns:repeat(3,1fr)">
              ${v.cells.map((c, i) => `<button type="button" class="g-cell ${!c && canPlay ? 'can' : ''} ${v.line && v.line.includes(i) ? 'win' : ''}" data-i="${i}" ${c || !canPlay ? 'disabled' : ''} aria-label="${i + 1}${c ? ' ' + c : ''}">
                ${c ? `<span class="mark mark-${c.toLowerCase()}${fresh(i) ? ' new' : ''}">${c}</span>` : ''}</button>`).join('')}
            </div>
            ${myMark ? `<p class="g-note">${esc(t('youAre', { m: myMark }))}</p>` : ''}`;
        root.querySelector('.ttt').onclick = e => {
            const b = e.target.closest('button[data-i]');
            if (b && !b.disabled) send({ cell: Number(b.dataset.i) });
        };
    },
};
