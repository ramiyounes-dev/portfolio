/* Pictures drawn from the Pictionary drawing library, as inline SVG (used for the Memory cards). */
import { DRAWINGS, COLORS, strokesFor, labelOf } from '../ai/drawings.js';

const byKey = new Map(DRAWINGS.map(d => [d.en, d]));
const cache = new Map();

export function pictureSvg(key) {
    if (cache.has(key)) return cache.get(key);
    const d = byKey.get(key);
    if (!d) return '';
    const lines = strokesFor(d, () => 0.5).map(st => {
        const pts = [];
        for (let i = 0; i < st.pts.length; i += 2) pts.push(st.pts[i] + ',' + st.pts[i + 1]);
        const colour = st.c === COLORS.K ? 'currentColor' : st.c;
        return `<polyline points="${pts.join(' ')}" stroke="${colour}"/>`;
    }).join('');
    const out = `<svg class="pic" viewBox="60 60 880 880" fill="none" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${lines}</svg>`;
    cache.set(key, out);
    return out;
}

export const pictureLabel = (key, lang) => { const d = byKey.get(key); return d ? labelOf(d, lang) : key; };
