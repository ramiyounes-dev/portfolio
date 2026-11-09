import logic from '../logic/anagram.js';
import howto from '../howto/anagram.js';
import ai from '../ai/anagram.js';
import { icon } from '../client/icons.js';

export default {
    logic,
    ai,
    wordGame: true,
    title: { en: 'Anagram Race', fr: 'Course aux anagrammes' },
    icon: 'anagram',
    strings: {
        en: {
            'set.rounds': 'Rounds', 'set.timer': 'Round timer', 'set.minLen': 'Shortest word', 'set.maxLen': 'Longest word', 'set.hints': 'Hints',
            roundOf: 'Word {n} of {m}', unscramble: 'Unscramble the word', typePh: 'Type or tap the letters', submit: 'Submit', clear: 'Clear',
            hint: 'Hint (half points)', hintIs: 'Starts with {l}', found: 'Found it. Waiting for the others.', answer: 'The word was {w}',
            alsoOk: 'Also accepted: {list}', nobody: 'Nobody found it', 'ana.wrong': 'Not quite, try again', cooldown: 'Wait a second',
            'err.cooldown': 'Wait a second', solverTurn: '{name}, your letters. The clock is running.', timeOf: '{t} s', noTime: 'not found',
        },
        fr: {
            'set.rounds': 'Manches', 'set.timer': 'Temps par mot', 'set.minLen': 'Mot le plus court', 'set.maxLen': 'Mot le plus long', 'set.hints': 'Indices',
            roundOf: 'Mot {n} sur {m}', unscramble: 'Remets les lettres dans l\'ordre', typePh: 'Tape ou touche les lettres', submit: 'Valider', clear: 'Effacer',
            hint: 'Indice (moitié des points)', hintIs: 'Commence par {l}', found: 'Trouvé. On attend les autres.', answer: 'Le mot était {w}',
            alsoOk: 'Aussi acceptés : {list}', nobody: 'Personne n\'a trouvé', 'ana.wrong': 'Pas tout à fait, réessaie', cooldown: 'Attends une seconde',
            'err.cooldown': 'Attends une seconde', solverTurn: '{name}, à toi. Le chrono tourne.', timeOf: '{t} s', noTime: 'pas trouvé',
        },
    },
    deviceSettings: { turns: true },
    privateInfo: true,
    howto,

    status: (v, api) => api.t('roundOf', { n: v.round, m: v.rounds }),
    turnOf: v => (v.phase !== 'guess' ? [] : v.turns ? [v.solver] : v.players.filter(id => !v.correct.some(c => c.id === id))),

    onNote(note, api) { api.toast(api.t(note)); const i = document.querySelector('.an-input'); if (i) { i.classList.remove('shake'); void i.offsetWidth; i.classList.add('shake'); } },

    render(root, v, api) {
        const { t, esc, send, nameOf, isSeated } = api;
        const key = `${v.round}:${v.phase}:${v.solver || ''}`;
        if (root.dataset.key !== key) {
            root.dataset.key = key;
            root._used = [];
            root.innerHTML = `<p class="g-big-msg an-msg"></p><div class="an-tiles"></div>
                <form class="an-form"><input class="p-input an-input" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12">
                <div class="p-row"><button type="button" class="p-btn" data-clear="1"></button><button type="button" class="p-btn" data-hint="1"></button><button type="submit" class="p-btn primary"></button></div></form>
                <p class="g-note an-hint"></p><ul class="g-list an-found"></ul><div class="an-reveal"></div>`;
            const form = root.querySelector('.an-form');
            const input = form.querySelector('input');
            form.onsubmit = e => { e.preventDefault(); if (input.value.trim()) send({ answer: input.value }); };
            input.oninput = () => { root._used = []; syncTiles(); };
            root.querySelector('.an-tiles').onclick = e => {
                const b = e.target.closest('button[data-i]');
                if (!b || b.disabled) return;
                root._used.push(Number(b.dataset.i));
                input.value = root._used.map(i => v.letters[i]).join('');
                syncTiles();
            };
            form.onclick = e => {
                if (e.target.closest('[data-clear]')) { root._used = []; input.value = ''; syncTiles(); }
                if (e.target.closest('[data-hint]')) send({ hint: true });
            };
            const syncTiles = () => root.querySelectorAll('.an-tiles button').forEach(b => { b.disabled = root._used.includes(Number(b.dataset.i)); });
        }
        const $ = s => root.querySelector(s);
        const guessing = v.phase === 'guess';
        const canType = guessing && isSeated && !v.done && (!v.turns || v.solver === api.me);
        $('.an-msg').textContent = guessing ? (v.turns ? t('solverTurn', { name: nameOf(v.solver) }) : v.done ? t('found') : t('unscramble')) : (v.reveal ? t('answer', { w: v.reveal.word.toUpperCase() }) : '');
        if ($('.an-tiles').dataset.l !== v.letters) {
            $('.an-tiles').dataset.l = v.letters;
            $('.an-tiles').innerHTML = [...v.letters].map((L, i) => `<button type="button" class="an-tile" data-i="${i}">${L}</button>`).join('');
        }
        $('.an-tiles').classList.toggle('idle', !canType);
        $('.an-form').classList.toggle('hidden', !canType);
        $('.an-input').placeholder = t('typePh');
        $('[data-clear]').textContent = t('clear');
        $('[data-hint]').textContent = t('hint');
        $('[data-hint]').classList.toggle('hidden', !v.hintsOn || !!v.hint);
        $('.an-form button[type=submit]').textContent = t('submit');
        $('.an-hint').textContent = v.hint ? t('hintIs', { l: v.hint }) : '';
        $('.an-found').innerHTML = v.correct.map((c, i) => `<li><span class="p-rank">${i + 1}</span><span class="p-name">${icon('check')} ${esc(nameOf(c.id))}</span><span class="g-right">+${c.pts}</span></li>`).join('');
        if (v.times) $('.an-found').innerHTML = v.players.map(id => [id, v.times[id]]).sort((a, b) => (a[1] ?? 1e12) - (b[1] ?? 1e12))
            .map(([id, ms], i) => { const c = v.correct.find(x => x.id === id); return `<li><span class="p-rank">${i + 1}</span><span class="p-name">${esc(nameOf(id))}</span><span class="g-right">${ms == null ? esc(t('noTime')) : esc(t('timeOf', { t: (ms / 1000).toFixed(1) }))}${c ? ` · +${c.pts}` : ''}</span></li>`; }).join('');
        $('.an-reveal').innerHTML = v.reveal ? `${!v.correct.length ? `<p class="g-note">${esc(t('nobody'))}</p>` : ''}${v.reveal.alts.length ? `<p class="g-note">${esc(t('alsoOk', { list: v.reveal.alts.join(', ') }))}</p>` : ''}` : '';
    },
};
