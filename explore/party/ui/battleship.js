import logic, { FLEET, N, cellsOf, randomFleet, validFleet } from '../logic/battleship.js';
import howto from '../howto/battleship.js';
import ai from '../ai/battleship.js';
import { icon } from '../client/icons.js';
import { shipSvg } from '../client/ships.js';
import { makeRng } from '../core/rng.js';

const rng = makeRng();
const sizeOf = type => FLEET.find(f => f.type === type).size;
const shipCells = fleet => {
    const m = new Map();
    for (const s of fleet || []) for (const c of cellsOf({ ...s, size: sizeOf(s.type) })) m.set(c, s.type);
    return m;
};

/** One ship drawn over its squares (the squares under it stay clickable). */
const shipLayer = (sh, state) => {
    const len = sizeOf(sh.type), h = sh.dir === 'h';
    const area = `${sh.r + 1} / ${sh.c + 1} / span ${h ? 1 : len} / span ${h ? len : 1}`;
    return shipSvg(sh.type, len, sh.dir, { state, attrs: ` style="grid-area:${area}"` });
};

function grid({ cls = '', shots = null, fleet = null, sunk = [], clickable = false, last = null, sel = null }) {
    const ships = fleet ? shipCells(fleet) : null;
    const sunkTypes = new Set(sunk.map(s => s.type));
    const sunkCells = new Set(sunk.flatMap(s => cellsOf({ ...s, size: sizeOf(s.type) })));
    let html = `<div class="bs-grid ${cls}">`;
    for (let i = 0; i < N * N; i++) {
        const shot = shots ? shots[i] : null;
        const ship = ships ? ships.get(i) : null;
        const classes = ['bs-cell'];
        if (ship) classes.push('has-ship');
        if (sunkCells.has(i)) classes.push('sunk');
        if (shot === 'h') classes.push('hit');
        if (shot === 'm') classes.push('miss');
        if (last === i) classes.push('last');
        const can = clickable && !shot;
        if (can) classes.push('can');
        html += `<button type="button" class="${classes.join(' ')}" style="grid-area:${Math.floor(i / N) + 1} / ${i % N + 1}" data-i="${i}" ${can ? '' : 'disabled'} aria-label="${'ABCDEFGHIJ'[i % N]}${Math.floor(i / N) + 1}"></button>`;
    }
    // Ships: the whole fleet when it is known, otherwise only the ships already sunk
    for (const sh of fleet || []) html += shipLayer(sh, sunkTypes.has(sh.type) ? 'sunk' : sh.type === sel ? 'sel' : '');
    if (!fleet) for (const sh of sunk) html += shipLayer(sh, 'sunk');
    return html + '</div>';
}

export default {
    logic,
    ai,
    privateInfo: true,
    title: { en: 'Battleship', fr: 'Bataille navale' },
    icon: 'battleship',
    strings: {
        en: {
            'set.timer': 'Turn timer', 'set.queueMode': 'Queue',
            'opt.queueMode.winner': 'Winner stays', 'opt.queueMode.rotate': 'Rotate both',
            placeTitle: 'Place your fleet', placeHint: 'Pick a ship, then tap where it starts. Rotate turns it.', rotate: 'Rotate', random: 'Random', ready: 'Ready',
            waitingFoe: 'Ready. Waiting for {name}', foeReady: '{name} is ready', yourShots: 'Your shots on {name}', yourFleet: 'Your fleet',
            shotsOf: '{name}\'s shots', fire: 'Your turn: tap a square to fire', miss: '{name}: miss', hit: '{name}: hit!', sunk: '{name}: hit and sunk the {ship}!',
            carrier: 'Carrier', battleship: 'Battleship', cruiser: 'Cruiser', submarine: 'Submarine', destroyer: 'Destroyer', 'bs.badFleet': 'Ships must fit and not overlap',
            fleetOf: '{name}\'s fleet',
        },
        fr: {
            'set.timer': 'Temps par tour', 'set.queueMode': 'File d\'attente',
            'opt.queueMode.winner': 'Le gagnant reste', 'opt.queueMode.rotate': 'Les deux changent',
            placeTitle: 'Place ta flotte', placeHint: 'Choisis un navire, puis touche sa case de départ. Pivoter le tourne.', rotate: 'Pivoter', random: 'Au hasard', ready: 'Prêt',
            waitingFoe: 'Prêt. En attente de {name}', foeReady: '{name} est prêt', yourShots: 'Tes tirs sur {name}', yourFleet: 'Ta flotte',
            shotsOf: 'Tirs de {name}', fire: 'À toi : touche une case pour tirer', miss: '{name} : à l\'eau', hit: '{name} : touché !', sunk: '{name} : touché, coulé ({ship}) !',
            carrier: 'Porte-avions', battleship: 'Cuirassé', cruiser: 'Croiseur', submarine: 'Sous-marin', destroyer: 'Torpilleur', 'bs.badFleet': 'Les navires doivent tenir sans se chevaucher',
            fleetOf: 'Flotte de {name}',
        },
    },
    howto,

    status(v, api) {
        const { t, me, nameOf } = api;
        if (v.phase === 'place') return t('placeTitle');
        if (v.last) {
            const n = nameOf(v.last.pid);
            if (v.last.result === 'sunk') return t('sunk', { name: n, ship: t(v.last.sunk) });
            return t(v.last.result, { name: n });
        }
        return v.turn === me ? t('fire') : t('turnOf', { name: nameOf(v.turn) });
    },

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        if (v.phase === 'place') {
            if (!v.me) { root.innerHTML = `<ul class="g-list">${v.players.map(id => `<li><span class="p-name">${esc(nameOf(id))}</span><span class="g-right">${v.ready[id] ? icon('check') : '…'}</span></li>`).join('')}</ul>`; return; }
            if (v.ready[me]) {
                root.innerHTML = `<p class="g-big-msg">${esc(t('waitingFoe', { name: nameOf(v.foe) }))}</p>${grid({ fleet: v.myFleet, cls: 'small' })}`;
                return;
            }
            if (!root._fleet) { root._fleet = randomFleet(rng); root._sel = 'carrier'; }
            const fleet = root._fleet;
            root.innerHTML = `<p class="g-note">${esc(t('placeHint'))}</p>
                <div class="bs-ships">${FLEET.map(f => `<button type="button" class="p-btn small ${root._sel === f.type ? 'active' : ''}" data-ship="${f.type}">${esc(t(f.type))} · ${f.size}</button>`).join('')}</div>
                ${grid({ fleet, clickable: true, cls: 'placing', sel: root._sel })}
                <div class="p-row"><button type="button" class="p-btn" data-rot="1">${esc(t('rotate'))}</button><button type="button" class="p-btn" data-rand="1">${esc(t('random'))}</button>
                <button type="button" class="p-btn primary" data-ready="1">${esc(t('ready'))}</button></div>
                ${v.ready[v.foe] ? `<p class="g-note">${esc(t('foeReady', { name: nameOf(v.foe) }))}</p>` : ''}`;
            root.onclick = e => {
                const sh = e.target.closest('[data-ship]');
                if (sh) { root._sel = sh.dataset.ship; this.render(root, v, api); return; }
                const cell = e.target.closest('.bs-cell');
                if (cell) {
                    const i = Number(cell.dataset.i);
                    const next = fleet.map(s => (s.type === root._sel ? { ...s, r: Math.floor(i / N), c: i % N } : s));
                    if (validFleet(next)) root._fleet = next; else api.toast(t('bs.badFleet'));
                    this.render(root, v, api); return;
                }
                if (e.target.closest('[data-rot]')) {
                    const next = fleet.map(s => (s.type === root._sel ? { ...s, dir: s.dir === 'h' ? 'v' : 'h' } : s));
                    if (validFleet(next)) root._fleet = next; else api.toast(t('bs.badFleet'));
                    this.render(root, v, api); return;
                }
                if (e.target.closest('[data-rand]')) { root._fleet = randomFleet(rng); this.render(root, v, api); return; }
                if (e.target.closest('[data-ready]')) send({ fleet: root._fleet });
            };
            return;
        }
        root._fleet = null;
        const fleets = v.fleets;
        if (v.me) {
            const mine = v.turn === me && !fleets;
            root.innerHTML = `<p class="p-label">${esc(t('yourShots', { name: nameOf(v.foe) }))}</p>
                ${grid({ shots: v.shots[me], sunk: v.sunk[v.foe], clickable: mine, last: v.last && v.last.pid === me ? v.last.cell : null, fleet: fleets ? fleets[v.foe] : null, cls: 'track' })}
                <p class="p-label">${esc(t('yourFleet'))}</p>
                ${grid({ shots: v.shots[v.foe], fleet: v.myFleet, sunk: v.sunk[me], last: v.last && v.last.pid === v.foe ? v.last.cell : null, cls: 'small own' })}`;
        } else {
            root.innerHTML = v.players.map(id => {
                const foe = v.players.find(x => x !== id);
                return `<p class="p-label">${esc(t('shotsOf', { name: nameOf(id) }))}</p>
                ${grid({ shots: v.shots[id], sunk: v.sunk[foe], fleet: fleets ? fleets[foe] : null, last: v.last && v.last.pid === id ? v.last.cell : null, cls: 'small' })}`;
            }).join('');
        }
        root.onclick = e => {
            const cell = e.target.closest('.track .bs-cell.can');
            if (cell) send({ cell: Number(cell.dataset.i) });
        };
    },
};
