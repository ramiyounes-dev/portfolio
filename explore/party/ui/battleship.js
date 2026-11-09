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
    return shipSvg(sh.type, len, sh.dir, { state, attrs: ` style="grid-area:${area}" data-ship="${sh.type}"` });
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

/* ---------- Placing the fleet ----------
   Drag a ship from the dock or from the grid (Pointer Events: mouse, pen and touch), a ghost follows the pointer
   and the squares it would cover turn green (fits) or red (off the grid or on another ship). Tap a placed ship to
   turn it (nudged to the nearest free spot if it no longer fits, else it shakes), or press R. On small screens,
   tap a ship in the dock, then a square. A drop that does not fit slides back to where the ship came from. */
const fits = (fleet, ship) => {
    const size = sizeOf(ship.type);
    if (ship.r < 0 || ship.c < 0 || (ship.dir === 'h' ? ship.c + size > N || ship.r >= N : ship.r + size > N || ship.c >= N)) return false;
    const taken = shipCells(fleet.filter(s => s.type !== ship.type));
    return cellsOf({ ...ship, size }).every(x => !taken.has(x));
};
/** The nearest spot (rows/columns away) where the ship fits with this direction, or null. */
function nearestFit(fleet, ship) {
    let best = null, bestD = Infinity;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const cand = { ...ship, r, c };
        const d = Math.abs(r - ship.r) + Math.abs(c - ship.c);
        if (d < bestD && fits(fleet, cand)) { best = cand; bestD = d; }
    }
    return best;
}
function placement(root, v, api) {
    const { t, nameOf, esc, send } = api;
    if (!root._fleet) { root._fleet = randomFleet(rng); root._sel = null; }
    const fleet = root._fleet;
    const docked = FLEET.filter(f => !fleet.some(s => s.type === f.type));
    const done = fleet.length === FLEET.length && validFleet(fleet);
    root.innerHTML = `<p class="g-note">${esc(t('placeHint2'))}</p>
        <div class="bs-dock ${docked.length ? '' : 'empty'}">${docked.length ? docked.map(f => `<button type="button" class="bs-dock-ship ${root._sel === f.type ? 'sel' : ''}" data-dock="${f.type}" style="--len:${f.size}" aria-label="${esc(t(f.type))} · ${f.size}">${shipSvg(f.type, f.size, 'h')}<span>${esc(t(f.type))}</span></button>`).join('') : `<span class="p-mono">${esc(t('allPlaced'))}</span>`}</div>
        ${grid({ fleet, clickable: true, cls: 'placing', sel: root._sel })}
        <div class="p-row bs-place-actions"><button type="button" class="p-btn" data-rot="1" ${root._sel ? '' : 'disabled'}>${esc(t('rotate'))}</button><button type="button" class="p-btn" data-rand="1">${esc(t('random'))}</button><button type="button" class="p-btn" data-clear="1">${esc(t('clear'))}</button>
        <button type="button" class="p-btn primary" data-ready="1" ${done ? '' : 'disabled'}>${esc(t('ready'))}</button></div>
        ${v.ready[v.foe] ? `<p class="g-note">${esc(t('foeReady', { name: nameOf(v.foe) }))}</p>` : ''}`;
    const gridEl = root.querySelector('.bs-grid');
    // Each placed ship gets a grab handle over its squares
    for (const sh of fleet) {
        const len = sizeOf(sh.type), h = sh.dir === 'h';
        const hd = document.createElement('div');
        hd.className = `bs-handle ${root._sel === sh.type ? 'sel' : ''}`;
        hd.dataset.ship = sh.type;
        hd.style.gridArea = `${sh.r + 1} / ${sh.c + 1} / span ${h ? 1 : len} / span ${h ? len : 1}`;
        gridEl.append(hd);
    }
    const redraw = () => placement(root, v, api);
    const shake = type => {
        const el = root.querySelector(`.bs-handle[data-ship="${type}"]`) || root.querySelector(`[data-dock="${type}"]`);
        if (el && el.animate) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 320 });
        api.toast(t('bs.badFleet'));
    };
    const rotate = type => {
        const sh = root._fleet.find(s => s.type === type);
        if (!sh) return;
        const turned = { ...sh, dir: sh.dir === 'h' ? 'v' : 'h' };
        const spot = fits(root._fleet, turned) ? turned : nearestFit(root._fleet, turned);
        if (!spot) { shake(type); return; }
        root._fleet = root._fleet.map(s => (s.type === type ? spot : s));
        redraw();
    };
    // Grid geometry from the squares themselves (padding and gaps included)
    const geo = () => {
        const a = gridEl.querySelector('[data-i="0"]').getBoundingClientRect(), b = gridEl.querySelector('[data-i="11"]').getBoundingClientRect();
        return { x0: a.left, y0: a.top, px: b.left - a.left, py: b.top - a.top, w: a.width, h: a.height };
    };
    const cellAt = (x, y) => { const g = geo(); return { r: Math.floor((y - g.y0 + (g.py - g.h) / 2) / g.py), c: Math.floor((x - g.x0 + (g.px - g.w) / 2) / g.px) }; };
    const clearPreview = () => gridEl.querySelectorAll('.pv-ok, .pv-bad').forEach(el => el.classList.remove('pv-ok', 'pv-bad'));
    const preview = ship => {
        clearPreview();
        if (!ship) return;
        const ok = fits(root._fleet, ship);
        const size = sizeOf(ship.type);
        for (let k = 0; k < size; k++) {
            const r = ship.dir === 'h' ? ship.r : ship.r + k, c = ship.dir === 'h' ? ship.c + k : ship.c;
            if (r < 0 || c < 0 || r >= N || c >= N) continue;
            const cell = gridEl.querySelector(`[data-i="${r * N + c}"]`);
            if (cell) cell.classList.add(ok ? 'pv-ok' : 'pv-bad');
        }
        return ok;
    };

    root.onpointerdown = e => {
        const src = e.target.closest('.bs-handle, [data-dock]');
        if (!src || e.button > 0) return;
        const type = src.dataset.ship || src.dataset.dock;
        const placed = root._fleet.find(s => s.type === type);
        const dir = placed ? placed.dir : (root._dir || 'h');
        const size = sizeOf(type);
        const rect = src.getBoundingClientRect();
        // Which square of the ship was grabbed: it stays under the finger while dragging
        const along = dir === 'h' || !placed ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height;
        const grab = Math.max(0, Math.min(size - 1, Math.floor(along * size)));
        const drag = { type, placed, dir, size, grab, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, from: rect, cand: null };
        e.preventDefault();
        try { src.setPointerCapture(e.pointerId); } catch (err) { /* */ }
        const move = ev => {
            if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 7) return;
            if (!drag.moved) {
                drag.moved = true;
                const g = geo();
                const gw = drag.dir === 'h' ? g.px * size - (g.px - g.w) : g.w, gh = drag.dir === 'h' ? g.h : g.py * size - (g.py - g.h);
                drag.ghost = document.createElement('div');
                drag.ghost.className = 'bs-ghost';
                drag.ghost.style.width = `${gw}px`; drag.ghost.style.height = `${gh}px`;
                drag.ghost.innerHTML = shipSvg(type, size, drag.dir, { state: 'sel' });
                document.body.append(drag.ghost);
                drag.gw = gw; drag.gh = gh;
                drag.off = drag.dir === 'h' ? { x: (grab + 0.5) * g.px, y: g.h / 2 } : { x: g.w / 2, y: (grab + 0.5) * g.py };
                src.classList.add('dragging');
                const orig = gridEl.querySelector(`svg.ship[data-ship="${type}"]`);
                if (orig) orig.style.opacity = '0.3';   // its old spot, dimmed while it moves
            }
            drag.ghost.style.transform = `translate(${ev.clientX - drag.off.x}px, ${ev.clientY - drag.off.y}px)`;
            const at = cellAt(ev.clientX, ev.clientY);
            const g = geo();
            const inside = ev.clientX > g.x0 - g.px && ev.clientX < g.x0 + g.px * (N + 1) && ev.clientY > g.y0 - g.py && ev.clientY < g.y0 + g.py * (N + 1);
            drag.cand = inside ? { type, dir: drag.dir, r: drag.dir === 'v' ? at.r - grab : at.r, c: drag.dir === 'h' ? at.c - grab : at.c } : null;
            const ok = preview(drag.cand);
            drag.ghost.classList.toggle('bad', !!drag.cand && !ok);
        };
        const end = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            root._drag = null;
            clearPreview();
            if (!drag.moved) {
                // A tap: a placed ship turns, a docked ship is picked (then tap a square)
                if (placed) { root._sel = type; rotate(type); }
                else { root._sel = root._sel === type ? null : type; redraw(); }
                return;
            }
            if (drag.cand && fits(root._fleet, drag.cand)) {
                drag.ghost.remove();
                root._fleet = [...root._fleet.filter(s => s.type !== type), drag.cand];
                root._sel = type;
                redraw();
                return;
            }
            // Does not fit: slide back to where it came from
            const back = drag.from;
            const anim = drag.ghost.animate([{ transform: drag.ghost.style.transform, opacity: 1 }, { transform: `translate(${back.left}px, ${back.top}px)`, opacity: 0.4 }], { duration: 260, easing: 'cubic-bezier(0.3, 0.8, 0.4, 1)' });
            anim.onfinish = () => { drag.ghost.remove(); redraw(); };
        };
        root._drag = drag;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
    };
    root.onclick = e => {
        const cell = e.target.closest('.bs-cell');
        if (cell && root._sel && !root._fleet.some(s => s.type === root._sel)) {
            // Tap-to-place: the picked dock ship starts on this square (moved inside the grid if it hangs off)
            const i = Number(cell.dataset.i), size = sizeOf(root._sel), dir = root._dir || 'h';
            let r = Math.floor(i / N), c = i % N;
            if (dir === 'h') c = Math.min(c, N - size); else r = Math.min(r, N - size);
            const ship = { type: root._sel, dir, r, c };
            const spot = fits(root._fleet, ship) ? ship : nearestFit(root._fleet, ship);
            if (!spot) { shake(root._sel); return; }
            root._fleet = [...root._fleet, spot];
            const next = FLEET.find(f => !root._fleet.some(s => s.type === f.type));
            root._sel = next ? next.type : spot.type;
            redraw();
            return;
        }
        if (e.target.closest('[data-rot]')) { if (root._sel) { if (root._fleet.some(s => s.type === root._sel)) rotate(root._sel); else { root._dir = (root._dir || 'h') === 'h' ? 'v' : 'h'; redraw(); } } return; }
        if (e.target.closest('[data-rand]')) { root._fleet = randomFleet(rng); root._sel = null; redraw(); return; }
        if (e.target.closest('[data-clear]')) { root._fleet = []; root._sel = FLEET[0].type; redraw(); return; }
        if (e.target.closest('[data-ready]') && validFleet(root._fleet) && root._fleet.length === FLEET.length) send({ fleet: root._fleet });
    };
    // R turns the picked ship (desktop)
    if (!root._bsKeys) {
        root._bsKeys = ev => {
            if ((ev.key === 'r' || ev.key === 'R') && !ev.target.closest('input, textarea') && root._sel && root.isConnected) {
                if (root._fleet && root._fleet.some(s => s.type === root._sel)) rotate(root._sel);
                else { root._dir = (root._dir || 'h') === 'h' ? 'v' : 'h'; redraw(); }
            }
        };
        window.addEventListener('keydown', root._bsKeys);
    }
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
            placeTitle: 'Place your fleet', placeHint: 'Pick a ship, then tap where it starts. Rotate turns it.', placeHint2: 'Drag ships onto the grid. Tap a ship to turn it (or press R). Or tap a ship below, then a square.', clear: 'Clear', allPlaced: 'All ships placed', rotate: 'Rotate', random: 'Random', ready: 'Ready',
            waitingFoe: 'Ready. Waiting for {name}', foeReady: '{name} is ready', yourShots: 'Your shots on {name}', yourFleet: 'Your fleet',
            shotsOf: '{name}\'s shots', fire: 'Your turn: tap a square to fire', miss: '{name}: miss', hit: '{name}: hit!', sunk: '{name}: hit and sunk the {ship}!',
            carrier: 'Carrier', battleship: 'Battleship', cruiser: 'Cruiser', submarine: 'Submarine', destroyer: 'Destroyer', 'bs.badFleet': 'Ships must fit and not overlap',
            fleetOf: '{name}\'s fleet',
        },
        fr: {
            'set.timer': 'Temps par tour', 'set.queueMode': 'File d\'attente',
            'opt.queueMode.winner': 'Le gagnant reste', 'opt.queueMode.rotate': 'Les deux changent',
            placeTitle: 'Place ta flotte', placeHint: 'Choisis un navire, puis touche sa case de départ. Pivoter le tourne.', placeHint2: 'Glisse les navires sur la grille. Touche un navire pour le tourner (ou R). Ou touche un navire en bas, puis une case.', clear: 'Vider', allPlaced: 'Tous les navires sont placés', rotate: 'Pivoter', random: 'Au hasard', ready: 'Prêt',
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
            placement(root, v, api);
            return;
        }
        if (root._bsKeys) { window.removeEventListener('keydown', root._bsKeys); root._bsKeys = null; }
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
