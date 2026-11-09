/* Playing cards drawn as SVG (Blackjack, Bullshit): rank and suit in the corners, one big suit in the middle,
   portraits for the court cards, a patterned back. One design at every size, on the table and in the hand.
   Suits are drawn as shapes, not text, so they never turn into emoji on a phone.
   Also: dealt() tells which cards are new since the last render, so only those animate. */

const SUIT = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' };
const RED = { h: true, d: true };

// Suit shapes in a 100 × 100 box
const SHAPE = {
    h: '<path d="M50 90C22 68 5 52 5 31C5 15 17 5 31 5C41 5 47 11 50 19C53 11 59 5 69 5C83 5 95 15 95 31C95 52 78 68 50 90Z"/>',
    d: '<path d="M50 3L88 50L50 97L12 50Z"/>',
    s: '<path d="M50 4C62 22 95 40 95 62C95 76 85 84 73 84C66 84 59 80 55 74C56 84 60 92 68 97H32C40 92 44 84 45 74C41 80 34 84 27 84C15 84 5 76 5 62C5 40 38 22 50 4Z"/>',
    c: '<circle cx="50" cy="27" r="21"/><circle cx="26" cy="58" r="21"/><circle cx="74" cy="58" r="21"/><path d="M44 58C44 80 39 90 30 97H70C61 90 56 80 56 58Z"/>',
};
const pip = (s, x, y, size, flip = false) =>
    `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 100})${flip ? ' rotate(180 50 50)' : ''}">${SHAPE[s]}</g>`;

/* Court cards: a double-ended portrait like a real deck (the top half, then the same turned upside down).
   Robes take the suit colour; gold, blue and skin tones are shared. Drawn for x 46..154, y 46..140 and scaled into the panel. */
const FACE = '<circle cx="100" cy="90" r="15" class="pc-skin"/><circle cx="94.5" cy="89" r="1.7" class="pc-dark"/><circle cx="105.5" cy="89" r="1.7" class="pc-dark"/><path d="M96 97q4 3 8 0" class="pc-line"/>';
const ROBE = '<path d="M60 140C62 117 78 106 100 106S138 117 140 140Z" class="pc-robe"/><path d="M60 140C62 117 78 106 100 106L100 140Z" class="pc-robe-shade"/>';
const FIGURE = {
    K: ROBE
        + '<path d="M84 108L100 130L116 108L110 106L100 118L90 106Z" class="pc-gold"/>'
        + '<path d="M124 100L136 76" class="pc-steel"/><path d="M119 104L129 108M133 69L139 72" class="pc-steel"/>'
        + FACE
        + '<path d="M86 94Q86 116 100 118Q114 116 114 94Q110 104 100 104Q90 104 86 94Z" class="pc-hair"/>'
        + '<path d="M83 78L85 58L92 68L100 54L108 68L115 58L117 78Z" class="pc-gold"/><circle cx="100" cy="68" r="2.6" class="pc-gem"/>',
    Q: ROBE
        + '<path d="M86 108Q100 122 114 108" class="pc-gold-line"/><circle cx="100" cy="117" r="3" class="pc-gem"/>'
        + '<path d="M83 92C80 70 120 70 117 92L121 120L112 112L111 92C110 82 90 82 89 92L88 112L79 120Z" class="pc-hair"/>'
        + FACE
        + '<path d="M85 77Q100 62 115 77L112 71L106 74L100 64L94 74L88 71Z" class="pc-gold"/>'
        + '<path d="M70 132L74 114" class="pc-stem"/><circle cx="74" cy="111" r="6" class="pc-flower"/><circle cx="74" cy="111" r="2.2" class="pc-gold"/>',
    J: ROBE
        + '<path d="M88 108L100 122L112 108" class="pc-gold-line"/><path d="M128 140L132 98" class="pc-steel"/><path d="M126 98H138" class="pc-steel"/>'
        + '<path d="M86 88C85 82 88 78 92 77L92 96L86 100Z" class="pc-hair"/><path d="M114 88C115 82 112 78 108 77L108 96L114 100Z" class="pc-hair"/>'
        + FACE
        + '<path d="M83 82Q100 62 119 80L123 84H82Z" class="pc-cap"/><path d="M115 77Q132 60 134 50Q122 62 110 72Z" class="pc-gold"/>',
};
function court(r) {
    return `<rect x="62" y="56" width="76" height="168" rx="8" class="pc-panel"/>`
        + `<svg x="62" y="56" width="76" height="168" viewBox="54 46 92 188" preserveAspectRatio="xMidYMid slice" overflow="hidden">${FIGURE[r]}<g transform="rotate(180 100 140)">${FIGURE[r]}</g></svg>`
        + `<path d="M62 140H138" class="pc-panel-mid"/>`
        + `<rect x="66" y="60" width="68" height="160" rx="5" class="pc-panel-line"/>`;
}

// Casino back: a diagonal lattice inside a gold border, cut to the inner panel (no ids, so many cards can share a page)
const LATTICE = (() => {
    const x0 = 24, y0 = 24, x1 = 176, y1 = 256, out = [];
    for (let c = x0 - (y1 - y0); c <= x1; c += 19) {
        // y = x - c + y0 (down-right) and y = -(x - c') + ... (down-left), clipped to the panel
        const a = [Math.max(x0, c), y0 + Math.max(x0, c) - c], b = [Math.min(x1, c + (y1 - y0)), y0 + Math.min(x1, c + (y1 - y0)) - c];
        if (a[0] < b[0]) out.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, `M${x0 + x1 - a[0]} ${a[1]}L${x0 + x1 - b[0]} ${b[1]}`);
    }
    return out.join('');
})();
const BACK_SVG = `<rect x="3" y="3" width="194" height="274" rx="16" class="pc-back"/><path d="${LATTICE}" class="pc-lattice"/>
    <rect x="16" y="16" width="168" height="248" rx="10" class="pc-back-line"/><rect x="24" y="24" width="152" height="232" rx="6" class="pc-back-line"/>
    <path d="M100 92L132 140L100 188L68 140Z" class="pc-back-mark"/>`;

/** The inside of a card (200 × 280 units): face or back. */
function cardBody(code) {
    if (!code) return { cls: 'back', body: BACK_SVG, label: '' };
    const sym = code.slice(-1), r = code.slice(0, -1), s = SUIT[sym] || 's';
    const middle = FIGURE[r] ? court(r) : pip(s, 100, 140, r === 'A' ? 104 : 92);
    // "10" is squeezed to the width of one wide letter so it never runs off the edge
    const fit = r === '10' ? ' textLength="50" lengthAdjust="spacingAndGlyphs"' : '';
    const idx = `<text x="33" y="62" class="pc-rank"${fit}>${r}</text>${pip(s, 33, 92, 34)}`;
    return { cls: RED[s] ? 'red' : 'black', label: r + sym,
        // Everything on the face is drawn 12% smaller around the centre: a clean white margin all round
        body: `<rect x="3" y="3" width="194" height="274" rx="16" class="pc-face"/><g transform="translate(100 140) scale(0.88) translate(-100 -140)">${middle}${idx}<g transform="rotate(180 100 140)">${idx}</g></g>` };
}

/** One card: code like '10♥' (or null for a face-down card). The same face at every size:
    the rank and one suit in two corners, a big suit in the middle (a portrait for J, Q, K).
    small only makes it smaller (CSS); opts.cls adds classes (deal, flip...). */
export function playingCard(code, { small = false, cls = '', style = '' } = {}) {
    const c = cardBody(code);
    return `<span class="pcard ${c.cls} ${small ? 'sm' : ''} ${cls}"${style ? ` style="${style}"` : ''}${c.label ? ` aria-label="${c.label}"` : ''}><svg viewBox="0 0 200 280" aria-hidden="true">${c.body}</svg></span>`;
}

/** The same card inside an SVG picture (How to play): placed at x, y with width w; rot in degrees; hl outlines it. */
export function cardSvg(code, x, y, w, { rot = 0, hl = false } = {}) {
    const c = cardBody(code), h = w * 1.4;
    const t = rot ? ` transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"` : '';
    return `<g class="pcard ${c.cls}${hl ? ' hl' : ''}"${t}><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 200 280">${c.body}</svg></g>`;
}

/** Which keys are new since the last call on this element. First call: nothing is new (no replay on load). */
export function dealt(el, name, keys) {
    const store = el._dealt || (el._dealt = {});
    const before = store[name];
    store[name] = new Set(keys);
    return key => !!(before && !before.has(key));
}
