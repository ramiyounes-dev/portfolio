/* Pictionary: the drawer picks 1 of 3 words and draws; strokes stream live; guessers type. Correct guesses stay hidden. */
import { lowestScore, finish, nextInOrder } from '../core/helpers.js';
import { fold, sameWord, oneEditAway } from '../core/text.js';

export const PALETTE = ['#1a1612', '#f4efe6', '#d93c32', '#e8902e', '#f2d14a', '#3a9d5d', '#2f6fd1', '#8e5bd9', '#8a5a3c', 'erase'];
const CHOOSE_MS = 10_000;
const REVEAL_MS = 4500;
const MAX_POINTS = 8000;

export function pointsFor(order) { return [10, 8, 6, 5, 4, 3][order] ?? 2; }

function pickChoices(s, ctx) {
    const words = s.pool || ctx.words;
    const pool = words.filter(w => { const n = fold(w).length; return n >= 3 && n <= 12 && !s.used.includes(w) && (s.difficulty === 'easy' ? n <= 6 : s.difficulty === 'hard' ? n >= 7 : true); });
    const out = [];
    const src = pool.length >= 3 ? pool : words;
    while (out.length < 3) { const w = ctx.rng.pick(src); if (!out.includes(w)) out.push(w); }
    return out;
}

/** Progressive hint: some letters revealed as time passes (never more than half). */
export function hintMask(word, order, fraction, on) {
    const chars = [...word];
    const letters = chars.map((c, i) => (fold(c) ? i : -1)).filter(i => i >= 0);
    const k = on ? Math.min(Math.floor(letters.length / 2), Math.floor(fraction * letters.length * 0.6)) : 0;
    const shown = new Set(order.filter(i => letters.includes(i)).slice(0, k));
    return chars.map((c, i) => (!fold(c) ? c : shown.has(i) ? c : null));
}

function guessers(s) { return s.players.filter(id => id !== s.drawer); }

export function nextTurn(s, ctx) {
    s.turnNo++;
    s.drawsDone[s.drawer] = (s.drawsDone[s.drawer] || 0) + (s.drawer ? 1 : 0);
    const need = id => (s.drawsDone[id] || 0) < s.rotations;
    const candidates = s.order.filter(need);
    if (!candidates.length) { s.over = finish(s.scores, s.players); s.phase = 'reveal'; s.deadline = null; return; }
    s.drawer = s.drawer ? (nextInOrder(s.order, s.drawer, id => !need(id)) || candidates[0]) : candidates[0];
    s.choices = pickChoices(s, ctx);
    s.word = null;
    s.strokes = [];
    s.chat = [];
    s.guessed = [];
    s.phase = 'choose';
    s.timerTotal = CHOOSE_MS;
    s.deadline = ctx.now + CHOOSE_MS;
}

function beginDrawing(s, word, ctx) {
    s.word = word;
    s.used.push(word);
    s.choices = null;
    s.phase = 'draw';
    s.hintOrder = ctx.rng.shuffle([...word].map((_, i) => i));
    const sec = ctx.settings.timer || 80;
    s.timerTotal = sec * 1000;
    s.started = ctx.now;
    s.deadline = ctx.now + sec * 1000;
}

function endTurn(s, ctx) {
    s.phase = 'reveal';
    s.reveal = { word: s.word, guessed: [...s.guessed] };
    s.timerTotal = REVEAL_MS;
    s.deadline = ctx.now + REVEAL_MS;
}

export default {
    id: 'pictionary',
    min: 3,
    max: 12,
    settings: [
        { key: 'timer', type: 'int', unit: 's', def: 80, min: 30, max: 180, step: 10 },
        { key: 'rotations', type: 'int', def: 2, min: 1, max: 5 },
        { key: 'hints', type: 'bool', def: true },
        { key: 'difficulty', type: 'select', def: 'any', options: ['easy', 'any', 'hard'] },
        { key: 'loud', type: 'bool', def: false, hidden: true },
    ],

    setup(ctx) {
        const s = {
            players: [...ctx.players], order: [...ctx.players], scores: Object.fromEntries(ctx.players.map(id => [id, 0])),
            late: [], used: [], drawsDone: {}, drawer: null, turnNo: 0, rotations: ctx.settings.rotations,
            hints: ctx.settings.hints, difficulty: ctx.settings.difficulty, loud: !!ctx.settings.loud,
        };
        nextTurn(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over) return { error: 'illegal' };
        if (!s.players.includes(pid)) return { error: 'not_your_turn' };

        if (s.phase === 'choose') {
            if (pid !== s.drawer) return { error: 'not_your_turn' };
            const i = Number(a.choose);
            if (!Number.isInteger(i) || !s.choices[i]) return { error: 'illegal' };
            beginDrawing(s, s.choices[i], ctx);
            return {};
        }
        if (s.phase !== 'draw') return { error: 'illegal' };

        // Drawer: stroke segments, undo, clear (relayed live, not a full state update)
        if (pid === s.drawer) {
            if (a.seg) {
                const { id, c, w, pts } = a.seg;
                // w 1-3: a pen or eraser stroke; w 0: a paint-bucket fill at one point
                if (!PALETTE.includes(c) || ![0, 1, 2, 3].includes(w) || !Array.isArray(pts) || pts.length > 400 || pts.length % 2) return { error: 'illegal', quiet: true };
                if (w === 0 && (pts.length !== 2 || c === 'erase')) return { error: 'illegal', quiet: true };
                if (!pts.every(n => Number.isInteger(n) && n >= 0 && n <= 1000)) return { error: 'illegal', quiet: true };
                const total = s.strokes.reduce((acc, st) => acc + st.pts.length, 0);
                if (total + pts.length > MAX_POINTS * 2) return { error: 'pc.full', quiet: true };
                const last = s.strokes[s.strokes.length - 1];
                if (last && last.id === id && w) last.pts.push(...pts); else s.strokes.push({ id, c, w, pts: [...pts] });
                return { quiet: true, event: { t: 'seg', seg: { id, c, w, pts } } };
            }
            if (a.undo) { s.strokes.pop(); return { quiet: true, event: { t: 'undo' } }; }
            if (s.loud && 'credit' in a) {
                // Same device: guesses are said out loud and the drawer taps who found it first (or nobody)
                if (a.credit !== null && !guessers(s).includes(a.credit)) return { error: 'illegal' };
                if (a.credit) { s.scores[a.credit] += pointsFor(0); s.scores[s.drawer] += 2; s.guessed.push(a.credit); s.chat.push({ pid: a.credit, ok: true, pts: pointsFor(0) }); }
                endTurn(s, ctx);
                return {};
            }
            if (a.clear) { s.strokes = []; return { quiet: true, event: { t: 'clear' } }; }
            return { error: 'illegal' };
        }

        // Guessers
        if (s.guessed.includes(pid)) return { error: 'illegal' };
        const text = String(a.guess || '').replace(/[<>]/g, '').trim().slice(0, 40);
        if (!text) return { error: 'illegal' };
        if (sameWord(text, s.word)) {
            const pts = pointsFor(s.guessed.length);
            s.scores[pid] += pts;
            s.scores[s.drawer] += 2;
            s.guessed.push(pid);
            s.chat.push({ pid, ok: true, pts });
            if (guessers(s).every(id => s.guessed.includes(id) || ctx.isAway(id))) endTurn(s, ctx);
            return {};
        }
        s.chat.push({ pid, text });
        if (s.chat.length > 40) s.chat.shift();
        if (oneEditAway(text, s.word)) return { private: 'pc.close' };
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'choose') beginDrawing(s, ctx.rng.pick(s.choices), ctx);
        else if (s.phase === 'draw') endTurn(s, ctx);
        else nextTurn(s, ctx);
    },

    /* Late joiner: guesses the current drawing right away and joins the end of the drawing rotation. */
    join(s, pid) {
        if (s.players.includes(pid)) return;
        s.scores[pid] = lowestScore(s.scores, s.players);
        s.players.push(pid);
        s.order.push(pid);
        s.late.push(pid);
    },

    sync: s => ({ strokes: s.strokes || [], turnNo: s.turnNo }),
    awaiting: s => (s.over ? [] : s.phase === 'choose' ? [s.drawer] : s.phase === 'draw' ? (s.loud ? [s.drawer] : guessers(s).filter(id => !s.guessed.includes(id))) : []),
    seated: s => s.players,

    view(s, pid, ctx) {
        const isDrawer = pid === s.drawer;
        const fraction = s.phase === 'draw' && s.timerTotal ? Math.min(1, (ctx.now - s.started) / s.timerTotal) : 0;
        return {
            phase: s.phase, turnNo: s.turnNo, drawer: s.drawer, players: s.players, scores: s.scores, late: s.late,
            rotations: s.rotations, drawsDone: s.drawsDone,
            choices: isDrawer ? s.choices : null,
            word: isDrawer || s.phase === 'reveal' ? s.word : null,
            mask: s.word && !isDrawer && s.phase === 'draw' ? hintMask(s.word, s.hintOrder, fraction, s.hints) : null,
            guessed: s.guessed, done: s.guessed.includes(pid),
            chat: s.chat ? s.chat.map(m => (m.ok ? { pid: m.pid, ok: true, pts: m.pts } : m)) : [],
            reveal: s.phase === 'reveal' ? s.reveal : null,
            started: s.started, deadline: s.deadline, timerTotal: s.timerTotal, loud: s.loud,
            // public facts about the canvas everyone is looking at: how much ink, and where the first line starts
            ink: s.strokes ? s.strokes.reduce((n, st) => n + st.pts.length / 2, 0) : 0,
            sketch: s.strokes && s.strokes[0] ? s.strokes[0].pts.slice(0, 2) : null,
        };
    },
};
