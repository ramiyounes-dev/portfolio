/* Battleship ships seen from above, one drawing per type. Used on the game grids and in How to play.
   Drawn lying flat in a len*100 × 100 box with the bow on the right; shipSvg() turns upright ships. */

const hull = L => `M8 50C8 22 22 12 42 12L${L - 82} 12C${L - 38} 12 ${L - 14} 32 ${L - 4} 50C${L - 14} 68 ${L - 38} 88 ${L - 82} 88L42 88C22 88 8 78 8 50Z`;
const sub = L => `M10 50C10 32 26 24 50 24L${L - 72} 24C${L - 30} 24 ${L - 8} 38 ${L - 6} 50C${L - 8} 62 ${L - 30} 76 ${L - 72} 76L50 76C26 76 10 68 10 50Z`;
const turret = (x, dir = 1) => `<path d="M${x} 44h${dir * 36}M${x} 56h${dir * 36}" class="sh-gun"/><circle cx="${x}" cy="50" r="17" class="sh-dark"/><circle cx="${x - dir * 4}" cy="50" r="6" class="sh-deck2"/>`;
const bridge = (x, w) => `<rect x="${x}" y="28" width="${w}" height="44" rx="9" class="sh-deck2"/><rect x="${x + w * 0.3}" y="38" width="${w * 0.4}" height="24" rx="4" class="sh-dark"/>`;

const DETAIL = {
    carrier: L => `<path d="M30 22H${L - 80}L${L - 46} 50L${L - 80} 78H30Z" class="sh-deck"/>`
        + `<path d="M50 50H${L - 90}" class="sh-mark"/>`
        + `<rect x="${L * 0.55}" y="12" width="60" height="20" rx="4" class="sh-deck2"/><rect x="${L * 0.55 + 18}" y="16" width="24" height="12" rx="2" class="sh-dark"/>`,
    battleship: () => turret(84, -1) + turret(150, -1) + bridge(196, 54) + turret(292) + turret(340),
    cruiser: () => turret(78, -1) + bridge(124, 50) + turret(224),
    submarine: () => `<ellipse cx="140" cy="50" rx="38" ry="14" class="sh-deck2"/><circle cx="150" cy="50" r="6" class="sh-dark"/><path d="M50 50H92M196 50H236" class="sh-seam"/>`,
    destroyer: () => bridge(40, 46) + `<ellipse cx="108" cy="50" rx="10" ry="14" class="sh-dark"/>` + turret(146),
};

/** The ship's drawing in its flat box (no <svg> wrapper), for embedding in a larger picture. */
export function shipBody(type, len) {
    const L = len * 100;
    return `<path d="${type === 'submarine' ? sub(L) : hull(L)}" class="sh-hull"/>${(DETAIL[type] || DETAIL.destroyer)(L)}`;
}

/** A standalone <svg> for one ship; dir 'h' (bow right) or 'v' (bow down). state: '', 'sel' or 'sunk'. */
export function shipSvg(type, len, dir = 'h', { state = '', attrs = '' } = {}) {
    const L = len * 100;
    const box = dir === 'h' ? `0 0 ${L} 100` : `0 0 100 ${L}`;
    const body = dir === 'h' ? shipBody(type, len) : `<g transform="translate(100 0) rotate(90)">${shipBody(type, len)}</g>`;
    return `<svg class="ship ${state ? 'is-' + state : ''}" viewBox="${box}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"${attrs}>${body}</svg>`;
}
