import logic, { rankOf } from '../logic/blackjack.js';
import howto from '../howto/blackjack.js';
import ai from '../ai/blackjack.js';
import { playingCard, dealt } from '../client/cards.js';

const CHIPS = [10, 25, 50, 100, 250];
const chip = (value, cls = '') => `<span class="bj-chip c${value} ${cls}"><span>${value}</span></span>`;
/** An amount shown as a small stack of chips, biggest at the bottom (at most 8 drawn). */
function chipStack(amount, fresh = false) {
    const out = [];
    let left = amount;
    for (const c of [...CHIPS].reverse()) while (left >= c && out.length < 8) { out.push(c); left -= c; }
    if (!out.length) return '';
    return `<span class="bj-stack">${out.map((c, i) => `<span class="bj-chip mini c${c} ${fresh && i === out.length - 1 ? 'toss' : ''}" style="--i:${i}"></span>`).join('')}<b>${amount}</b></span>`;
}

export default {
    logic,
    ai,
    title: { en: 'Blackjack', fr: 'Vingt-et-un' },
    icon: 'blackjack',
    strings: {
        en: {
            'set.rounds': 'Rounds', 'set.start': 'Starting chips', 'set.rebuys': 'Rebuys', 'set.soft17': 'Dealer on soft 17', 'set.timer': 'Turn timer',
            'opt.start.500': '500', 'opt.start.1000': '1,000', 'opt.start.2000': '2,000', 'opt.soft17.stand': 'Stands', 'opt.soft17.hit': 'Hits',
            roundOf: 'Round {n} of {m}', dealer: 'Dealer', placeBet: 'Place your bet', bet: 'Bet {n}', allIn: 'All in', clear: 'Clear', stack: 'Stack {n}',
            betPlaced: 'Bet placed: {n}. Waiting for the table.', hit: 'Hit', stand: 'Stand', double: 'Double', split: 'Split', yourMove: 'Your move',
            win: 'Win', blackjack: 'Blackjack!', push: 'Push', lose: 'Lose', bust: 'Bust', broke: 'Out of chips', rebuy: 'Rebuy',
            reshuffled: 'New shoe shuffled', 'bj.badBet': 'Bet at least 10, up to your stack', waitingBet: 'betting…',
        },
        fr: {
            'set.rounds': 'Manches', 'set.start': 'Jetons de départ', 'set.rebuys': 'Recaves', 'set.soft17': 'Croupier sur 17 souple', 'set.timer': 'Temps par tour',
            'opt.start.500': '500', 'opt.start.1000': '1 000', 'opt.start.2000': '2 000', 'opt.soft17.stand': 'Reste', 'opt.soft17.hit': 'Tire',
            roundOf: 'Manche {n} sur {m}', dealer: 'Croupier', placeBet: 'Place ta mise', bet: 'Miser {n}', allIn: 'Tapis', clear: 'Effacer', stack: 'Tapis {n}',
            betPlaced: 'Mise placée : {n}. On attend la table.', hit: 'Carte', stand: 'Rester', double: 'Doubler', split: 'Séparer', yourMove: 'À toi',
            win: 'Gagné', blackjack: 'Blackjack !', push: 'Égalité', lose: 'Perdu', bust: 'Sauté', broke: 'Plus de jetons', rebuy: 'Se recaver',
            reshuffled: 'Nouveau sabot mélangé', 'bj.badBet': 'Mise d\'au moins 10, dans la limite de ton tapis', waitingBet: 'mise…',
        },
    },
    howto,

    status(v, api) { return api.t('roundOf', { n: v.round, m: v.rounds }); },
    turnOf(v) { if (v.phase === 'bet') return v.players.filter(id => !v.bets[id] && v.chips[id] >= v.minBet); return v.turn ? [v.turn.id] : []; },

    render(root, v, api) {
        const { t, me, nameOf, esc, send, isSeated } = api;
        if (root.dataset.key !== `${v.round}:${v.phase}`) { root.dataset.key = `${v.round}:${v.phase}`; root._bet = 0; }
        // Only cards that were not on the table last time are dealt in; a hole card turning face up flips
        const keys = [...v.dealer.map((c, i) => `${v.round}:d${i}:${c || 'x'}`)];
        for (const id of v.players) (v.hands[id] || []).forEach((h, hi) => h.cards.forEach((c, i) => keys.push(`${v.round}:${id}:${hi}:${i}:${c}`)));
        const isNew = dealt(root, 'bj', keys);
        let order = 0;
        const anim = key => (isNew(key) ? { cls: 'deal', style: `--d:${order++ * 140}ms` } : {});
        const dealerCards = v.dealer.map((c, i) => {
            const key = `${v.round}:d${i}:${c || 'x'}`;
            const wasHidden = c && root._dealt.bjHole === `${v.round}:d${i}`;
            return playingCard(c, wasHidden ? { cls: 'flip' } : anim(key));
        }).join('');
        const hole = v.dealer.findIndex(c => !c);
        root._dealt.bjHole = hole >= 0 ? `${v.round}:d${hole}` : null;
        const dealer = `<div class="bj-dealer"><span class="p-label">${esc(t('dealer'))}${v.dealerValue ? ` · ${v.dealerValue.total}` : ''}</span><div class="bj-cards">${dealerCards}</div></div>`;
        let mine = '';
        if (v.phase === 'bet' && isSeated) {
            const stack = v.chips[me];
            if (v.bets[me]) mine = `<p class="g-note">${esc(t('betPlaced', { n: v.bets[me] }))}</p>`;
            else if (stack < v.minBet) mine = `<p class="g-note">${esc(t('broke'))}</p>${v.rebuys ? `<button type="button" class="p-btn primary" data-rebuy="1">${esc(t('rebuy'))}</button>` : ''}`;
            else mine = `<p class="g-big-msg">${esc(t('placeBet'))}</p><p class="p-mono center">${esc(t('stack', { n: stack }))}</p>
                <div class="bj-betzone">${chipStack(root._bet || 0, root._tossed)}</div>
                <div class="bj-chips">${CHIPS.filter(c => c <= stack).map(c => `<button type="button" class="bj-chip-btn" data-chip="${c}" aria-label="${c}">${chip(c)}</button>`).join('')}
                <button type="button" class="p-btn small" data-all="1">${esc(t('allIn'))}</button></div>
                <div class="p-row"><button type="button" class="p-btn" data-clear="1">${esc(t('clear'))}</button>
                <button type="button" class="p-btn primary" data-bet="1" ${root._bet >= v.minBet ? '' : 'disabled'}>${esc(t('bet', { n: root._bet || 0 }))}</button></div>`;
        }
        const myTurn = v.phase === 'play' && v.turn && v.turn.id === me;
        if (myTurn) {
            const hand = v.hands[me][v.turn.h];
            const first = hand.cards.length === 2;
            const canSplit = first && rankOf(hand.cards[0]) === rankOf(hand.cards[1]) && v.chips[me] >= hand.bet && v.hands[me].length < 4;
            const canDouble = first && v.chips[me] >= hand.bet;
            mine = `<p class="g-big-msg">${esc(t('yourMove'))}</p><div class="bj-actions">
                <button type="button" class="p-btn primary" data-m="hit">${esc(t('hit'))}</button><button type="button" class="p-btn" data-m="stand">${esc(t('stand'))}</button>
                <button type="button" class="p-btn" data-m="double" ${canDouble ? '' : 'disabled'}>${esc(t('double'))}</button><button type="button" class="p-btn" data-m="split" ${canSplit ? '' : 'disabled'}>${esc(t('split'))}</button></div>`;
        }
        const seats = v.players.map(id => {
            const hands = v.hands[id] || [];
            const res = v.results && v.results[id];
            const handsHtml = hands.map((h, i) => {
                const r = res && res[i];
                const live = v.turn && v.turn.id === id && v.turn.h === i;
                return `<div class="bj-hand ${live ? 'live' : ''}"><div class="bj-cards fan">${h.cards.map((c, ci) => playingCard(c, { small: true, ...anim(`${v.round}:${id}:${i}:${ci}:${c}`) })).join('')}</div>
                    <span class="bj-line"><span class="p-mono">${h.value.total}${h.value.soft && h.value.total < 21 ? 's' : ''}</span>${chipStack(h.bet)}</span>
                    ${r ? `<span class="bj-res ${r.out}">${esc(t(r.out))} ${r.net > 0 ? '+' + r.net : r.net < 0 ? r.net : ''}</span>` : ''}</div>`;
            }).join('');
            return `<div class="bj-seat ${id === me ? 'me' : ''}"><div class="bj-seat-head"><span class="p-name">${esc(nameOf(id))}</span><span class="p-mono bj-bank">${v.chips[id]}</span></div>
                ${handsHtml || (v.phase === 'bet' && v.bets[id] ? chipStack(v.bets[id]) : `<span class="p-mono">${v.phase === 'bet' ? esc(t('waitingBet')) : ''}</span>`)}</div>`;
        }).join('');
        root._tossed = false;
        root.innerHTML = `${dealer}${v.reshuffled && v.phase === 'bet' ? `<p class="g-note">${esc(t('reshuffled'))}</p>` : ''}${mine}<div class="bj-seats">${seats}</div>`;
        root.onclick = e => {
            const chip = e.target.closest('[data-chip]');
            if (chip) { root._bet = Math.min(v.chips[me], (root._bet || 0) + Number(chip.dataset.chip)); root._tossed = true; this.render(root, v, api); return; }
            if (e.target.closest('[data-all]')) { root._bet = v.chips[me]; this.render(root, v, api); return; }
            if (e.target.closest('[data-clear]')) { root._bet = 0; this.render(root, v, api); return; }
            if (e.target.closest('[data-bet]')) { send({ bet: root._bet }); return; }
            if (e.target.closest('[data-rebuy]')) { send({ rebuy: true }); return; }
            const m = e.target.closest('[data-m]');
            if (m && !m.disabled) send({ move: m.dataset.m });
        };
    },
};
