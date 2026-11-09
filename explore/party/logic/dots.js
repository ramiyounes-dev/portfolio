/* Dots and Boxes: draw one line per turn; closing a box claims it and you play again. Most boxes wins. */
import { lowestScore, finish, nextInOrder } from '../core/helpers.js';

export function sizeFor(n, setting) {
    if (setting && setting !== 'auto') return Number(setting);
    return n <= 2 ? 4 : n <= 4 ? 5 : 6;
}

/* Edge indexes: horizontal lines h[r*C + c] (r 0..R), vertical v[r*(C+1) + c] (c 0..C). */
export function boxSides(s, r, c) {
    const C = s.C;
    return [s.h[r * C + c], s.h[(r + 1) * C + c], s.v[r * (C + 1) + c], s.v[r * (C + 1) + c + 1]];
}

/** Boxes touched by an edge. */
function boxesOf(s, kind, r, c) {
    const out = [];
    if (kind === 'h') { if (r > 0) out.push([r - 1, c]); if (r < s.R) out.push([r, c]); }
    else { if (c > 0) out.push([r, c - 1]); if (c < s.C) out.push([r, c]); }
    return out;
}

export function scoresOf(s) {
    const sc = {};
    for (const id of s.players) sc[id] = (s.bonus[id] || 0);
    for (const o of s.boxes) if (o) sc[o] = (sc[o] || 0) + 1;
    return sc;
}

function setTurnTimer(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function draw(s, pid, kind, r, c, ctx) {
    const idx = kind === 'h' ? r * s.C + c : r * (s.C + 1) + c;
    (kind === 'h' ? s.h : s.v)[idx] = pid;
    s.last = { kind, r, c };
    let claimed = 0;
    for (const [br, bc] of boxesOf(s, kind, r, c)) {
        if (!s.boxes[br * s.C + bc] && boxSides(s, br, bc).every(Boolean)) { s.boxes[br * s.C + bc] = pid; claimed++; }
    }
    if (s.h.every(Boolean) && s.v.every(Boolean)) {
        s.over = finish(scoresOf(s), s.players);
        s.turn = null;
        s.deadline = null;
        return;
    }
    if (!claimed) s.turn = nextInOrder(s.players, pid);
    setTurnTimer(s, ctx);
}

export function freeEdges(s) {
    const out = [];
    s.h.forEach((o, i) => { if (!o) out.push({ kind: 'h', r: Math.floor(i / s.C), c: i % s.C }); });
    s.v.forEach((o, i) => { if (!o) out.push({ kind: 'v', r: Math.floor(i / (s.C + 1)), c: i % (s.C + 1) }); });
    return out;
}

export default {
    id: 'dots',
    min: 2,
    max: 6,
    settings: [
        { key: 'size', type: 'select', def: 'auto', options: ['auto', '3', '4', '5', '6', '7'] },
        { key: 'lateBonus', type: 'bool', def: true },
        { key: 'timer', type: 'int', unit: 's', def: 20, min: 0, max: 60, step: 5 },
    ],

    setup(ctx) {
        const n = sizeFor(ctx.players.length, ctx.settings.size);
        const s = {
            players: [...ctx.players], R: n, C: n,
            h: Array((n + 1) * n).fill(null), v: Array(n * (n + 1)).fill(null), boxes: Array(n * n).fill(null),
            bonus: {}, late: [], last: null,
        };
        s.turn = s.players[0];
        setTurnTimer(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over) return { error: 'illegal' };
        if (pid !== s.turn) return { error: 'not_your_turn' };
        const kind = a.kind, r = Number(a.r), c = Number(a.c);
        const ok = kind === 'h' ? (r >= 0 && r <= s.R && c >= 0 && c < s.C) : kind === 'v' ? (r >= 0 && r < s.R && c >= 0 && c <= s.C) : false;
        if (!ok || !Number.isInteger(r) || !Number.isInteger(c)) return { error: 'illegal' };
        if ((kind === 'h' ? s.h[r * s.C + c] : s.v[r * (s.C + 1) + c])) return { error: 'illegal' };
        draw(s, pid, kind, r, c, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        const e = ctx.rng.pick(freeEdges(s));
        draw(s, s.turn, e.kind, e.r, e.c, ctx);
    },

    /* Late joiner: enters the turn order at the end of the current rotation, 0 boxes, bonus = lowest score. */
    join(s, pid, ctx) {
        if (s.players.includes(pid) || s.players.length >= 6) return;
        if (ctx.settings.lateBonus) s.bonus[pid] = lowestScore(scoresOf(s), s.players);
        s.players.push(pid);
        s.late.push(pid);
    },

    awaiting: s => (s.over ? [] : [s.turn]),
    seated: s => s.players,

    view(s) {
        return {
            R: s.R, C: s.C, h: s.h, v: s.v, boxes: s.boxes, turn: s.turn, players: s.players, last: s.last,
            scores: scoresOf(s), bonus: s.bonus, late: s.late, deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
