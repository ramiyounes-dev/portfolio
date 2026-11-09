/* UNO (classic rules): private hands, Wild Draw Four challenge, UNO call / catch, optional stacking, play to 500. */
import { lowestScore, rank } from '../core/helpers.js';

export const COLORS = ['R', 'Y', 'G', 'B'];
const HAND_END_MS = 6000;

export function makeDeck(copies = 1) {
    const deck = [];
    let id = 0;
    for (let k = 0; k < copies; k++) {
        for (const c of COLORS) {
            deck.push({ id: id++, c, v: '0' });
            for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'S', 'R', 'D']) { deck.push({ id: id++, c, v }); deck.push({ id: id++, c, v }); }
        }
        for (let i = 0; i < 4; i++) { deck.push({ id: id++, c: null, v: 'W' }); deck.push({ id: id++, c: null, v: 'W4' }); }
    }
    return deck;
}

export const cardPoints = card => (card.v === 'W' || card.v === 'W4' ? 50 : ['S', 'R', 'D'].includes(card.v) ? 20 : Number(card.v));

/** Can `card` go on the pile? (W4 legality against the colour rule is checked separately.) */
export function matches(card, top, color) {
    if (card.v === 'W' || card.v === 'W4') return true;
    return card.c === color || card.v === top.v;
}

function next(s, from, steps = 1) {
    const n = s.order.length;
    let i = s.order.indexOf(from);
    for (let k = 0; k < steps; k++) i = (i + s.dir + n) % n;
    return s.order[i];
}

function setTurn(s, pid, ctx) {
    s.turn = pid;
    s.drawn = null;
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function drawCards(s, pid, n, ctx) {
    const got = [];
    for (let i = 0; i < n; i++) {
        if (!s.pile.length) {
            const top = s.discard.pop();
            s.pile = ctx.rng.shuffle(s.discard.map(c => (c.v === 'W' || c.v === 'W4' ? { ...c, c: null } : c)));
            s.discard = [top];
            if (!s.pile.length) break;   // every card is in someone's hand
        }
        const card = s.pile.pop();
        s.hands[pid].push(card);
        got.push(card);
    }
    if (s.hands[pid].length > 1) { delete s.unoSafe[pid]; if (s.vulnerable === pid) s.vulnerable = null; }
    return got;
}

function log(s, entry) { s.logSeq = (s.logSeq || 0) + 1; s.log.push({ ...entry, seq: s.logSeq }); if (s.log.length > 8) s.log.shift(); }

function startHand(s, ctx) {
    for (const id of s.pending) {
        if (!s.players.includes(id)) { s.scores[id] = lowestScore(s.scores, s.players); s.players.push(id); s.late.push(id); }
    }
    s.pending = [];
    s.hand++;
    s.order = [...s.players];
    s.dealer = s.hand === 1 ? s.order[s.order.length - 1] : next({ order: s.order, dir: 1 }, s.dealer || s.order[0]);
    s.pile = ctx.rng.shuffle(makeDeck(s.order.length > 8 ? 2 : 1));
    s.hands = {};
    for (const id of s.order) s.hands[id] = s.pile.splice(-7, 7);
    s.discard = [];
    s.dir = 1;
    s.pendingDraw = 0;
    s.pendingType = null;
    s.challenge = null;
    s.vulnerable = null;
    s.unoSafe = {};
    s.needColor = null;
    s.result = null;
    s.log = [];
    s.phase = 'play';
    // Flip the first card; a Wild Draw Four goes back in
    let first = s.pile.pop();
    while (first.v === 'W4') { s.pile.unshift(first); s.pile = ctx.rng.shuffle(s.pile); first = s.pile.pop(); }
    s.discard.push(first);
    s.color = first.c;
    let starter = next(s, s.dealer);
    if (first.v === 'R') { s.dir = s.order.length === 2 ? 1 : -1; starter = s.order.length === 2 ? next(s, s.dealer, 2) : next(s, s.dealer); }
    if (first.v === 'S') starter = next(s, starter);
    if (first.v === 'D') { drawCards(s, starter, 2, ctx); starter = next(s, starter); }
    setTurn(s, starter, ctx);
    if (first.v === 'W') s.needColor = starter;
}

function endHand(s, winner, ctx) {
    let pts = 0;
    for (const id of s.order) if (id !== winner) pts += s.hands[id].reduce((a, c) => a + cardPoints(c), 0);
    s.scores[winner] += pts;
    s.result = { winner, pts, hands: Object.fromEntries(s.order.map(id => [id, s.hands[id]])) };
    s.phase = 'handEnd';
    s.turn = null;
    const target = s.target === 'single' ? 0 : Number(s.target);
    if (!target || s.scores[winner] >= target) {
        const ranking = rank(s.scores, s.players);
        s.over = { ranking, winners: target ? ranking.filter(r => r.rank === 1).map(r => r.id) : [winner] };
        s.deadline = null;
        return;
    }
    s.timerTotal = HAND_END_MS;
    s.deadline = ctx.now + HAND_END_MS;
}

/** Apply a played card's effect and move the turn. */
function afterPlay(s, pid, card, ctx) {
    const victim = next(s, pid);
    if (!s.hands[pid].length) {
        // The last card's draw still applies, then the hand is scored
        if (card.v === 'D') drawCards(s, victim, s.pendingDraw || 2, ctx);
        if (card.v === 'W4') drawCards(s, victim, s.pendingDraw || 4, ctx);
        s.pendingDraw = 0;
        endHand(s, pid, ctx);
        return;
    }
    switch (card.v) {
        case 'S': setTurn(s, next(s, pid, 2), ctx); return;
        case 'R':
            if (s.order.length === 2) { setTurn(s, pid, ctx); return; }
            s.dir *= -1;
            setTurn(s, next(s, pid), ctx);
            return;
        case 'D':
            s.pendingDraw += 2;
            s.pendingType = 'D';
            if (s.stacking) { setTurn(s, victim, ctx); return; }
            drawCards(s, victim, s.pendingDraw, ctx);
            log(s, { k: 'drew', p: victim, n: s.pendingDraw });
            s.pendingDraw = 0;
            setTurn(s, next(s, pid, 2), ctx);
            return;
        case 'W4':
            s.pendingDraw += 4;
            s.pendingType = 'W4';
            if (s.challengeOn && s.pendingDraw === 4) {
                s.phase = 'challenge';
                setTurn(s, victim, ctx);
                return;
            }
            if (s.stacking) { setTurn(s, victim, ctx); return; }
            drawCards(s, victim, s.pendingDraw, ctx);
            log(s, { k: 'drew', p: victim, n: s.pendingDraw });
            s.pendingDraw = 0;
            setTurn(s, next(s, pid, 2), ctx);
            return;
        default:
            setTurn(s, victim, ctx);
    }
}

function legalPlay(s, pid, card) {
    const top = s.discard[s.discard.length - 1];
    if (s.pendingDraw) return s.stacking && card.v === s.pendingType;   // only stack the same draw card
    if (!matches(card, top, s.color)) return false;
    if (card.v === 'W4' && !s.challengeOn) return !s.hands[pid].some(c => c.id !== card.id && c.c === s.color);
    return true;
}

export default {
    id: 'uno',
    min: 2,
    max: 12,
    settings: [
        { key: 'target', type: 'select', def: '500', options: ['100', '200', '300', '500', 'single'] },
        { key: 'stacking', type: 'bool', def: false },
        { key: 'challenge', type: 'bool', def: true },
        { key: 'timer', type: 'int', unit: 's', def: 30, min: 0, max: 90, step: 5 },
    ],

    setup(ctx) {
        const s = {
            players: [...ctx.players], scores: Object.fromEntries(ctx.players.map(id => [id, 0])), pending: [], late: [], hand: 0,
            target: ctx.settings.target, stacking: ctx.settings.stacking, challengeOn: ctx.settings.challenge,
        };
        startHand(s, ctx);
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || s.phase === 'handEnd') return { error: 'illegal' };
        if (!s.order.includes(pid)) return { error: 'not_your_turn' };

        // UNO call (any time you hold 2 cards on your turn, or 1 card while still vulnerable)
        if (a.uno) {
            const n = s.hands[pid].length;
            if ((n === 2 && s.turn === pid) || (n === 1 && s.vulnerable === pid)) {
                s.unoSafe[pid] = true;
                if (s.vulnerable === pid) s.vulnerable = null;
                log(s, { k: 'uno', p: pid });
                return {};
            }
            return { error: 'illegal' };
        }
        // Catch someone who forgot to call UNO
        if (a.catch) {
            if (!s.vulnerable || s.vulnerable === pid || a.catch !== s.vulnerable) return { error: 'illegal' };
            const target = s.vulnerable;
            s.vulnerable = null;
            drawCards(s, target, 2, ctx);
            log(s, { k: 'caught', p: target, by: pid });
            return {};
        }

        if (s.turn !== pid) return { error: 'not_your_turn' };
        if (s.vulnerable && s.vulnerable !== pid) s.vulnerable = null;   // the next player has started: too late to catch

        if (s.needColor === pid) {
            if (!COLORS.includes(a.color)) return { error: 'uno.pickColor' };
            s.color = a.color;
            s.needColor = null;
            return {};
        }

        if (s.phase === 'challenge') {
            const offender = next({ order: s.order, dir: -s.dir }, pid);
            const prevColor = s.challengeColor;
            if (a.challenge) {
                const guilty = s.hands[offender].some(c => c.c === prevColor);
                s.phase = 'play';
                s.pendingDraw = 0;
                if (guilty) { drawCards(s, offender, 4, ctx); log(s, { k: 'guilty', p: offender, by: pid }); setTurn(s, pid, ctx); }
                else { drawCards(s, pid, 6, ctx); log(s, { k: 'innocent', p: offender, by: pid }); setTurn(s, next(s, pid), ctx); }
                return {};
            }
            if (a.accept) {
                s.phase = 'play';
                drawCards(s, pid, 4, ctx);
                log(s, { k: 'drew', p: pid, n: 4 });
                s.pendingDraw = 0;
                setTurn(s, next(s, pid), ctx);
                return {};
            }
            return { error: 'illegal' };
        }

        if (a.draw) {
            if (s.drawn !== null) return { error: 'illegal' };
            if (s.pendingDraw) {
                // Stacking: no matching draw card (or chose not to) -> take the whole stack
                drawCards(s, pid, s.pendingDraw, ctx);
                log(s, { k: 'drew', p: pid, n: s.pendingDraw });
                s.pendingDraw = 0;
                setTurn(s, next(s, pid), ctx);
                return {};
            }
            const [card] = drawCards(s, pid, 1, ctx);
            log(s, { k: 'drew', p: pid, n: 1 });
            if (card && legalPlay(s, pid, card)) { s.drawn = card.id; return {}; }
            setTurn(s, next(s, pid), ctx);
            return {};
        }
        if (a.pass) {
            if (s.drawn === null) return { error: 'illegal' };
            setTurn(s, next(s, pid), ctx);
            return {};
        }

        const hand = s.hands[pid];
        const idx = hand.findIndex(c => c.id === a.card);
        if (idx < 0) return { error: 'illegal' };
        const card = hand[idx];
        if (s.drawn !== null && card.id !== s.drawn) return { error: 'illegal' };
        if (!legalPlay(s, pid, card)) return { error: 'illegal' };
        if ((card.v === 'W' || card.v === 'W4') && !COLORS.includes(a.color)) return { error: 'uno.pickColor' };

        s.challengeColor = s.color;            // remembered for a Wild Draw Four challenge
        hand.splice(idx, 1);
        s.discard.push(card.v === 'W' || card.v === 'W4' ? { ...card, c: a.color } : card);
        s.color = card.v === 'W' || card.v === 'W4' ? a.color : card.c;
        log(s, { k: 'play', p: pid, card: { c: s.color, v: card.v } });
        if (hand.length === 1 && !s.unoSafe[pid]) s.vulnerable = pid;
        if (hand.length !== 1) delete s.unoSafe[pid];
        afterPlay(s, pid, card, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'handEnd') { startHand(s, ctx); return; }
        const pid = s.turn;
        if (s.needColor === pid) { s.color = ctx.rng.pick(COLORS); s.needColor = null; }
        if (s.phase === 'challenge') { this.act(s, pid, { accept: true }, ctx); return; }
        if (s.drawn !== null) { setTurn(s, next(s, pid), ctx); return; }
        this.act(s, pid, { draw: true }, ctx);
        if (s.turn === pid && s.drawn !== null) setTurn(s, next(s, pid), ctx);
    },

    join(s, pid) { if (!s.players.includes(pid) && !s.pending.includes(pid)) s.pending.push(pid); },
    awaiting: s => (s.over || s.phase === 'handEnd' ? [] : [s.turn]),
    seated: s => s.players,

    view(s, pid) {
        const mine = s.hands[pid] || null;
        const top = s.discard[s.discard.length - 1];
        const playable = mine && s.turn === pid && s.phase === 'play' && s.needColor !== pid
            ? mine.filter(c => (s.drawn === null || c.id === s.drawn) && legalPlay(s, pid, c)).map(c => c.id) : [];
        return {
            phase: s.phase, hand: s.hand, players: s.players, order: s.order, scores: s.scores, pending: s.pending, late: s.late,
            target: s.target, turn: s.turn, dir: s.dir, dealer: s.dealer, top, color: s.color,
            counts: Object.fromEntries(s.order.map(id => [id, s.hands[id].length])),
            mine, playable, drawn: s.turn === pid ? s.drawn : null, needColor: s.needColor === pid,
            pendingDraw: s.pendingDraw, stacking: s.stacking, pileCount: s.pile.length,
            vulnerable: s.vulnerable, unoSafe: s.unoSafe, log: s.log,
            result: s.phase === 'handEnd' || s.over ? s.result : null,
            deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
