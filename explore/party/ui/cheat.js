import logic from '../logic/cheat.js';
import howto from '../howto/cheat.js';
import ai from '../ai/cheat.js';
import { playingCard, dealt } from '../client/cards.js';
import { tableHtml, seatPositions, backsFan, flyCards, remember, actionBubble } from '../client/table.js';

const BACK = playingCard(null);

const rankName = {
    en: { A: 'Aces', J: 'Jacks', Q: 'Queens', K: 'Kings' },
    fr: { A: 'As', J: 'Valets', Q: 'Dames', K: 'Rois' },
};
const nameOfRank = (r, lang) => rankName[lang][r] || (lang === 'fr' ? r : r + 's');

export default {
    logic,
    ai,
    privateInfo: true,
    title: { en: 'Bullshit', fr: 'Menteur' },
    icon: 'cheat',
    strings: {
        en: {
            'set.window': 'Challenge window', 'set.maxCards': 'Max cards per play', 'set.fullRanking': 'Play on for 2nd, 3rd…', 'set.games': 'Games', 'set.timer': 'Turn timer',
            'opt.maxCards.auto': 'Auto (4 or 8)', 'opt.maxCards.2': '2', 'opt.maxCards.3': '3', 'opt.maxCards.4': '4',
            gameOf: 'Game {n} of {m}', current: 'Rank to play', next: 'then {r}', pile: '{n} cards in the pile', claims: '{name} says {n} × {r}', takes: 'Takes {n}',
            callIt: 'Bullshit!', callAs: '{name}: Bullshit!', yourPlay: 'Your turn: pick 1 to {m} cards, announced as {r} ({rr})', play: 'Play {n} × {r}', waitTurn: '{name} is playing {r}',
            liar: '{name} lied and picks up {k} cards', truth: '{name} told the truth: {caller} picks up {k} cards', cards: '{n} cards', done: 'out',
            'cheat.count': 'Play between 1 and the maximum allowed', places: 'Places: {list}', youOut: 'You are out of cards.',
        },
        fr: {
            'set.window': 'Fenêtre de contestation', 'set.maxCards': 'Cartes max par coup', 'set.fullRanking': 'Continuer pour la 2e, 3e place…', 'set.games': 'Parties', 'set.timer': 'Temps par tour',
            'opt.maxCards.auto': 'Auto (4 ou 8)', 'opt.maxCards.2': '2', 'opt.maxCards.3': '3', 'opt.maxCards.4': '4',
            gameOf: 'Partie {n} sur {m}', current: 'Valeur à jouer', next: 'puis {r}', pile: '{n} cartes dans le tas', claims: '{name} annonce {n} × {r}', takes: 'Ramasse {n}',
            callIt: 'Menteur !', callAs: '{name} : Menteur !', yourPlay: 'À toi : choisis 1 à {m} cartes, annoncées comme {r} ({rr})', play: 'Poser {n} × {r}', waitTurn: '{name} joue des {r}',
            liar: '{name} a menti et ramasse {k} cartes', truth: '{name} disait vrai : {caller} ramasse {k} cartes', cards: '{n} cartes', done: 'fini',
            'cheat.count': 'Pose entre 1 et le maximum autorisé', places: 'Classement : {list}', youOut: 'Tu n\'as plus de cartes !',
        },
    },
    howto,

    status(v, api) { return api.t('gameOf', { n: v.game, m: v.games }); },
    turnOf: v => (v.phase === 'play' ? [v.turn] : []),

    render(root, v, api) {
        const { t, me, nameOf, esc, send, lang, isSeated } = api;
        const sig = `${v.game}:${v.phase}:${v.turn}:${v.mine ? v.mine.length : 0}`;
        if (root.dataset.sig !== sig) { root.dataset.sig = sig; root._sel = new Set(); }
        const sel = root._sel;
        const rn = r => nameOfRank(r, lang);
        const myTurn = v.phase === 'play' && v.turn === me;
        // The table: everyone around the felt, the pile and the rank to play in the middle
        const claimKey = v.claim ? `${v.claim.pid}:${v.pileCount}` : '';
        const newClaim = remember(root, 'claim', claimKey) !== claimKey && !!v.claim;
        const pos = seatPositions(v.order, me);
        const seats = v.order.map(id => {
            let bubble = '', bad = false;
            if (v.claim && v.claim.pid === id) bubble = `${v.claim.count} × ${v.claim.rank}`;
            if (v.reveal && v.reveal.caller === id) { bubble = esc(t('callIt')); bad = true; }
            return {
                id, name: nameOf(id), ...pos[id], me: id === me, turn: v.phase === 'play' && v.turn === id, out: v.finished.includes(id),
                sub: v.finished.includes(id) ? esc(t('done')) : esc(t('cards', { n: v.counts[id] })),
                extra: v.finished.includes(id) ? '' : backsFan(v.counts[id], BACK),
                action: v.reveal && v.reveal.loser === id ? actionBubble(root, `${v.game}:${v.reveal.caller}:${v.reveal.loser}:${v.pileCount}:${v.reveal.picked}`, esc(t('takes', { n: v.reveal.picked })), 'bad') : null,
                bubble, bubbleBad: bad, bubbleNew: bad ? remember(root, 'call', `${id}:${v.pileCount}`) !== `${id}:${v.pileCount}` : newClaim,
            };
        });
        const shown = Math.min(v.pileCount, 6);
        const pileCards = [...Array(shown)].map((_, i) => playingCard(null, { style: `--r:${((i * 37) % 23) - 11}deg;--x:${((i * 53) % 13) - 6}px` })).join('');
        let center = `<div class="ch-table"><div class="ch-rank"><span class="p-label">${esc(t('current'))}</span><b>${esc(v.rank)}</b><span class="p-mono">${esc(t('next', { r: v.nextRank }))}</span></div>
            <div class="ch-pile">${pileCards}<span class="ch-count">${v.pileCount}</span></div></div>`;
        if (v.phase === 'challenge' && v.claim) center += `<div class="ch-claim ${newClaim ? 'new' : ''}"><b>${v.claim.count}</b><span>×</span><b>${esc(v.claim.rank)}</b></div>`;
        let below = '';
        if (v.phase === 'challenge' && v.claim) {
            below += `<p class="g-big-msg">${esc(t('claims', { name: nameOf(v.claim.pid), n: v.claim.count, r: v.claim.rank }))}</p>`;
            if (api.local && api.mode === 'device') {
                // one shared screen: a button per player who may call
                const callers = api.humans.filter(id => id !== v.claim.pid && !v.finished.includes(id));
                below += `<div class="ch-callers">${callers.map(id => `<button type="button" class="p-btn primary ch-call" data-callas="${esc(id)}">${esc(t('callAs', { name: nameOf(id) }))}</button>`).join('')}</div>`;
            } else if (isSeated && v.claim.pid !== me && !v.finished.includes(me)) below += `<button type="button" class="p-btn primary big ch-call" data-call="1">${esc(t('callIt'))}</button>`;
        } else if (v.reveal) {
            const r = v.reveal;
            below += `<div class="ch-reveal">${r.cards.map((c, i) => playingCard(c.r + c.s, { cls: 'flip', style: `animation-delay:${i * 120}ms` })).join('')}</div>
                <p class="g-big-msg ${r.liar ? 'bad' : ''}">${esc(r.liar ? t('liar', { name: nameOf(r.pid), k: r.picked }) : t('truth', { name: nameOf(r.pid), caller: nameOf(r.caller), k: r.picked }))}</p>`;
        } else if (v.phase === 'play') {
            below += `<p class="g-note">${esc(myTurn ? t('yourPlay', { m: v.maxPlay, r: v.rank, rr: rn(v.rank) }) : t('waitTurn', { name: nameOf(v.turn), r: rn(v.rank) }))}</p>`;
        } else if (v.phase === 'gameEnd' && v.lastPlaces) {
            below += `<p class="g-big-msg">${esc(t('places', { list: v.lastPlaces.map((id, i) => `${i + 1}. ${nameOf(id)}`).join(' · ') }))}</p>`;
        }

        // New cards in the hand (the deal, or a picked-up pile) are dealt in one after another
        const isNew = dealt(root, 'ch', (v.mine || []).map(c => `${v.game}:${c.id}`));
        let k = 0;
        const hand = v.mine ? `<div class="ch-hand">${v.mine.map(c => `<button type="button" class="ch-card ${sel.has(c.id) ? 'sel' : ''}" data-id="${c.id}" ${myTurn ? '' : 'disabled'}>${playingCard(c.r + c.s, isNew(`${v.game}:${c.id}`) ? { cls: 'deal', style: `--d:${Math.min(k++, 12) * 60}ms` } : {})}</button>`).join('')}</div>
            ${myTurn ? `<button type="button" class="p-btn primary big" data-play="1" ${sel.size >= 1 && sel.size <= v.maxPlay ? '' : 'disabled'}>${esc(t('play', { n: sel.size, r: v.rank }))}</button>` : ''}
            ${!v.mine.length && v.phase !== 'gameEnd' ? `<p class="g-note">${esc(t('youOut'))}</p>` : ''}` : '';

        root.innerHTML = tableHtml({ seats, center, cls: 'ch-tb' }) + `<div class="ch-below">${below}</div>${hand}`;

        // Cards in motion: a play slides from the player to the pile, a picked-up pile goes to the loser
        const prevPile = remember(root, 'pile', v.pileCount);
        const table = root.querySelector('.tb'), pile = root.querySelector('.ch-pile');
        const seatOf = id => table.querySelector(`[data-seat="${id}"] .tb-avatar`);
        if (prevPile !== undefined && v.claim && v.pileCount > prevPile && newClaim) flyCards(table, seatOf(v.claim.pid), pile, { html: BACK, count: v.pileCount - prevPile });
        const revealKey = v.reveal ? `${v.reveal.pid}:${v.reveal.loser}:${v.reveal.picked}` : '';
        if (v.reveal && remember(root, 'reveal', revealKey) !== revealKey && prevPile !== undefined) flyCards(table, pile, seatOf(v.reveal.loser), { html: BACK, count: v.reveal.picked, stagger: 60 });
        root.onclick = e => {
            const c = e.target.closest('.ch-card');
            if (c && !c.disabled) {
                const id = Number(c.dataset.id);
                if (sel.has(id)) sel.delete(id); else if (sel.size < v.maxPlay) sel.add(id);
                this.render(root, v, api);
                return;
            }
            if (e.target.closest('[data-play]')) { send({ cards: [...sel] }); return; }
            if (e.target.closest('[data-call]')) send({ call: true });
            const as = e.target.closest('[data-callas]');
            if (as) api.sendAs(as.dataset.callas, { call: true });
        };
    },
};
