/* Bullshit (Cheat): play 1-4 cards face down claiming the current rank; anyone may call "Bullshit!" in the challenge window. */
import { lowestScore, rank as rankScores } from '../core/helpers.js';

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];
const REVEAL_MS = 3500;
const PLACE_POINTS = [3, 2, 1];

export function makeDeck(copies = 1) {
    const out = [];
    let id = 0;
    for (let k = 0; k < copies; k++) for (const s of SUITS) for (const r of RANKS) out.push({ id: id++, r, s });
    return out;
}

const rankIndex = c => RANKS.indexOf(c.r);
const sortHand = h => h.sort((a, b) => rankIndex(a) - rankIndex(b) || a.s.localeCompare(b.s));

/** True when every played card is of the claimed rank. */
export const honest = (cards, claimed) => cards.every(c => c.r === claimed);

function active(s) { return s.order.filter(id => !s.finished.includes(id)); }
function nextActive(s, from) {
    const n = s.order.length;
    let i = s.order.indexOf(from);
    for (let k = 0; k < n; k++) { i = (i + 1) % n; const id = s.order[i]; if (!s.finished.includes(id)) return id; }
    return null;
}

function setTurnTimer(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function startGame(s, ctx) {
    for (const id of s.pending) {
        if (!s.players.includes(id)) { s.scores[id] = lowestScore(s.scores, s.players); s.players.push(id); s.late.push(id); }
    }
    s.pending = [];
    s.game++;
    s.order = [...s.players];
    const copies = s.order.length > 6 ? 2 : 1;
    const deck = ctx.rng.shuffle(makeDeck(copies));
    s.hands = Object.fromEntries(s.order.map(id => [id, []]));
    deck.forEach((c, i) => s.hands[s.order[i % s.order.length]].push(c));
    for (const id of s.order) sortHand(s.hands[id]);
    s.maxPlay = Math.min(Number(ctx.settings.maxCards) || (copies === 2 ? 8 : 4), copies === 2 ? 8 : 4);
    s.pile = [];
    s.finished = [];
    s.rankIdx = 0;
    s.claim = null;
    s.reveal = null;
    const aceOfSpades = s.order.find(id => s.hands[id].some(c => c.r === 'A' && c.s === '♠'));
    s.turn = aceOfSpades || ctx.rng.pick(s.order);
    s.phase = 'play';
    setTurnTimer(s, ctx);
}

function placeFinished(s, pid) {
    if (s.finished.includes(pid)) return;
    s.finished.push(pid);
}

function maybeEndGame(s, ctx) {
    const left = active(s);
    const fullRanking = s.fullRanking;
    if (s.finished.length && (!fullRanking || left.length <= 1)) {
        if (fullRanking && left.length === 1) placeFinished(s, left[0]);
        s.finished.forEach((id, i) => { s.scores[id] += PLACE_POINTS[i] || 0; });
        s.lastPlaces = [...s.finished];
        if (s.game >= s.games) {
            const ranking = rankScores(s.scores, s.players);
            s.over = { ranking, winners: ranking.filter(r => r.rank === 1).map(r => r.id) };
            s.phase = 'gameEnd';
            s.deadline = null;
            return true;
        }
        s.phase = 'gameEnd';
        s.timerTotal = 5000;
        s.deadline = ctx.now + 5000;
        return true;
    }
    return false;
}

/** After the window (or a resolved call): finish the play and move to the next player and rank. */
function resolve(s, ctx, called) {
    const { pid, cards } = s.claim;
    if (called) {
        const truth = honest(cards, s.claim.rank);
        const loser = truth ? called : pid;
        const picked = s.pile.length;
        s.hands[loser].push(...s.pile);
        sortHand(s.hands[loser]);
        s.reveal = { cards, caller: called, liar: !truth, loser, pid, rank: s.claim.rank, count: cards.length, picked };
        s.pile = [];
    } else s.reveal = null;
    if (!s.hands[pid].length) placeFinished(s, pid);
    s.claim = null;
    if (maybeEndGame(s, ctx)) return;
    s.rankIdx = (s.rankIdx + 1) % RANKS.length;
    s.turn = nextActive(s, pid);
    if (s.reveal) {
        s.phase = 'reveal';
        s.timerTotal = REVEAL_MS;
        s.deadline = ctx.now + REVEAL_MS;
    } else {
        s.phase = 'play';
        setTurnTimer(s, ctx);
    }
}

function play(s, pid, ids, ctx) {
    const hand = s.hands[pid];
    const cards = ids.map(id => hand.find(c => c.id === id));
    s.hands[pid] = hand.filter(c => !ids.includes(c.id));
    s.pile.push(...cards);
    s.claim = { pid, cards, rank: RANKS[s.rankIdx], count: cards.length };
    s.phase = 'challenge';
    const ms = Math.round((Number(ctx.settings.window) || 5) * 1000);
    s.timerTotal = ms;
    s.deadline = ctx.now + ms;
}

export default {
    id: 'cheat',
    min: 3,
    max: 12,
    settings: [
        { key: 'window', type: 'int', unit: 's', def: 5, min: 3, max: 15 },
        { key: 'maxCards', type: 'select', def: 'auto', options: ['auto', '2', '3', '4'] },
        { key: 'fullRanking', type: 'bool', def: false },
        { key: 'games', type: 'int', def: 3, min: 1, max: 10 },
        { key: 'timer', type: 'int', unit: 's', def: 30, min: 0, max: 90, step: 5 },
    ],

    setup(ctx) {
        const s = {
            players: [...ctx.players], scores: Object.fromEntries(ctx.players.map(id => [id, 0])), pending: [], late: [],
            game: 0, games: ctx.settings.games, fullRanking: ctx.settings.fullRanking,
        };
        startGame(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || !s.order.includes(pid)) return { error: 'illegal' };
        if (s.phase === 'challenge' && a.call) {
            if (pid === s.claim.pid || s.finished.includes(pid)) return { error: 'illegal' };
            resolve(s, ctx, pid);
            return {};
        }
        if (s.phase !== 'play') return { error: 'illegal' };
        if (pid !== s.turn) return { error: 'not_your_turn' };
        const ids = Array.isArray(a.cards) ? [...new Set(a.cards.map(Number))] : [];
        if (ids.length < 1 || ids.length > s.maxPlay) return { error: 'cheat.count' };
        if (!ids.every(id => s.hands[pid].some(c => c.id === id))) return { error: 'illegal' };
        play(s, pid, ids, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'challenge') { resolve(s, ctx, null); return; }
        if (s.phase === 'reveal') { s.phase = 'play'; s.reveal = null; setTurnTimer(s, ctx); return; }
        if (s.phase === 'gameEnd') { startGame(s, ctx); return; }
        // Turn timer: play one card, of the right rank if possible
        const hand = s.hands[s.turn];
        const right = hand.find(c => c.r === RANKS[s.rankIdx]);
        play(s, s.turn, [(right || ctx.rng.pick(hand)).id], ctx);
    },

    join(s, pid) { if (!s.players.includes(pid) && !s.pending.includes(pid)) s.pending.push(pid); },
    awaiting: s => (s.phase === 'play' && !s.over ? [s.turn] : []),
    seated: s => s.players,

    view(s, pid) {
        return {
            phase: s.phase, game: s.game, games: s.games, players: s.players, order: s.order, scores: s.scores, pending: s.pending, late: s.late,
            turn: s.turn, rank: RANKS[s.rankIdx], nextRank: RANKS[(s.rankIdx + 1) % RANKS.length], maxPlay: s.maxPlay,
            counts: Object.fromEntries(s.order.map(id => [id, s.hands[id].length])), pileCount: s.pile.length,
            mine: s.hands[pid] || null,
            claim: s.claim ? { pid: s.claim.pid, rank: s.claim.rank, count: s.claim.count } : null,   // never the cards themselves
            reveal: s.reveal, finished: s.finished, lastPlaces: s.lastPlaces || null,
            deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
