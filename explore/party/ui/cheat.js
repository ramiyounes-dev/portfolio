import logic from '../logic/cheat.js';
import howto from '../howto/cheat.js';
import ai from '../ai/cheat.js';
import { playingCard, dealt } from '../client/cards.js';

const rankName = {
    en: { A: 'Aces', J: 'Jacks', Q: 'Queens', K: 'Kings' },
    fr: { A: 'As', J: 'Valets', Q: 'Dames', K: 'Rois' },
};
const nameOfRank = (r, lang) => rankName[lang][r] || (lang === 'fr' ? r : r + 's');
const NUM = {
    en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'],
    fr: ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit'],
};

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
            gameOf: 'Game {n} of {m}', current: 'Rank to play', next: 'then {r}', pile: '{n} cards in the pile', claims: '{name}: "{n} {r}"',
            callIt: 'Bullshit!', callAs: '{name}: Bullshit!', yourPlay: 'Your turn: pick 1 to {m} cards and claim {r}', play: 'Play {n} as {r}', waitTurn: '{name} is playing {r}',
            liar: '{name} lied and picks up {k} cards', truth: '{name} told the truth: {caller} picks up {k} cards', cards: '{n} cards', done: 'out',
            'cheat.count': 'Play between 1 and the maximum allowed', places: 'Places: {list}', youOut: 'You are out of cards.',
        },
        fr: {
            'set.window': 'Fenêtre de contestation', 'set.maxCards': 'Cartes max par coup', 'set.fullRanking': 'Continuer pour la 2e, 3e place…', 'set.games': 'Parties', 'set.timer': 'Temps par tour',
            'opt.maxCards.auto': 'Auto (4 ou 8)', 'opt.maxCards.2': '2', 'opt.maxCards.3': '3', 'opt.maxCards.4': '4',
            gameOf: 'Partie {n} sur {m}', current: 'Valeur à jouer', next: 'puis {r}', pile: '{n} cartes dans le tas', claims: '{name} : « {n} {r} »',
            callIt: 'Menteur !', callAs: '{name} : Menteur !', yourPlay: 'À toi : choisis 1 à {m} cartes et annonce {r}', play: 'Poser {n} en {r}', waitTurn: '{name} joue des {r}',
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
        const seats = v.order.map(id => `<div class="uno-seat ${v.turn === id && v.phase === 'play' ? 'turn' : ''} ${id === me ? 'me' : ''}"><span class="p-name">${esc(nameOf(id))}</span>
            <span class="p-mono">${v.finished.includes(id) ? esc(t('done')) : esc(t('cards', { n: v.counts[id] }))}</span></div>`).join('');

        // The pile: face-down cards stacked a little untidily; cards just played slide onto it
        const grew = root._chPile !== undefined && v.pileCount > root._chPile;
        root._chPile = v.pileCount;
        const shown = Math.min(v.pileCount, 6);
        const pileCards = [...Array(shown)].map((_, i) => playingCard(null, { cls: grew && i >= shown - Math.min(shown, v.claim ? v.claim.count : 1) ? 'played' : '', style: `--r:${((i * 37) % 23) - 11}deg;--x:${((i * 53) % 13) - 6}px` })).join('');
        let center = `<div class="ch-table"><div class="ch-rank"><span class="p-label">${esc(t('current'))}</span><b>${esc(v.rank)}</b><span class="p-mono">${esc(t('next', { r: v.nextRank }))}</span></div>
            <div class="ch-pile">${pileCards}</div></div>
            <p class="p-mono center">${esc(t('pile', { n: v.pileCount }))}</p>`;
        if (v.phase === 'challenge' && v.claim) {
            center += `<p class="g-big-msg">${esc(t('claims', { name: nameOf(v.claim.pid), n: NUM[lang][v.claim.count] || v.claim.count, r: rn(v.claim.rank) }))}</p>`;
            if (api.local && api.mode === 'device') {
                // one shared screen: a button per player who may call
                const callers = api.humans.filter(id => id !== v.claim.pid && !v.finished.includes(id));
                center += `<div class="ch-callers">${callers.map(id => `<button type="button" class="p-btn primary ch-call" data-callas="${esc(id)}">${esc(t('callAs', { name: nameOf(id) }))}</button>`).join('')}</div>`;
            } else if (isSeated && v.claim.pid !== me && !v.finished.includes(me)) center += `<button type="button" class="p-btn primary big ch-call" data-call="1">${esc(t('callIt'))}</button>`;
        } else if (v.reveal) {
            const r = v.reveal;
            center += `<div class="ch-reveal">${r.cards.map((c, i) => playingCard(c.r + c.s, { cls: 'flip', style: `animation-delay:${i * 120}ms` })).join('')}</div>
                <p class="g-big-msg ${r.liar ? 'bad' : ''}">${esc(r.liar ? t('liar', { name: nameOf(r.pid), k: r.picked }) : t('truth', { name: nameOf(r.pid), caller: nameOf(r.caller), k: r.picked }))}</p>`;
        } else if (v.phase === 'play') {
            center += `<p class="g-note">${esc(myTurn ? t('yourPlay', { m: v.maxPlay, r: rn(v.rank) }) : t('waitTurn', { name: nameOf(v.turn), r: rn(v.rank) }))}</p>`;
        } else if (v.phase === 'gameEnd' && v.lastPlaces) {
            center += `<p class="g-big-msg">${esc(t('places', { list: v.lastPlaces.map((id, i) => `${i + 1}. ${nameOf(id)}`).join(' · ') }))}</p>`;
        }

        // New cards in the hand (the deal, or a picked-up pile) are dealt in one after another
        const isNew = dealt(root, 'ch', (v.mine || []).map(c => `${v.game}:${c.id}`));
        let k = 0;
        const hand = v.mine ? `<div class="ch-hand">${v.mine.map(c => `<button type="button" class="ch-card ${sel.has(c.id) ? 'sel' : ''}" data-id="${c.id}" ${myTurn ? '' : 'disabled'}>${playingCard(c.r + c.s, isNew(`${v.game}:${c.id}`) ? { cls: 'deal', style: `--d:${Math.min(k++, 12) * 60}ms` } : {})}</button>`).join('')}</div>
            ${myTurn ? `<button type="button" class="p-btn primary big" data-play="1" ${sel.size >= 1 && sel.size <= v.maxPlay ? '' : 'disabled'}>${esc(t('play', { n: sel.size, r: rn(v.rank) }))}</button>` : ''}
            ${!v.mine.length && v.phase !== 'gameEnd' ? `<p class="g-note">${esc(t('youOut'))}</p>` : ''}` : '';

        root.innerHTML = `<div class="uno-seats">${seats}</div><div class="ch-center">${center}</div>${hand}`;
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
