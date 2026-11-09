import logic from '../logic/dilemma.js';
import howto from '../howto/dilemma.js';
import ai from '../ai/dilemma.js';

import { icon } from '../client/icons.js';

const ICON = { C: icon('handshake'), B: icon('dagger') };
const QUICK = ['q.deal', 'q.trust', 'q.promise', 'q.sorry', 'q.watch', 'q.hmm'];

export default {
    logic,
    ai,
    privateInfo: true,
    title: { en: 'Prisoner\'s Dilemma', fr: 'Dilemme du prisonnier' },
    icon: 'dilemma',
    strings: {
        en: {
            'set.rounds': 'Rounds', 'set.hideRounds': 'Hide round count', 'set.chat': 'Partner chat', 'set.timer': 'Choice timer',
            coop: 'Cooperate', betray: 'Betray', partner: 'This round you face {name}', bye: 'You sit out this round: +2',
            locked: 'Your choice is locked in. Waiting for the reveal.', roundOf: 'Round {n} of {m}', roundN: 'Round {n}',
            say: 'Message your partner', send: 'Send', reveal: 'Reveal', history: 'History', chose: 'chose', thinking: 'thinking',
            byeRow: '{name} sat out: +2', random: 'random', 'pd.coopNote': 'Totals, with how often each player cooperated',
            'q.deal': 'Deal?', 'q.trust': 'Trust me', 'q.promise': 'I promise', 'q.sorry': 'Sorry', 'q.watch': 'Watch out', 'q.hmm': 'Hmm...',
            payoffs: 'Both cooperate: 3 each · Both betray: 1 each · Betray a cooperator: 5 vs 0',
        },
        fr: {
            'set.rounds': 'Manches', 'set.hideRounds': 'Cacher le nombre de manches', 'set.chat': 'Discussion entre partenaires', 'set.timer': 'Temps de choix',
            coop: 'Coopérer', betray: 'Trahir', partner: 'Cette manche, tu affrontes {name}', bye: 'Tu es exempté cette manche : +2',
            locked: 'Ton choix est verrouillé. En attente de la révélation.', roundOf: 'Manche {n} sur {m}', roundN: 'Manche {n}',
            say: 'Écris à ton partenaire', send: 'Envoyer', reveal: 'Révélation', history: 'Historique', chose: 'a choisi', thinking: 'réfléchit',
            byeRow: '{name} était exempté : +2', random: 'au hasard', 'pd.coopNote': 'Totaux, avec la part de coopération de chacun',
            'q.deal': 'Marché conclu ?', 'q.trust': 'Fais-moi confiance', 'q.promise': 'Promis', 'q.sorry': 'Désolé', 'q.watch': 'Méfie-toi', 'q.hmm': 'Hum...',
            payoffs: 'Les deux coopèrent : 3 chacun · Les deux trahissent : 1 chacun · Trahir un coopérant : 5 contre 0',
        },
    },
    howto,

    status(v, api) {
        const { t } = api;
        return v.rounds ? t('roundOf', { n: v.round, m: v.rounds }) : t('roundN', { n: v.round });
    },
    turnOf: v => (v.phase === 'choose' ? v.pairs.flat().filter(id => !v.chosen.includes(id)) : []),

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const key = `${v.round}:${v.phase}`;
        if (root.dataset.key !== key) {
            root.dataset.key = key;
            root.innerHTML = `<div class="pd-top"></div><div class="pd-chat hidden"><ul class="pd-log"></ul>
                <div class="pd-quick">${QUICK.map(q => `<button type="button" class="p-btn small" data-q="${esc(t(q))}">${esc(t(q))}</button>`).join('')}</div>
                <form class="pd-say"><input class="p-input" maxlength="80" autocomplete="off"><button class="p-btn" type="submit"></button></form></div>
                <div class="pd-choices"></div><div class="pd-board"></div><div class="pd-history"></div>`;
            const form = root.querySelector('.pd-say');
            form.onsubmit = e => { e.preventDefault(); const i = form.querySelector('input'); if (i.value.trim()) send({ type: 'say', text: i.value }); i.value = ''; };
            root.querySelector('.pd-quick').onclick = e => { const b = e.target.closest('button[data-q]'); if (b) send({ type: 'say', text: b.dataset.q }); };
            root.querySelector('.pd-choices').onclick = e => { const b = e.target.closest('button[data-c]'); if (b) send({ choice: b.dataset.c }); };
        }
        const $ = sel => root.querySelector(sel);
        $('.pd-say input').placeholder = t('say');
        $('.pd-say button').textContent = t('send');

        const choosing = v.phase === 'choose' && v.partner;
        $('.pd-top').innerHTML = v.phase === 'choose'
            ? `<p class="g-big-msg">${esc(v.partner ? t('partner', { name: nameOf(v.partner) }) : v.bye === me ? t('bye') : '')}</p><p class="g-note">${esc(t('payoffs'))}</p>`
            : `<p class="g-big-msg">${esc(t('reveal'))}</p>`;

        $('.pd-chat').classList.toggle('hidden', !(choosing && v.chatOn));
        $('.pd-log').innerHTML = v.chat.map(m => `<li class="${m.from === me ? 'me' : ''}"><b>${esc(nameOf(m.from))}</b> ${esc(m.text)}</li>`).join('');
        const log = $('.pd-log'); log.scrollTop = log.scrollHeight;

        $('.pd-choices').innerHTML = choosing ? (v.mine ? `<p class="g-note">${esc(t('locked'))} ${ICON[v.mine]}</p>` : '') +
            `<div class="g-choices pd-two">
               <button type="button" class="g-choice" data-c="C" aria-pressed="${v.mine === 'C'}" ${v.mine ? 'disabled' : ''}><span class="g-emoji">${ICON.C}</span>${esc(t('coop'))}</button>
               <button type="button" class="g-choice" data-c="B" aria-pressed="${v.mine === 'B'}" ${v.mine ? 'disabled' : ''}><span class="g-emoji">${ICON.B}</span>${esc(t('betray'))}</button></div>` : '';

        if (v.phase === 'choose') {
            $('.pd-board').innerHTML = `<ul class="g-list">${v.pairs.map(([a, b]) => `<li><span class="p-name">${esc(nameOf(a))}</span><span class="p-mono">${v.chosen.includes(a) ? icon('check') : '…'}</span>
                <span class="p-mono">vs</span><span class="p-mono">${v.chosen.includes(b) ? icon('check') : '…'}</span><span class="p-name">${esc(nameOf(b))}</span></li>`).join('')}</ul>`;
        } else if (v.last) {
            $('.pd-board').innerHTML = pairsTable(v.last, api, true);
        }
        const past = v.history.filter(h => !v.last || h.round !== v.last.round).slice().reverse();
        $('.pd-history').innerHTML = past.length ? `<h3 class="p-label">${esc(t('history'))}</h3>${past.map(h => `<div class="pd-hrow"><span class="p-mono">#${h.round}</span>${pairsTable(h, api, false)}</div>`).join('')}` : '';
    },
};

function pairsTable(round, api, big) {
    const { t, nameOf, esc } = api;
    const rows = round.rows.map(r => `<li class="${big ? 'big' : ''}">
        <span class="p-name">${esc(nameOf(r.a))}</span><span class="pd-ic">${ICON[r.ca]}</span><span class="pd-pts">${r.pa}</span>
        <span class="p-mono">:</span><span class="pd-pts">${r.pb}</span><span class="pd-ic">${ICON[r.cb]}</span><span class="p-name">${esc(nameOf(r.b))}</span></li>`).join('');
    const bye = round.bye ? `<li class="${big ? 'big' : ''}"><span class="p-mono">${esc(t('byeRow', { name: nameOf(round.bye) }))}</span></li>` : '';
    return `<ul class="g-list pd-rows">${rows}${bye}</ul>`;
}
