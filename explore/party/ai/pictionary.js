/* Pictionary AI (vs AI mode): the human always guesses; AI players take turns drawing and guessing.
   - AI drawers replay a drawing from a pre-recorded library (ai/drawings.js), stroke by stroke.
   - AI guessers look only at public facts about the canvas (where the first line starts, how much ink is down) and
     "recognise" a library drawing once enough of it is visible: Easy late, Hard early. Until then they throw in
     plausible wrong guesses that fit the letter hints. They never read the secret word. */
import { DRAWINGS, strokesFor, labelOf } from './drawings.js';
import { nextTurn } from '../logic/pictionary.js';
import { fold } from '../core/text.js';
import { think, pick } from './common.js';

const SEE = { easy: 0.85, medium: 0.6, hard: 0.4 };            // share of the drawing needed to recognise it
const ANSWER = { easy: [3500, 7000], medium: [2000, 4500], hard: [900, 2500] };

// fingerprint: where each library drawing's first line starts, and its total amount of ink
const LIB = DRAWINGS.map(d => {
    const s = strokesFor(d, () => 0.5);
    return { d, start: s[0].pts.slice(0, 2), ink: s.reduce((n, st) => n + st.pts.length / 2, 0) };
});

export function recognise(v) {
    if (!v.sketch) return null;
    let bestL = null, bestD = Infinity;
    for (const l of LIB) { const dd = Math.hypot(l.start[0] - v.sketch[0], l.start[1] - v.sketch[1]); if (dd < bestD) { bestD = dd; bestL = l; } }
    return bestD < 30 ? bestL : null;
}

function chunks(strokes, idBase) {
    const out = [];
    strokes.forEach((st, k) => {
        for (let i = 0; i < st.pts.length; i += 12) out.push({ id: idBase + k, c: st.c, w: st.w, pts: st.pts.slice(i, i + 12) });
    });
    return out;
}

export default {
    reactive: true,                 // the drawer is not "awaited" while drawing, but keeps adding strokes
    prepare(s, humanId, { ctx }) {
        s.pool = DRAWINGS.map(d => labelOf(d, ctx.lang));
        s.order = s.players.filter(id => id !== humanId);   // the human never draws against the AI
        s.drawsDone = {}; s.drawer = null; s.turnNo = 0; s.used = [];
        nextTurn(s, ctx);
    },
    decide(v, me, ctx) {
        const mem = ctx.memory;
        if (v.drawer === me) {
            if (v.phase === 'choose' && v.choices) return { action: { choose: Math.floor(ctx.rng() * v.choices.length) }, delay: think(ctx.rng, 1200, 2600) };
            if (v.phase !== 'draw' || !v.word) return null;
            if (mem.turn !== v.turnNo) {
                const d = DRAWINGS.find(x => fold(labelOf(x, ctx.lang)) === fold(v.word));
                mem.turn = v.turnNo;
                mem.queue = d ? chunks(strokesFor(d, ctx.rng), (v.turnNo * 100) % 100000) : [];
                mem.pos = 0;
            }
            if (mem.pos >= mem.queue.length) return null;
            const seg = mem.queue[mem.pos];
            if (ctx.firing) mem.pos++;
            return { action: { seg }, delay: mem.pos === 0 ? 900 : 70 + ctx.rng() * 90 };
        }
        if (v.phase !== 'draw' || v.done || v.loud) return null;
        if (mem.gturn !== v.turnNo) { mem.gturn = v.turnNo; mem.tried = []; mem.wrongAt = ctx.now + think(ctx.rng, 6000, 12000); }
        const seen = recognise(v);
        if (seen && v.ink >= seen.ink * (SEE[ctx.difficulty] ?? 0.5) && !mem.tried.includes(labelOf(seen.d, ctx.lang))) {
            const [lo, hi] = ANSWER[ctx.difficulty] || ANSWER.medium;
            const w = labelOf(seen.d, ctx.lang);
            if (ctx.firing) mem.tried.push(w);
            return { action: { guess: w }, delay: think(ctx.rng, lo, hi) };
        }
        // a plausible wrong guess now and then (fits the length and the revealed letters)
        if (ctx.now >= mem.wrongAt && v.mask) {
            const fits = DRAWINGS.map(d => labelOf(d, ctx.lang)).filter(w => [...w].length === v.mask.length && !mem.tried.includes(w)
                && v.mask.every((c, i) => !c || fold(c) === fold([...w][i])));
            const pool = fits.length > 1 ? fits : DRAWINGS.map(d => labelOf(d, ctx.lang)).filter(w => !mem.tried.includes(w));
            const w = pick(ctx.rng, pool);
            if (!w) return null;
            if (ctx.firing) { mem.tried.push(w); mem.wrongAt = ctx.now + think(ctx.rng, 7000, 14000); }
            return { action: { guess: w }, delay: think(ctx.rng, 300, 900) };
        }
        return null;
    },
};
