import logic, { CLASSIC, SPOCK } from '../logic/rps.js';
import howto from '../howto/rps.js';
import ai from '../ai/rps.js';

import { icon } from '../client/icons.js';

const PICTO = { rock: icon('rock'), paper: icon('paper'), scissors: icon('scissors'), lizard: icon('lizard'), spock: icon('spock') };

export default {
    logic,
    ai,
    privateInfo: true,
    title: { en: 'Rock Paper Scissors', fr: 'Pierre-feuille-ciseaux' },
    icon: 'rps',
    strings: {
        en: {
            'set.variant': 'Variant', 'set.target': 'Duel: first to', 'set.rounds': 'Group: rounds', 'set.timer': 'Choice timer',
            'opt.variant.classic': 'Classic', 'opt.variant.spock': 'Lizard Spock',
            rock: 'Rock', paper: 'Paper', scissors: 'Scissors', lizard: 'Lizard', spock: 'Spock',
            pick: 'Pick your move', picked: 'Locked in: {x}. Waiting for the others.', chose: 'chose', thinking: 'thinking',
            roundOf: 'Round {n} of {m}', duelTo: 'Round {n} · first to {m}', reveal: 'Reveal', random: 'random (too slow)',
            nobody: 'Nobody scores this round', history: 'Previous rounds',
        },
        fr: {
            'set.variant': 'Variante', 'set.target': 'Duel : premier à', 'set.rounds': 'Groupe : manches', 'set.timer': 'Temps de choix',
            'opt.variant.classic': 'Classique', 'opt.variant.spock': 'Lézard Spock',
            rock: 'Pierre', paper: 'Feuille', scissors: 'Ciseaux', lizard: 'Lézard', spock: 'Spock',
            pick: 'Choisis ton coup', picked: 'Choix verrouillé : {x}. On attend les autres.', chose: 'a choisi', thinking: 'réfléchit',
            roundOf: 'Manche {n} sur {m}', duelTo: 'Manche {n} · premier à {m}', reveal: 'Révélation', random: 'au hasard (trop lent)',
            nobody: 'Personne ne marque cette manche', history: 'Manches précédentes',
        },
    },
    howto,

    status(v, api) {
        const { t } = api;
        return v.duel ? t('duelTo', { n: v.round, m: v.target }) : t('roundOf', { n: v.round, m: v.rounds });
    },

    turnOf: v => (v.phase === 'choose' ? v.players.filter(id => !v.chosen.includes(id)) : []),

    render(root, v, api) {
        const { t, me, nameOf, esc, send, isSeated } = api;
        const options = v.variant === 'spock' ? SPOCK : CLASSIC;
        let html = '';
        if (v.phase === 'choose') {
            if (isSeated) {
                html += `<p class="g-big-msg">${esc(v.mine ? t('picked', { x: t(v.mine) }) : t('pick'))}</p>
                <div class="g-choices">${options.map(o => `<button type="button" class="g-choice" data-p="${o}" aria-pressed="${v.mine === o}">
                    <span class="g-emoji" aria-hidden="true">${PICTO[o]}</span>${esc(t(o))}</button>`).join('')}</div>`;
            }
            html += `<ul class="g-list">${v.players.map(id => `<li><span class="p-name">${esc(nameOf(id))}</span>
                <span class="g-right">${v.chosen.includes(id) ? `${icon('check')} ${esc(t('chose'))}` : esc(t('thinking')) + '…'}</span></li>`).join('')}</ul>`;
        } else if (v.last) {
            const anyPts = Object.values(v.last.pts).some(Boolean);
            html += `<p class="g-big-msg">${esc(t('reveal'))}</p>
            <div class="rps-reveal">${v.players.filter(id => v.last.picks[id]).map(id => `
                <div class="rps-card ${v.last.pts[id] ? 'won' : ''}">
                  <span class="g-emoji">${PICTO[v.last.picks[id]]}</span>
                  <span class="rps-who">${esc(nameOf(id))}${id === me ? ' ·' : ''}</span>
                  <span class="rps-pts">${v.last.pts[id] ? '+' + v.last.pts[id] : '0'}</span>
                  ${v.last.auto.includes(id) ? `<span class="p-mono">${esc(t('random'))}</span>` : ''}
                </div>`).join('')}</div>
            ${anyPts ? '' : `<p class="g-note">${esc(t('nobody'))}</p>`}`;
        }
        root.innerHTML = html;
        root.onclick = e => {
            const b = e.target.closest('button[data-p]');
            if (b) send({ pick: b.dataset.p });
        };
    },
};
