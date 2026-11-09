/* Blackjack AI. Sees what every player sees (the dealer's up card, never the hole card or the shoe order).
   Easy: hunches (hits below 15, random bets). Medium: simplified basic strategy, steady bets.
   Hard: full basic strategy (soft totals, pairs, doubling) and bets that grow when it is behind late in the game. */
import { handValue, rankOf } from '../logic/blackjack.js';
import { think } from './common.js';

const val = r => (r === 'A' ? 11 : ['J', 'Q', 'K', '10'].includes(r) ? 10 : Number(r));

/** Basic strategy for 6 decks, dealer stands on soft 17. Returns 'hit' | 'stand' | 'double' | 'split'. */
export function basic(cards, up, canDouble, canSplit) {
    const d = val(up);
    const { total, soft } = handValue(cards);
    if (canSplit && cards.length === 2 && rankOf(cards[0]) === rankOf(cards[1])) {
        const p = val(rankOf(cards[0]));
        if (p === 11 || p === 8) return 'split';
        if (p === 9 && ![7, 10, 11].includes(d)) return 'split';
        if ((p === 2 || p === 3 || p === 7) && d <= 7) return 'split';
        if (p === 6 && d <= 6) return 'split';
        if (p === 4 && (d === 5 || d === 6)) return 'split';
    }
    if (soft) {
        if (total >= 19) return 'stand';
        if (total === 18) { if (canDouble && d >= 3 && d <= 6) return 'double'; return d >= 9 ? 'hit' : 'stand'; }
        if (canDouble && ((total === 17 && d >= 3 && d <= 6) || ((total === 15 || total === 16) && d >= 4 && d <= 6) || (total <= 14 && (d === 5 || d === 6)))) return 'double';
        return 'hit';
    }
    if (total >= 17) return 'stand';
    if (total >= 13) return d <= 6 ? 'stand' : 'hit';
    if (total === 12) return d >= 4 && d <= 6 ? 'stand' : 'hit';
    if (total === 11) return canDouble ? 'double' : 'hit';
    if (total === 10) return canDouble && d <= 9 ? 'double' : 'hit';
    if (total === 9) return canDouble && d >= 3 && d <= 6 ? 'double' : 'hit';
    return 'hit';
}

export function chooseMove(v, me, difficulty, rng) {
    const hand = v.hands[me][v.turn.h];
    const up = rankOf(v.dealer[0]);
    const chips = v.chips[me];
    const first = hand.cards.length === 2;
    const canDouble = first && chips >= hand.bet;
    const canSplit = first && chips >= hand.bet && v.hands[me].length < 4;
    const { total, soft } = handValue(hand.cards);
    if (difficulty === 'easy') return total < (rng() < 0.5 ? 15 : 16) ? 'hit' : 'stand';
    if (difficulty === 'medium') {
        if (canSplit && rankOf(hand.cards[0]) === rankOf(hand.cards[1]) && ['A', '8'].includes(rankOf(hand.cards[0]))) return 'split';
        if (canDouble && total === 11 && !soft) return 'double';
        if (soft) return total >= 18 ? 'stand' : 'hit';
        if (total >= 17) return 'stand';
        return total >= 13 && val(up) <= 6 ? 'stand' : 'hit';
    }
    return basic(hand.cards, up, canDouble, canSplit);
}

export function chooseBet(v, me, difficulty, rng) {
    const chips = v.chips[me], min = v.minBet;
    const round10 = x => Math.max(min, Math.min(chips, Math.round(x / 10) * 10));
    if (difficulty === 'easy') return round10(chips * (0.05 + rng() * 0.25));
    if (difficulty === 'medium') return round10(Math.max(v.start * 0.05, chips * 0.08));
    const leader = Math.max(...v.players.map(id => v.chips[id] + (v.bets[id] || 0)));
    const late = v.round >= v.rounds - 2;
    if (late && chips < leader) return round10(Math.min(chips, leader - chips + min));
    return round10(chips * 0.1);
}

export default {
    decide(v, me, ctx) {
        if (v.phase === 'bet' && !v.bets[me] && v.chips[me] >= v.minBet) {
            if (ctx.memory.betRound !== v.round) { ctx.memory.betRound = v.round; ctx.memory.bet = chooseBet(v, me, ctx.difficulty, ctx.rng); }
            return { action: { bet: ctx.memory.bet }, delay: think(ctx.rng, 800, 2000) };
        }
        if (v.phase === 'bet' && v.rebuys && v.chips[me] < v.minBet && !v.bets[me]) return { action: { rebuy: true }, delay: think(ctx.rng) };
        if (v.phase !== 'play' || !v.turn || v.turn.id !== me) return null;
        const key = v.round + ':' + v.turn.h + ':' + v.hands[me][v.turn.h].cards.join();
        if (ctx.memory.key !== key) { ctx.memory.key = key; ctx.memory.plan = chooseMove(v, me, ctx.difficulty, ctx.rng); }
        return { action: { move: ctx.memory.plan }, delay: think(ctx.rng, 600, 1400) };
    },
};
