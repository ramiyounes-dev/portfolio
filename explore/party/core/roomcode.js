/* Room codes: 4 characters, no look-alikes (no O/0, I/1, L). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4,5}$/;

export function makeCode(rng = Math.random, len = 4) {
    let s = '';
    for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
    return s;
}

/** Normalise what a person typed: upper case, no spaces or punctuation. */
export function cleanCode(s) {
    return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}
