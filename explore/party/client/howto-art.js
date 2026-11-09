/* Drawing kit for the How to play pictures. Every picture is a 320×240 (4:3) SVG in the site's colours,
   built from the same few parts (boards, pieces, cards, arrows, labels), so all slides look alike.
   Colours come from CSS classes (see howto.css), so pictures follow the light and dark themes. */

import { ICONS } from './icons.js';
import { cardSvg } from './cards.js';

export const W = 320, H = 240;
const n = v => Math.round(v * 10) / 10;
const escT = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export const art = (...parts) => `<svg class="ht-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="presentation">${parts.flat().join('')}</svg>`;

export const rect = (x, y, w, h, cls = 'k-paper', rx = 0, extra = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${rx}" class="${cls}"${extra}/>`;
export const circle = (cx, cy, r, cls = 'k-a', extra = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" class="${cls}"${extra}/>`;
export const line = (x1, y1, x2, y2, cls = 'k-line') => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" class="${cls}"/>`;
export const path = (d, cls = 'k-line', extra = '') => `<path d="${d}" class="${cls}"${extra}/>`;
export const group = (transform, ...parts) => `<g transform="${transform}">${parts.flat().join('')}</g>`;

/** Text label. size in SVG units; cls k-t (ink), k-tm (muted), k-ta (accent); weight 'b' for bold display font. */
export function label(x, y, s, { size = 12, cls = 'k-tm', anchor = 'middle', font = 'mono' } = {}) {
    return `<text x="${n(x)}" y="${n(y)}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="central" class="${cls} f-${font}">${escT(s)}</text>`;
}

/** Square grid board: top-left (x, y), cols × rows cells of size s. fill(c, r) may return a class for a cell. */
export function board(x, y, cols, rows, s, { fill = null, frame = 'k-board', cell = 'k-cell', round = 6 } = {}) {
    const out = [rect(x - 6, y - 6, cols * s + 12, rows * s + 12, frame, round)];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const f = fill && fill(c, r);
        out.push(rect(x + c * s, y + r * s, s, s, f ? `${cell} ${f}` : cell));
    }
    return out.join('');
}
/** Centre of a cell on a board drawn with board(). */
export const at = (x, y, s) => (c, r) => [x + c * s + s / 2, y + r * s + s / 2];

/** Round piece: who 'a' (amber), 'b' (ivory), 'ink', 'acc', 'ghost' (dashed outline), 'dng' (red). */
export function piece(cx, cy, r, who = 'a') {
    if (who === 'ghost') return circle(cx, cy, r, 'k-ghost');
    return circle(cx, cy, r, `k-pc-${who}`);
}
export const dot = (cx, cy, r = 4) => circle(cx, cy, r, 'k-dot');
export const ring = (cx, cy, r) => circle(cx, cy, r, 'k-ring');

/** Arrow from (x1, y1) to (x2, y2); bend > 0 curves it to the left of travel. */
export function arrow(x1, y1, x2, y2, { bend = 0, cls = 'k-arr', head = 8 } = {}) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
    const ang = Math.atan2(y2 - cy, x2 - cx);
    const a1 = ang + Math.PI * 0.82, a2 = ang - Math.PI * 0.82;
    const d = `M${n(x1)} ${n(y1)} Q${n(cx)} ${n(cy)} ${n(x2)} ${n(y2)}`;
    const h = `M${n(x2 + Math.cos(a1) * head)} ${n(y2 + Math.sin(a1) * head)} L${n(x2)} ${n(y2)} L${n(x2 + Math.cos(a2) * head)} ${n(y2 + Math.sin(a2) * head)}`;
    return path(d, cls) + path(h, cls);
}

/** Rounded pill with text, for buttons and tags drawn inside a picture. */
export function pill(x, y, s, { w = null, h = 26, cls = 'k-pill', ink = 'k-t', size = 11 } = {}) {
    const width = w || Math.max(40, String(s).length * size * 0.66 + 22);
    return rect(x - width / 2, y - h / 2, width, h, cls, h / 2) + label(x, y, s, { size, cls: ink });
}

/** One of the site's line icons, centred at (cx, cy), size in SVG units. */
export function ic(name, cx, cy, size = 40, cls = 'k-ic') {
    const k = size / 24;
    return `<g class="${cls}" transform="translate(${n(cx - size / 2)} ${n(cy - size / 2)}) scale(${n(k * 100) / 100})" fill="none" stroke="currentColor" stroke-width="${n(1.7 / Math.max(1, k * 0.7) * 10) / 10}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</g>`;
}

/** Shared last picture: the three ways to play. */
export function modesArt(lang = 'en') {
    const L = lang === 'fr' ? ['Contre l\'IA', 'Même appareil', 'En ligne'] : ['vs AI', 'Same device', 'Online'];
    const cols = [[56, 'bot'], [160, 'phone'], [264, 'globe']];
    return art(cols.map(([x, name], k) => rect(x - 46, 60, 92, 110, 'k-paper', 14) + ic(name, x, 102, 46, 'k-ic-acc') + label(x, 148, L[k], { size: 11, cls: 'k-t' })));
}

/** Tic-tac-toe marks. */
export const markX = (cx, cy, k = 12, cls = 'k-x') => path(`M${n(cx - k)} ${n(cy - k)}L${n(cx + k)} ${n(cy + k)}M${n(cx + k)} ${n(cy - k)}L${n(cx - k)} ${n(cy + k)}`, cls);
export const markO = (cx, cy, k = 12, cls = 'k-o') => circle(cx, cy, k, cls);

/** Playing card with rank and suit: the very same card as in the games (client/cards.js). h is kept for old calls. */
export function playing(x, y, rank, suit, { w = 46, rot = 0, hl = false } = {}) {
    return cardSvg(rank + suit, x, y, w, { rot, hl });
}
/** A face-down playing card, same back as in the games. */
export const playingBack = (x, y, { w = 46, rot = 0 } = {}) => cardSvg(null, x, y, w, { rot });

/** Arrow between two centres, stopping r units short of each. */
export function link(a, b, r = 26, opts = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return arrow(a[0] + (dx / d) * r, a[1] + (dy / d) * r, b[0] - (dx / d) * r, b[1] - (dy / d) * r, opts);
}
/** A token: rounded tile with an icon, used for choices and pictures. */
export const tile = (name, cx, cy, size = 52, { cls = 'k-paper', icls = 'k-ic' } = {}) => rect(cx - size / 2, cy - size / 2, size, size, cls, size * 0.24) + ic(name, cx, cy, size * 0.62, icls);
