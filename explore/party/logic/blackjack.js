/* Blackjack: everyone plays the automated dealer and races for chips. The dealer's hole card stays hidden until it plays. */
import { rank } from '../core/helpers.js';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];
const DECKS = 6;
const MIN_BET = 10;
const BET_MS = 20_000;
const SETTLE_MS = 6000;

export function makeShoe(rng, decks = DECKS) {
    const shoe = [];
    for (let d = 0; d < decks; d++) for (const s of SUITS) for (const r of RANKS) shoe.push(r + s);
    return rng.shuffle(shoe);
}

export const rankOf = c => c.slice(0, -1);
const cardValue = c => { const r = rankOf(c); return r === 'A' ? 1 : ['J', 'Q', 'K'].includes(r) ? 10 : Number(r); };

/** Best total and whether it is soft (an ace counted as 11). */
export function handValue(cards) {
    let total = cards.reduce((a, c) => a + cardValue(c), 0);
    const hasAce = cards.some(c => rankOf(c) === 'A');
    if (hasAce && total + 10 <= 21) return { total: total + 10, soft: true };
    return { total, soft: false };
}

export const isBlackjack = cards => cards.length === 2 && handValue(cards).total === 21;

function draw(s, ctx) {
    if (!s.shoe.length) s.shoe = makeShoe(ctx.rng);
    return s.shoe.pop();
}

function setTimer(s, ctx, ms) { s.timerTotal = ms; s.deadline = ms ? ctx.now + ms : null; }

function startRound(s, ctx) {
    for (const id of s.pending) {
        if (!s.players.includes(id)) {
            const stacks = s.players.map(p => s.chips[p]).filter(x => x > 0);
            const low = stacks.length ? Math.min(...stacks) : s.start;
            s.chips[id] = Math.max(MIN_BET, Math.min(s.start, low));
            s.players.push(id); s.late.push(id);
        }
    }
    s.pending = [];
    s.round++;
    if (s.shoe.length < DECKS * 52 * 0.25) { s.shoe = makeShoe(ctx.rng); s.reshuffled = true; } else s.reshuffled = false;
    s.bets = {};
    s.hands = {};
    s.dealer = [];
    s.results = null;
    s.turn = null;
    s.phase = 'bet';
    setTimer(s, ctx, BET_MS);
}

const active = s => s.players.filter(id => s.bets[id]);

function deal(s, ctx) {
    for (const id of active(s)) s.hands[id] = [{ cards: [draw(s, ctx), draw(s, ctx)], bet: s.bets[id], done: false, doubled: false, split: false }];
    s.dealer = [draw(s, ctx), draw(s, ctx)];
    s.phase = 'play';
    s.order = active(s);
    s.turn = null;
    advance(s, ctx);
}

/** Move to the next hand that still needs a decision; otherwise the dealer plays. */
function advance(s, ctx) {
    for (const id of s.order) {
        const hands = s.hands[id];
        for (let h = 0; h < hands.length; h++) {
            const hand = hands[h];
            if (hand.done) continue;
            const v = handValue(hand.cards);
            if (v.total >= 21 || (hand.split && rankOf(hand.cards[0]) === 'A' && hand.cards.length === 2)) { hand.done = true; continue; }
            s.turn = { id, h };
            setTimer(s, ctx, (ctx.settings.timer || 0) * 1000);
            return;
        }
    }
    s.turn = null;
    dealerPlays(s, ctx);
}

function dealerPlays(s, ctx) {
    s.phase = 'dealer';
    const anyLive = s.order.some(id => s.hands[id].some(h => handValue(h.cards).total <= 21));
    if (anyLive) {
        for (;;) {
            const v = handValue(s.dealer);
            if (v.total > 17 || (v.total === 17 && !(v.soft && ctx.settings.soft17 === 'hit'))) break;
            s.dealer.push(draw(s, ctx));
        }
    }
    settle(s, ctx);
}

function settle(s, ctx) {
    const d = handValue(s.dealer);
    const dealerBJ = isBlackjack(s.dealer);
    s.results = {};
    for (const id of s.order) {
        s.results[id] = s.hands[id].map(hand => {
            const v = handValue(hand.cards);
            const bj = isBlackjack(hand.cards) && !hand.split;
            let out, pay;
            if (v.total > 21) { out = 'bust'; pay = 0; }
            else if (bj && !dealerBJ) { out = 'blackjack'; pay = hand.bet * 2.5; }
            else if (dealerBJ && !bj) { out = 'lose'; pay = 0; }
            else if (d.total > 21 || v.total > d.total) { out = 'win'; pay = hand.bet * 2; }
            else if (v.total === d.total) { out = 'push'; pay = hand.bet; }
            else { out = 'lose'; pay = 0; }
            s.chips[id] += pay;
            return { out, net: pay - hand.bet };
        });
    }
    s.phase = 'settle';
    const alive = s.players.filter(id => s.chips[id] >= MIN_BET);
    if (s.round >= s.rounds || (!s.rebuys && alive.length <= 1 && s.players.length > 1)) {
        const ranking = rank(s.chips, s.players);
        s.over = { ranking, winners: ranking.filter(r => r.rank === 1).map(r => r.id) };
        s.deadline = null;
        return;
    }
    setTimer(s, ctx, SETTLE_MS);
}

function finishBetting(s, ctx) {
    for (const id of s.players) {
        if (s.bets[id] || ctx.isAway(id)) continue;
        if (s.chips[id] >= MIN_BET) { s.bets[id] = MIN_BET; s.chips[id] -= MIN_BET; s.autoBet = [...(s.autoBet || []), id]; }
    }
    if (!active(s).length) { setTimer(s, ctx, BET_MS); return; }
    deal(s, ctx);
}

/** The last thing a player did, for the action pill at their seat. seq makes each action unique. */
function note(s, pid, move, amount) { s.actSeq = (s.actSeq || 0) + 1; s.last = { pid, move, amount, seq: s.actSeq }; }

export default {
    id: 'blackjack',
    min: 2,
    max: 12,
    settings: [
        { key: 'rounds', type: 'int', def: 10, min: 3, max: 30 },
        { key: 'start', type: 'select', def: '1000', options: ['500', '1000', '2000'] },
        { key: 'rebuys', type: 'bool', def: false },
        { key: 'soft17', type: 'select', def: 'stand', options: ['stand', 'hit'] },
        { key: 'timer', type: 'int', unit: 's', def: 20, min: 0, max: 60, step: 5 },
    ],

    setup(ctx) {
        const start = Number(ctx.settings.start) || 1000;
        const s = {
            players: [...ctx.players], chips: Object.fromEntries(ctx.players.map(id => [id, start])),
            pending: [], late: [], round: 0, rounds: ctx.settings.rounds, start, rebuys: ctx.settings.rebuys,
            shoe: makeShoe(ctx.rng),
        };
        startRound(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || !s.players.includes(pid)) return { error: 'illegal' };
        if (s.phase === 'bet') {
            if (a.rebuy) {
                if (!s.rebuys || s.chips[pid] >= MIN_BET) return { error: 'illegal' };
                s.chips[pid] = s.start;
                return {};
            }
            if (s.bets[pid]) return { error: 'illegal' };
            const bet = Math.floor(Number(a.bet));
            if (!Number.isFinite(bet) || bet < MIN_BET || bet > s.chips[pid]) return { error: 'bj.badBet' };
            s.bets[pid] = bet;
            s.chips[pid] -= bet;
            note(s, pid, s.chips[pid] === 0 ? 'allIn' : 'bet', bet);
            const ready = s.players.filter(id => s.chips[id] + (s.bets[id] || 0) >= MIN_BET && !ctx.isAway(id));
            if (ready.every(id => s.bets[id])) deal(s, ctx);
            return {};
        }
        if (s.phase !== 'play' || !s.turn || s.turn.id !== pid) return { error: 'not_your_turn' };
        const hands = s.hands[pid];
        const hand = hands[s.turn.h];
        const first = hand.cards.length === 2;
        const before = hand.bet;
        switch (a.move) {
            case 'hit': hand.cards.push(draw(s, ctx)); if (handValue(hand.cards).total >= 21) hand.done = true; break;
            case 'stand': hand.done = true; break;
            case 'double':
                if (!first || s.chips[pid] < hand.bet) return { error: 'illegal' };
                s.chips[pid] -= hand.bet; hand.bet *= 2; hand.doubled = true;
                hand.cards.push(draw(s, ctx)); hand.done = true;
                break;
            case 'split': {
                if (!first || rankOf(hand.cards[0]) !== rankOf(hand.cards[1]) || s.chips[pid] < hand.bet || hands.length >= 4) return { error: 'illegal' };
                s.chips[pid] -= hand.bet;
                const second = { cards: [hand.cards.pop(), draw(s, ctx)], bet: hand.bet, done: false, doubled: false, split: true };
                hand.cards.push(draw(s, ctx));
                hand.split = true;
                hands.splice(s.turn.h + 1, 0, second);
                break;
            }
            default: return { error: 'illegal' };
        }
        note(s, pid, a.move, a.move === 'double' || a.move === 'split' ? before : 0);
        if (handValue(hand.cards).total > 21) note(s, pid, 'bust', 0);
        advance(s, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'bet') finishBetting(s, ctx);
        else if (s.phase === 'play') { if (s.turn) { s.hands[s.turn.id][s.turn.h].done = true; note(s, s.turn.id, 'stand', 0); } advance(s, ctx); }
        else if (s.phase === 'settle') startRound(s, ctx);
    },

    join(s, pid) { if (!s.players.includes(pid) && !s.pending.includes(pid)) s.pending.push(pid); },
    awaiting: s => {
        if (s.over) return [];
        if (s.phase === 'bet') return s.players.filter(id => !s.bets[id] && s.chips[id] >= MIN_BET);
        if (s.phase === 'play' && s.turn) return [s.turn.id];
        return [];
    },
    seated: s => s.players,

    view(s) {
        const hideHole = s.phase === 'play' || s.phase === 'bet';
        return {
            phase: s.phase, round: s.round, rounds: s.rounds, players: s.players, chips: s.chips, bets: s.bets,
            scores: s.chips, pending: s.pending, late: s.late, minBet: MIN_BET, rebuys: s.rebuys, start: s.start,
            hands: Object.fromEntries(Object.entries(s.hands).map(([id, hs]) => [id, hs.map(h => ({ ...h, value: handValue(h.cards) }))])),
            dealer: hideHole && s.dealer.length ? [s.dealer[0], null] : s.dealer,
            dealerValue: hideHole ? (s.dealer.length ? handValue([s.dealer[0]]) : null) : handValue(s.dealer),
            turn: s.turn, results: s.results, last: s.last || null, reshuffled: s.reshuffled, shoeLeft: s.shoe.length,
            deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
