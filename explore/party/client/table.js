/* A card table seen from above, shared by the card games (Blackjack, UNO, Bullshit).
   Players sit around an oval felt, you at the bottom. The centre holds the game's piles.
   Cards fly between seats and the centre: flyCards() animates copies over the table, so the real
   layout never moves and nothing is replayed on the next render. */

import { hue } from './app.js';

/** True when the player asked for less motion: flights are skipped, the cards just appear. */
export const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Seat positions (percent of the table box). ids in turn order; me (if seated) goes to the bottom.
    arc: [from, to] in degrees (90 = bottom, 270 = top) to keep seats on part of the table. */
export function seatPositions(ids, me, { arc = null } = {}) {
    const n = ids.length;
    const start = Math.max(0, ids.indexOf(me));
    const out = {};
    ids.forEach((id, i) => {
        const k = (i - start + n) % n;
        let deg;
        if (arc) deg = n === 1 ? (arc[0] + arc[1]) / 2 : arc[0] + ((arc[1] - arc[0]) * k) / (n - 1);
        else deg = 90 + (360 * k) / n;
        const a = (deg * Math.PI) / 180;
        out[id] = { x: 50 + 44 * Math.cos(a), y: 50 + 41 * Math.sin(a) };
    });
    return out;
}

/** One person at the table. extra: html under the name (cards, chips); bubble: a short speech bubble. */
export function seatHtml(p) {
    const initial = esc((p.name || '?').trim().slice(0, 1).toUpperCase());
    return `<div class="tb-seat ${p.turn ? 'turn' : ''} ${p.me ? 'me' : ''} ${p.out ? 'out' : ''}" data-seat="${esc(p.id)}" style="--x:${p.x.toFixed(2)}%;--y:${p.y.toFixed(2)}%;--hue:${hue(p.id)}">
        ${p.bubble ? `<span class="tb-bubble ${p.bubbleNew ? 'new' : ''} ${p.bubbleBad ? 'bad' : ''}">${p.bubble}</span>` : ''}
        ${p.action ? `<span class="tb-action ${p.action.cls || ''}" style="animation-delay:-${p.action.age}ms">${p.action.text}</span>` : ''}
        ${p.badge ? `<span class="tb-badge">${p.badge}</span>` : ''}
        <span class="tb-avatar">${initial}${p.thinking ? '<i class="tb-think"><b></b><b></b><b></b></i>' : ''}</span>
        <span class="tb-name">${esc(p.name)}</span>
        ${p.sub ? `<span class="tb-sub">${p.sub}</span>` : ''}
        ${p.extra || ''}</div>`;
}

/** The whole table. seats: [{ id, name, x, y, ... }], center: html for the felt. */
export function tableHtml({ seats, center, cls = '' }) {
    return `<div class="tb ${cls} ${seats.length > 6 ? 'many' : ''}"><div class="tb-felt"><div class="tb-center">${center}</div></div>${seats.map(seatHtml).join('')}</div>`;
}

/** A small fan of face-down cards showing how many a player holds. back: the game's own card back. */
export function backsFan(n, back, max = 5) {
    const k = Math.min(n, max);
    return `<span class="tb-fan" style="--k:${k}">${[...Array(k)].map((_, i) => `<i style="--i:${i - (k - 1) / 2}">${back}</i>`).join('')}</span>`;
}

/* Flights live in one fixed layer over the whole page: the board can be redrawn mid-flight without cutting
   them short, and no container with overflow: hidden can clip them. Coordinates are viewport pixels. */
let layer = null;
function flyLayer() {
    if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.className = 'tb-flylayer'; document.body.append(layer); }
    return layer;
}

/** Fly copies of a card (or chip) from one element to another. size: width in px (default: the smaller end, as a card). */
export function flyCards(table, from, to, { html, count = 1, stagger = 90, duration = 480, rotate = 0, size = 0, spin: doSpin = true } = {}) {
    if (!from || !to || typeof document.body.animate !== 'function' || calm()) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const w = size || Math.max(16, Math.min(a.width, b.width, 60));
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const host = flyLayer();
    for (let i = 0; i < Math.min(count, 8); i++) {
        const el = document.createElement('div');
        el.className = 'tb-fly';
        el.style.width = `${w}px`;
        el.style.setProperty('--w', `${w}px`);
        el.innerHTML = html;
        host.append(el);
        const h = el.offsetHeight;
        const spin = doSpin ? (rotate || (Math.random() * 30 - 15)) : 0;
        const anim = el.animate([
            { transform: `translate(${ax - w / 2}px, ${ay - h / 2}px) rotate(${spin}deg) scale(0.8)`, opacity: 0 },
            { opacity: 1, offset: 0.15 },
            { transform: `translate(${bx - w / 2 + (i - (count - 1) / 2) * 4}px, ${by - h / 2}px) rotate(${spin / 3}deg) scale(1)`, opacity: 1 },
        ], { duration, delay: i * stagger, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'both' });
        anim.onfinish = anim.oncancel = () => el.remove();
    }
}

/** Remember a value per element between renders: returns the previous value. */
export function remember(el, key, value) {
    const store = el._tb || (el._tb = {});
    const before = store[key];
    store[key] = value;
    return before;
}

/** Make an element already in place arrive from another one (e.g. a card dealt from the shoe). */
export function flyIn(el, from, { delay = 0, duration = 460 } = {}) {
    if (!el || !from || typeof el.animate !== 'function' || calm()) return;
    const a = from.getBoundingClientRect(), b = el.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
    el.animate([
        { transform: `translate(${dx}px, ${dy}px) rotate(-24deg) scale(0.6)`, opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { transform: 'none', opacity: 1 },
    ], { duration, delay, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'backwards' });
}

/** What a player just did ("HIT", "RAISE 200"), shown at their seat for about 1.8 s.
    key identifies the action (a new key starts a new bubble). The board is redrawn on every update,
    so the start time is remembered and the fade carries on where it was instead of starting over. */
export const ACTION_MS = 1800;
export function actionBubble(root, key, text, cls = '') {
    if (!key || !text) return null;
    const seen = root._tbActs || (root._tbActs = new Map());
    if (!seen.has(key)) {
        seen.set(key, Date.now());
        if (seen.size > 40) seen.delete(seen.keys().next().value);
    }
    const age = Date.now() - seen.get(key);
    return age < ACTION_MS ? { text, cls, age } : null;
}
