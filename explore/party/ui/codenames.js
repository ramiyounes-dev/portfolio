import logic from '../logic/codenames.js';
import howto from '../howto/codenames.js';
import ai from '../ai/codenames.js';

export default {
    logic,
    ai,
    aiRoles: [{ id: 'operative', label: 'cn.roleOp' }, { id: 'spymaster', label: 'cn.roleSpy' }],
    privateInfo: v => !!v.isSpy,                          // the key never shows unless the phone was handed over
    deviceSettings: { spymasters: 'random', quickVote: true },
    devicePrepare(s, { mod, ctx }) { mod.act(s, s.players[0], { begin: true }, ctx); },
    wordGame: true,
    title: { en: 'Codenames', fr: 'Nom de code' },
    icon: 'codenames',
    strings: {
        en: {
            'cn.roleOp': 'Operative (guess)', 'cn.roleSpy': 'Spymaster (give clues)',
            'set.spymasters': 'Spymasters', 'opt.spymasters.volunteer': 'Volunteer', 'opt.spymasters.random': 'Random', 'set.timer': 'Turn timer',
            red: 'Red', blue: 'Blue', joinRed: 'Join red', joinBlue: 'Join blue', beSpy: 'Be Spymaster', spy: 'Spymaster', shuffle: 'Shuffle teams', begin: 'Start the game',
            needTeams: 'Each team needs at least 2 players and a Spymaster', teamsTitle: 'Pick your team', leftOf: '{red} red · {blue} blue left',
            turn: '{team} team\'s turn', giveClue: 'Give a one-word clue and a number', cluePh: 'One word', send: 'Give clue', waitClue: 'Waiting for the {team} Spymaster',
            clueIs: '"{word}", {n}', unlimited: 'no limit', guessLeft: '{n} guesses left', tapToGuess: 'Tap a card to propose it; it flips when your team agrees',
            endTurn: 'End turn', flag: 'Flag illegal clue', spyWatch: 'Your team is guessing', otherGuessing: 'The other team is guessing', takeSpy: 'Take over as Spymaster',
            'cn.oneWord': 'One single word, letters only', 'cn.onBoard': 'Your clue cannot be or contain a word on the board', 'cn.needTeams': 'Each team needs at least 2 players and a Spymaster',
            'cn.guessFirst': 'Make at least one guess first', 'cn.byAgents': 'All agents found', 'cn.byAssassin': 'The other team touched the assassin',
            'log.clue': '{team}: "{word}", {n}', 'log.reveal': '{team} picked {word} ({kind})', 'log.flag': '{team} flagged "{word}"',
            kind_red: 'red', kind_blue: 'blue', kind_neutral: 'bystander', kind_assassin: 'assassin', switchTeam: 'Switch team',
        },
        fr: {
            'cn.roleOp': 'Agent (deviner)', 'cn.roleSpy': 'Maître-espion (indices)',
            'set.spymasters': 'Espions', 'opt.spymasters.volunteer': 'Volontaires', 'opt.spymasters.random': 'Au hasard', 'set.timer': 'Temps par tour',
            red: 'Rouge', blue: 'Bleu', joinRed: 'Rejoindre rouge', joinBlue: 'Rejoindre bleu', beSpy: 'Être l\'espion', spy: 'Espion', shuffle: 'Mélanger les équipes', begin: 'Lancer la partie',
            needTeams: 'Chaque équipe a besoin d\'au moins 2 joueurs et d\'un espion', teamsTitle: 'Choisis ton équipe', leftOf: 'Reste {red} rouges · {blue} bleus',
            turn: 'Au tour de l\'équipe {team}', giveClue: 'Donne un indice d\'un seul mot et un nombre', cluePh: 'Un mot', send: 'Donner l\'indice', waitClue: 'En attente de l\'espion {team}',
            clueIs: '« {word} », {n}', unlimited: 'sans limite', guessLeft: 'Encore {n} essais', tapToGuess: 'Touche une carte pour la proposer ; elle se retourne quand ton équipe est d\'accord',
            endTurn: 'Fin du tour', flag: 'Signaler un indice interdit', spyWatch: 'Ton équipe cherche', otherGuessing: 'L\'autre équipe cherche', takeSpy: 'Devenir l\'espion',
            'cn.oneWord': 'Un seul mot, avec des lettres', 'cn.onBoard': 'L\'indice ne peut pas être ni contenir un mot du plateau', 'cn.needTeams': 'Chaque équipe a besoin d\'au moins 2 joueurs et d\'un espion',
            'cn.guessFirst': 'Fais d\'abord au moins un essai', 'cn.byAgents': 'Tous les agents trouvés', 'cn.byAssassin': 'L\'autre équipe a touché l\'assassin',
            'log.clue': '{team} : « {word} », {n}', 'log.reveal': '{team} a choisi {word} ({kind})', 'log.flag': '{team} a signalé « {word} »',
            kind_red: 'rouge', kind_blue: 'bleu', kind_neutral: 'passant', kind_assassin: 'assassin', switchTeam: 'Changer d\'équipe',
        },
    },
    howto,

    status(v, api) {
        const { t } = api;
        if (v.phase === 'teams') return t('teamsTitle');
        if (v.phase === 'done') return '';
        return t('turn', { team: t(v.turnTeam) });
    },
    scores: () => null,
    turnOf(v) {
        if (v.phase === 'clue') return [v.spymasters[v.turnTeam]];
        if (v.phase === 'guess') return v.teams[v.turnTeam].filter(id => id !== v.spymasters[v.turnTeam]);
        return [];
    },

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const teamCol = team => `<div class="cn-team ${team}"><span class="p-label">${esc(t(team))}</span><ul>${v.teams[team].map(id => `<li>${esc(nameOf(id))}${v.spymasters[team] === id ? ` <span class="p-badge">${esc(t('spy'))}</span>` : ''}${id === me ? ' ·' : ''}</li>`).join('')}</ul></div>`;
        if (v.phase === 'teams') {
            const valid = ['red', 'blue'].every(tm => v.teams[tm].length >= 2 && v.spymasters[tm]);
            root.innerHTML = `<div class="cn-teams">${teamCol('red')}${teamCol('blue')}</div>
                <div class="p-row"><button type="button" class="p-btn" data-join="red">${esc(t('joinRed'))}</button><button type="button" class="p-btn" data-join="blue">${esc(t('joinBlue'))}</button></div>
                <div class="p-row"><button type="button" class="p-btn" data-spy="1">${esc(t('beSpy'))}</button><button type="button" class="p-btn" data-shuffle="1">${esc(t('shuffle'))}</button></div>
                <button type="button" class="p-btn primary big" data-begin="1" ${valid ? '' : 'disabled'}>${esc(t('begin'))}</button>
                ${valid ? '' : `<p class="g-note">${esc(t('needTeams'))}</p>`}`;
        } else {
            const myOps = v.myTeam === v.turnTeam && !v.isSpy && v.phase === 'guess';
            const proposers = {};
            for (const [pid, idx] of Object.entries(v.proposals)) (proposers[idx] = proposers[idx] || []).push(pid);
            const cards = v.words.map((w, i) => {
                const rev = v.revealed[i];
                const k = v.key ? v.key[i] : null;
                const cls = ['cn-card'];
                if (rev) cls.push('rev', 'k-' + rev);
                else if (k) cls.push('spy-' + k);
                const props = (proposers[i] || []).map(pid => `<i title="${esc(nameOf(pid))}">${esc(nameOf(pid).slice(0, 1).toUpperCase())}</i>`).join('');
                return `<button type="button" class="${cls.join(' ')}" data-i="${i}" ${myOps && !rev ? '' : 'disabled'}><span>${esc(w)}</span>${props ? `<span class="cn-props">${props}</span>` : ''}</button>`;
            }).join('');
            let panel = '';
            if (v.phase === 'clue') {
                if (v.isSpy && v.myTeam === v.turnTeam) panel = `<p class="g-note">${esc(t('giveClue'))}</p><form class="cn-clue"><input class="p-input" maxlength="24" autocomplete="off" placeholder="${esc(t('cluePh'))}">
                    <span class="p-stepper"><button type="button" data-n="-1">−</button><span class="p-set-val cn-n">${root._n ?? 1}</span><button type="button" data-n="1">+</button></span>
                    <button class="p-btn primary" type="submit">${esc(t('send'))}</button></form>`;
                else panel = `<p class="g-note">${esc(t('waitClue', { team: t(v.turnTeam) }))}</p>`;
            } else if (v.phase === 'guess' && v.clue) {
                const left = v.clue.n ? v.clue.n + 1 - v.guesses : null;
                panel = `<p class="g-big-msg cn-clueline ${v.turnTeam}">${esc(t('clueIs', { word: v.clue.word, n: v.clue.n || t('unlimited') }))}</p>
                    ${left !== null ? `<p class="p-mono center">${esc(t('guessLeft', { n: left }))}</p>` : ''}
                    ${myOps ? `<p class="g-note">${esc(t('tapToGuess'))}</p><button type="button" class="p-btn" data-end="1" ${v.guesses ? '' : 'disabled'}>${esc(t('endTurn'))}</button>` : ''}
                    ${v.isSpy && v.myTeam !== v.turnTeam && !v.guesses ? `<button type="button" class="p-btn danger small" data-flag="1">${esc(t('flag'))}</button>` : ''}`;
            }
            const spyGone = v.myTeam && !v.isSpy && v.spymasters[v.myTeam] && api.room.players.find(p => p.id === v.spymasters[v.myTeam])?.away;
            root.innerHTML = `<div class="cn-head"><span class="cn-left red">${v.left.red}</span><span class="p-mono">${esc(t('leftOf', { red: v.left.red, blue: v.left.blue }))}</span><span class="cn-left blue">${v.left.blue}</span></div>
                <div class="cn-grid">${cards}</div>${panel}
                ${spyGone ? `<button type="button" class="p-btn" data-spy="1">${esc(t('takeSpy'))}</button>` : ''}
                <div class="cn-teams small">${teamCol('red')}${teamCol('blue')}</div>
                ${v.myTeam && !v.isSpy && v.phase !== 'done' ? `<button type="button" class="text-link" data-join="${v.myTeam === 'red' ? 'blue' : 'red'}">${esc(t('switchTeam'))}</button>` : ''}
                <ul class="uno-log">${v.log.slice().reverse().map(e => `<li>${esc(t('log.' + e.k, { team: t(e.team), word: e.word, n: e.n || t('unlimited'), kind: t('kind_' + e.kind) }))}</li>`).join('')}</ul>`;
            const form = root.querySelector('.cn-clue');
            if (form) form.onsubmit = e => { e.preventDefault(); send({ clue: form.querySelector('input').value, n: root._n ?? 1 }); };
        }
        root.onclick = e => {
            const card = e.target.closest('.cn-card');
            if (card && !card.disabled) { send({ propose: Number(card.dataset.i) }); return; }
            const j = e.target.closest('[data-join]'); if (j) return send({ join: j.dataset.join });
            if (e.target.closest('[data-spy]')) return send({ spymaster: true });
            if (e.target.closest('[data-shuffle]')) return send({ shuffle: true });
            if (e.target.closest('[data-begin]')) return send({ begin: true });
            if (e.target.closest('[data-end]')) return send({ endTurn: true });
            if (e.target.closest('[data-flag]')) return send({ flag: true });
            const n = e.target.closest('[data-n]');
            if (n) { root._n = Math.max(0, Math.min(9, (root._n ?? 1) + Number(n.dataset.n))); const el = root.querySelector('.cn-n'); if (el) el.textContent = root._n; }
        };
    },
};
