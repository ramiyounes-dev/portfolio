/* Memory: flip two cards; a pair stays with you and you play again. Faces of hidden cards never leave the server. */
import { lowestScore, finish, nextInOrder } from '../core/helpers.js';

/* Card faces are picture names from the drawing library (ai/drawings.js); the browser draws them. */
const NATURE = ['sun', 'moon', 'star', 'cloud', 'rain', 'rainbow', 'snowman', 'tree', 'flower', 'cactus', 'mushroom', 'leaf', 'cat', 'dog', 'pig',
    'snake', 'spider', 'butterfly', 'bee', 'snail', 'turtle', 'bird', 'penguin', 'owl', 'whale', 'fish', 'bat', 'mountain', 'island', 'volcano'];
const OBJECTS = ['house', 'castle', 'tent', 'bridge', 'car', 'bus', 'train', 'plane', 'rocket', 'boat', 'bicycle', 'umbrella', 'key', 'glasses', 'hat',
    'shoe', 'shirt', 'clock', 'lamp', 'candle', 'book', 'pencil', 'scissors', 'guitar', 'drum', 'ball', 'kite', 'balloon', 'gift', 'crown', 'sword',
    'phone', 'anchor', 'ladder', 'chair', 'bed', 'hammer', 'trophy'];
export const THEMES = {
    mixed: [...NATURE, ...OBJECTS, 'apple', 'banana', 'cherry', 'pear', 'carrot', 'pizza', 'cake', 'cup', 'egg', 'heart', 'robot', 'ghost', 'lighthouse', 'windmill'],
    nature: NATURE,
    objects: OBJECTS,
};

export function cardsFor(n, setting) {
    if (setting && setting !== 'auto') return Number(setting);
    return n <= 2 ? 16 : n === 3 ? 20 : n === 4 ? 24 : n === 5 ? 30 : 36;
}

function setTurnTimer(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function scores(s) {
    const sc = {};
    for (const id of s.players) sc[id] = (s.bonus[id] || 0) + (s.pairs[id] || 0);
    return sc;
}

function endTurn(s, ctx, keep) {
    s.flipped = [];
    if (s.matched.every(Boolean)) {
        s.over = finish(scores(s), s.players);
        s.turn = null;
        s.deadline = null;
        return;
    }
    if (!keep) s.turn = nextInOrder(s.players, s.turn);
    s.phase = 'pick';
    setTurnTimer(s, ctx);
}

function flip(s, pid, i, ctx) {
    s.flipped.push(i);
    if (s.flipped.length < 2) return;
    const [a, b] = s.flipped;
    if (s.faces[a] === s.faces[b]) {
        s.matched[a] = pid; s.matched[b] = pid;
        s.pairs[pid] = (s.pairs[pid] || 0) + 1;
        s.lastMatch = [a, b];
        endTurn(s, ctx, true);
    } else {
        s.phase = 'showing';
        const ms = Math.round((ctx.settings.reveal || 1.5) * 1000);
        s.timerTotal = ms;
        s.deadline = ctx.now + ms;
    }
}

export default {
    id: 'memory',
    min: 2,
    max: 8,
    settings: [
        { key: 'size', type: 'select', def: 'auto', options: ['auto', '16', '20', '24', '30', '36'] },
        { key: 'theme', type: 'select', def: 'mixed', options: ['mixed', 'nature', 'objects'] },
        { key: 'reveal', type: 'select', def: '1.5', options: ['1', '1.5', '2.5'] },
        { key: 'timer', type: 'int', unit: 's', def: 20, min: 0, max: 60, step: 5 },
    ],

    setup(ctx) {
        const n = cardsFor(ctx.players.length, ctx.settings.size);
        const icons = ctx.rng.shuffle([...(THEMES[ctx.settings.theme] || THEMES.mixed)]).slice(0, n / 2);
        const faces = ctx.rng.shuffle([...icons, ...icons]);
        const s = {
            players: [...ctx.players], faces, matched: Array(n).fill(null), flipped: [], pairs: {}, bonus: {}, late: [],
            phase: 'pick', lastMatch: null,
        };
        s.turn = s.players[0];
        setTurnTimer(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || s.phase !== 'pick') return { error: 'illegal' };
        if (pid !== s.turn) return { error: 'not_your_turn' };
        const i = Number(a.card);
        if (!Number.isInteger(i) || i < 0 || i >= s.faces.length || s.matched[i] || s.flipped.includes(i)) return { error: 'illegal' };
        flip(s, pid, i, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'showing') { endTurn(s, ctx, false); return; }
        endTurn(s, ctx, false);   // turn timer ran out: the turn passes
    },

    join(s, pid) {
        if (s.players.includes(pid) || s.players.length >= 8) return;
        s.bonus[pid] = lowestScore(scores(s), s.players);
        s.players.push(pid);
        s.late.push(pid);
    },

    awaiting: s => (s.phase === 'pick' && !s.over ? [s.turn] : []),
    seated: s => s.players,

    view(s) {
        const visible = new Set(s.flipped);
        return {
            n: s.faces.length, phase: s.phase, turn: s.turn, players: s.players, late: s.late, scores: scores(s),
            cards: s.faces.map((f, i) => (s.matched[i] || visible.has(i) || s.over ? f : null)),
            matched: s.matched, flipped: s.flipped, lastMatch: s.lastMatch,
            deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
