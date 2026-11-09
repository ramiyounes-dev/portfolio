/* Text helpers for word games: accent- and case-insensitive comparison (É = E, ç = C, œ = OE). */

const LIGATURES = { 'œ': 'oe', 'Œ': 'OE', 'æ': 'ae', 'Æ': 'AE', 'ß': 'ss' };
const COMBINING = /[̀-ͯ]/g;

/** "Éléphant" -> "ELEPHANT"; strips accents, spaces, hyphens and apostrophes. */
export function fold(s) {
    return String(s || '')
        .replace(/[œŒæÆß]/g, c => LIGATURES[c])
        .normalize('NFD').replace(COMBINING, '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
}

/** Single folded letter for a key press, or '' if it is not a letter. */
export function foldLetter(ch) {
    const f = fold(ch);
    return f.length === 1 ? f : '';
}

export const sameWord = (a, b) => fold(a) !== '' && fold(a) === fold(b);

/** True when a and b differ by exactly one edit (insert, delete or substitute). */
export function oneEditAway(a, b) {
    a = fold(a); b = fold(b);
    if (a === b) return false;
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) { i++; j++; continue; }
        if (++edits > 1) return false;
        if (a.length > b.length) i++;
        else if (b.length > a.length) j++;
        else { i++; j++; }
    }
    return edits + (a.length - i) + (b.length - j) === 1;
}

/** Letters of a word as a sorted folded string, for anagram checks. */
export const letterKey = w => fold(w).split('').sort().join('');

/** Folded letters of a word, one per displayed character (keeps accents aligned for display). */
export function foldedChars(word) {
    return [...String(word)].map(ch => fold(ch) || null);
}
