/* Playing cards drawn as SVG (Blackjack, Bullshit): real pip layouts, framed court cards, a patterned back.
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

// Pip positions for 2 to 10 in a 200 × 280 card: columns 64 / 100 / 136, rows from 52 to 228
const L = 64, M = 100, R = 136;
const LAYOUT = {
    2: [[M, 56], [M, 224]],
    3: [[M, 56], [M, 140], [M, 224]],
    4: [[L, 56], [R, 56], [L, 224], [R, 224]],
    5: [[L, 56], [R, 56], [M, 140], [L, 224], [R, 224]],
    6: [[L, 56], [R, 56], [L, 140], [R, 140], [L, 224], [R, 224]],
    7: [[L, 56], [R, 56], [M, 98], [L, 140], [R, 140], [L, 224], [R, 224]],
    8: [[L, 56], [R, 56], [M, 98], [L, 140], [R, 140], [M, 182], [L, 224], [R, 224]],
    9: [[L, 56], [R, 56], [L, 112], [R, 112], [M, 140], [L, 168], [R, 168], [L, 224], [R, 224]],
    10: [[L, 56], [R, 56], [M, 84], [L, 112], [R, 112], [L, 168], [R, 168], [M, 196], [L, 224], [R, 224]],
};

// Court cards: a framed panel with the letter, a small emblem and two suit marks
const EMBLEM = {
    K: '<path d="M78 82L84 60L94 74L100 56L106 74L116 60L122 82Z" class="pc-gold"/>',
    Q: '<path d="M80 82Q100 52 120 82Z" class="pc-gold"/><circle cx="100" cy="62" r="5" class="pc-gold"/>',
    J: '<path d="M86 82L100 58L114 82Z" class="pc-gold"/>',
};
function court(r, s) {
    return `<rect x="40" y="44" width="120" height="192" rx="10" class="pc-panel"/>`
        + `<rect x="47" y="51" width="106" height="178" rx="6" class="pc-panel-line"/>`
        + EMBLEM[r]
        + `<text x="100" y="168" text-anchor="middle" class="pc-court">${r}</text>`
        + pip(s, 66, 206, 26) + pip(s, 134, 74, 26, true);
}

/** One card: code like '10♥' (or null for a face-down card). opts.cls adds classes (deal, flip...). */
export function playingCard(code, { small = false, cls = '', style = '' } = {}) {
    const st = style ? ` style="${style}"` : '';
    if (!code) {
        return `<span class="pcard back ${small ? 'sm' : ''} ${cls}"${st}><svg viewBox="0 0 200 280" aria-hidden="true">
            <rect x="3" y="3" width="194" height="274" rx="16" class="pc-back"/>
            <rect x="14" y="14" width="172" height="252" rx="10" class="pc-back-line"/>
            <path d="M100 30L170 140L100 250L30 140Z" class="pc-back-line"/><path d="M100 60L150 140L100 220L50 140Z" class="pc-back-mark"/>
            </svg></span>`;
    }
    const sym = code.slice(-1), r = code.slice(0, -1), s = SUIT[sym] || 's';
    const red = RED[s] ? 'red' : 'black';
    let middle;
    if (small) middle = pip(s, 128, 196, 92);
    else if (r === 'A') middle = pip(s, 100, 140, s === 's' ? 96 : 80);
    else if (EMBLEM[r]) middle = court(r, s);
    else middle = (LAYOUT[r] || []).map(([x, y]) => pip(s, x, y, 38, y > 150)).join('');
    const corner = small
        ? `<text x="20" y="74" class="pc-rank big">${r}</text>`
        : `<text x="22" y="46" class="pc-rank">${r}</text>${pip(s, 22 + (r === '10' ? 8 : 0), 66, 22)}`
          + `<g transform="rotate(180 100 140)"><text x="22" y="46" class="pc-rank">${r}</text>${pip(s, 22 + (r === '10' ? 8 : 0), 66, 22)}</g>`;
    return `<span class="pcard ${red} ${small ? 'sm' : ''} ${cls}"${st} aria-label="${r}${sym}"><svg viewBox="0 0 200 280" aria-hidden="true">
        <rect x="3" y="3" width="194" height="274" rx="16" class="pc-face"/>${middle}${corner}</svg></span>`;
}

/** Which keys are new since the last call on this element. First call: nothing is new (no replay on load). */
export function dealt(el, name, keys) {
    const store = el._dealt || (el._dealt = {});
    const before = store[name];
    store[name] = new Set(keys);
    return key => !!(before && !before.has(key));
}
