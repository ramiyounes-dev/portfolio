import logic, { COLORS } from '../logic/uno.js';
import howto from '../howto/uno.js';
import ai from '../ai/uno.js';
import { icon } from '../client/icons.js';
import { dealt } from '../client/cards.js';

const LABEL = { S: icon('skip'), R: icon('reverse'), D: '+2', W: icon('wild'), W4: '+4' };
const COLORNAME = { R: 'red', Y: 'yellow', G: 'green', B: 'blue' };

function unoCard(c, { playable = false, small = false, id = null, anim = '', style = '' } = {}) {
    const wild = c.v === 'W' || c.v === 'W4';
    const cls = `uno-card ${c.c ? 'uc-' + c.c : 'uc-wild'} ${wild ? 'wild' : ''} ${playable ? 'ok' : ''} ${small ? 'sm' : ''} ${anim}`;
    const face = LABEL[c.v] || c.v;
    return `<button type="button" class="${cls}" ${id !== null ? `data-id="${id}"` : ''} ${playable ? '' : 'disabled'}${style ? ` style="${style}"` : ''}><span class="uc-frame"></span><span class="uc-oval"><b>${face}</b></span><i>${face}</i><i class="br">${face}</i></button>`;
}

export default {
    logic,
    ai,
    privateInfo: true,
    title: { en: 'UNO', fr: 'UNO' },
    icon: 'uno',
    strings: {
        en: {
            'set.target': 'Play to', 'set.stacking': 'Stacking (house rule)', 'set.challenge': 'Wild Draw Four challenge', 'set.timer': 'Turn timer',
            'opt.target.100': '100', 'opt.target.200': '200', 'opt.target.300': '300', 'opt.target.500': '500', 'opt.target.single': 'One hand',
            handN: 'Hand {n} · to {t}', handSingle: 'Hand {n} · one hand', draw: 'Draw', pass: 'Keep it', uno: 'UNO!', catch: 'Catch {name}!',
            pickColor: 'Pick a colour', red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Blue', yourTurn: 'Your turn', drawnPlay: 'You drew a playable card: play it or keep it',
            challengeQ: '{name} played Wild Draw Four. Challenge?', challenge: 'Challenge', accept: 'Take 4', stackQ: '+{n} coming: stack a matching card or draw',
            cards: '{n} cards', oneCard: '1 card', 'uno.pickColor': 'Choose a colour first',
            'log.play': '{p} played', 'log.drew': '{p} drew {n}', 'log.uno': '{p}: UNO!', 'log.caught': '{by} caught {p}: +2', 'log.guilty': '{by} challenged: {p} was guilty, +4',
            'log.innocent': '{by} challenged: {p} was innocent, +6 to {by}', handWon: '{name} wins the hand: +{n}', pile: 'Pile',
        },
        fr: {
            'set.target': 'Jouer jusqu\'à', 'set.stacking': 'Cumul (règle maison)', 'set.challenge': 'Contestation du +4', 'set.timer': 'Temps par tour',
            'opt.target.100': '100', 'opt.target.200': '200', 'opt.target.300': '300', 'opt.target.500': '500', 'opt.target.single': 'Une manche',
            handN: 'Manche {n} · jusqu\'à {t}', handSingle: 'Manche {n} · une seule manche', draw: 'Piocher', pass: 'La garder', uno: 'UNO !', catch: 'Contre-UNO {name} !',
            pickColor: 'Choisis une couleur', red: 'Rouge', yellow: 'Jaune', green: 'Vert', blue: 'Bleu', yourTurn: 'À toi', drawnPlay: 'Tu as pioché une carte jouable : joue-la ou garde-la',
            challengeQ: '{name} a joué un +4. Contester ?', challenge: 'Contester', accept: 'Piocher 4', stackQ: '+{n} arrive : pose une carte identique ou pioche',
            cards: '{n} cartes', oneCard: '1 carte', 'uno.pickColor': 'Choisis d\'abord une couleur',
            'log.play': '{p} a joué', 'log.drew': '{p} pioche {n}', 'log.uno': '{p} : UNO !', 'log.caught': '{by} a pris {p} : +2', 'log.guilty': '{by} conteste : {p} bluffait, +4',
            'log.innocent': '{by} conteste : {p} était en règle, +6 pour {by}', handWon: '{name} gagne la manche : +{n}', pile: 'Pioche',
        },
    },
    howto,

    status(v, api) {
        const { t } = api;
        return v.target === 'single' ? t('handSingle', { n: v.hand }) : t('handN', { n: v.hand, t: v.target });
    },
    scores: v => v.scores,
    turnOf: v => (v.turn ? [v.turn] : []),

    render(root, v, api) {
        const { t, me, nameOf, esc, send, isSeated } = api;
        const myTurn = v.turn === me;
        const logLine = e => {
            const p = nameOf(e.p), by = e.by ? nameOf(e.by) : '';
            if (e.k === 'play') return `${esc(t('log.play', { p }))} ${unoCard(e.card, { small: true })}`;
            return esc(t('log.' + e.k, { p, by, n: e.n }));
        };
        const seats = v.order.map(id => {
            const n = v.counts[id];
            const catchBtn = v.vulnerable === id && id !== me && isSeated ? `<button type="button" class="p-btn small danger" data-catch="${id}">${esc(t('catch', { name: nameOf(id) }))}</button>` : '';
            return `<div class="uno-seat ${v.turn === id ? 'turn' : ''} ${id === me ? 'me' : ''}"><span class="p-name">${esc(nameOf(id))}</span>
                <span class="p-mono">${n === 1 ? esc(t('oneCard')) : esc(t('cards', { n }))}${v.unoSafe[id] && n === 1 ? ' · UNO' : ''}</span>${catchBtn}</div>`;
        }).join('');

        let action = '';
        if (v.result) {
            action = `<p class="g-big-msg">${esc(t('handWon', { name: nameOf(v.result.winner), n: v.result.pts }))}</p>`;
        } else if (myTurn && v.needColor) {
            action = `<p class="g-big-msg">${esc(t('pickColor'))}</p>${picker('setColor')}`;
        } else if (myTurn && v.phase === 'challenge') {
            const offender = v.log.length ? v.log[v.log.length - 1].p : null;
            action = `<p class="g-big-msg">${esc(t('challengeQ', { name: nameOf(offender) }))}</p>
                <div class="p-row"><button type="button" class="p-btn primary" data-chal="1">${esc(t('challenge'))}</button><button type="button" class="p-btn" data-acc="1">${esc(t('accept'))}</button></div>`;
        } else if (myTurn) {
            action = `<p class="g-note">${esc(v.drawn !== null ? t('drawnPlay') : v.pendingDraw ? t('stackQ', { n: v.pendingDraw }) : t('yourTurn'))}</p>
                <div class="p-row">${v.drawn !== null ? `<button type="button" class="p-btn" data-pass="1">${esc(t('pass'))}</button>` : `<button type="button" class="p-btn" data-draw="1">${esc(t('draw'))}${v.pendingDraw ? ` +${v.pendingDraw}` : ''}</button>`}</div>`;
        }
        const canUno = v.mine && ((v.mine.length === 2 && myTurn) || (v.mine.length === 1 && v.vulnerable === me));
        // Only new cards animate: drawn cards slide into the hand, a freshly played card lands on the pile
        const isNew = dealt(root, 'uno', (v.mine || []).map(c => String(c.id)));
        const topKey = `${v.top.id}:${v.color}`;
        const played = root._unoTop !== undefined && root._unoTop !== topKey;
        root._unoTop = topKey;
        let k = 0;
        const hand = v.mine ? `<div class="uno-hand">${v.mine.map(c => unoCard(c, { playable: v.playable.includes(c.id), id: c.id, ...(isNew(String(c.id)) ? { anim: 'deal', style: `--d:${Math.min(k++, 8) * 80}ms` } : {}) })).join('')}</div>
            <button type="button" class="p-btn uno-btn ${canUno ? 'primary' : ''}" data-uno="1" ${canUno ? '' : 'disabled'}>${esc(t('uno'))}</button>` : '';
        const revealed = v.result ? Object.entries(v.result.hands).filter(([id]) => id !== v.result.winner && v.result.hands[id].length)
            .map(([id, cards]) => `<div class="uno-reveal"><span class="p-mono">${esc(nameOf(id))}</span><div class="uno-row">${cards.map(c => unoCard(c, { small: true })).join('')}</div></div>`).join('') : '';

        root.innerHTML = `<div class="uno-seats">${seats}</div>
            <div class="uno-table">
              <div class="uno-pile"><span class="uno-back"><span class="uc-frame"></span><span class="uc-oval"></span></span><span class="p-mono">${esc(t('pile'))} · ${v.pileCount}</span></div>
              <div class="uno-top">${unoCard(v.top, { anim: played ? 'played' : '' })}<span class="uno-color uc-${v.color}" title="${esc(t(COLORNAME[v.color] || 'red'))}"></span></div>
              <span class="uno-dir">${v.dir === 1 ? icon('cw') : icon('ccw')}</span>
            </div>
            ${action}${hand}${revealed}
            <ul class="uno-log">${v.log.slice().reverse().map(e => `<li>${logLine(e)}</li>`).join('')}</ul>
            <div class="uno-sheet hidden"><p class="g-big-msg">${esc(t('pickColor'))}</p>${picker('wild')}<button type="button" class="text-link" data-cancel="1">✕</button></div>`;

        function picker(kind) {
            return `<div class="uno-picker" data-kind="${kind}">${COLORS.map(c => `<button type="button" class="uno-pick uc-${c}" data-color="${c}">${esc(t(COLORNAME[c]))}</button>`).join('')}</div>`;
        }

        root.onclick = e => {
            const card = e.target.closest('.uno-hand .uno-card');
            if (card && !card.disabled) {
                const c = v.mine.find(x => x.id === Number(card.dataset.id));
                if (c.v === 'W' || c.v === 'W4') { root._wild = c.id; root.querySelector('.uno-sheet').classList.remove('hidden'); }
                else send({ card: c.id });
                return;
            }
            const pick = e.target.closest('[data-color]');
            if (pick) {
                const kind = pick.closest('.uno-picker').dataset.kind;
                if (kind === 'wild') send({ card: root._wild, color: pick.dataset.color });
                else send({ color: pick.dataset.color });
                return;
            }
            if (e.target.closest('[data-cancel]')) { root.querySelector('.uno-sheet').classList.add('hidden'); return; }
            if (e.target.closest('[data-draw]')) return send({ draw: true });
            if (e.target.closest('[data-pass]')) return send({ pass: true });
            if (e.target.closest('[data-uno]')) return send({ uno: true });
            if (e.target.closest('[data-chal]')) return send({ challenge: true });
            if (e.target.closest('[data-acc]')) return send({ accept: true });
            const c = e.target.closest('[data-catch]');
            if (c) send({ catch: c.dataset.catch });
        };
    },
};
