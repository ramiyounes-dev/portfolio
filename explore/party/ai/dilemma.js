/* Prisoner's Dilemma AI: every AI player gets a hidden personality, revealed on the results screen.
   Easy: naive personalities. Medium: classic reciprocal strategies. Hard: adaptive (forgiving tit-for-tat that
   exploits unconditional cooperators and defects in the final round when the round count is public). */
import { think, pick } from './common.js';

export const PERSONALITIES = {
    dove: { en: 'Always cooperates', fr: 'Coopère toujours', level: 'easy' },
    random: { en: 'Flips a coin', fr: 'Joue à pile ou face', level: 'easy' },
    hawk: { en: 'Always betrays', fr: 'Trahit toujours', level: 'easy' },
    tft: { en: 'Tit for tat: copies your last move', fr: 'Donnant-donnant : copie ton dernier coup', level: 'medium' },
    grudger: { en: 'Grudger: cooperates until betrayed once', fr: 'Rancunier : coopère jusqu\'à la première trahison', level: 'medium' },
    pavlov: { en: 'Pavlov: repeats what worked', fr: 'Pavlov : répète ce qui a marché', level: 'medium' },
    adaptive: { en: 'Adaptive: forgiving, but punishes and exploits', fr: 'Adaptatif : pardonne, mais punit et exploite', level: 'hard' },
    tf2t: { en: 'Tit for two tats: forgives one betrayal', fr: 'Donnant-donnant indulgent : pardonne une trahison', level: 'hard' },
};

/** Everything this partner did against me, oldest first: [{ mine, theirs }] */
function together(v, me, partner) {
    const out = [];
    for (const h of v.history || []) for (const r of h.rows) {
        if (r.a === me && r.b === partner) out.push({ mine: r.ca, theirs: r.cb });
        if (r.b === me && r.a === partner) out.push({ mine: r.cb, theirs: r.ca });
    }
    return out;
}
function overall(v, partner) {
    let c = 0, n = 0;
    for (const h of v.history || []) for (const r of h.rows) {
        if (r.a === partner) { n++; if (r.ca === 'C') c++; }
        if (r.b === partner) { n++; if (r.cb === 'C') c++; }
    }
    return n ? c / n : null;
}

export function chooseMove(personality, v, me, rng) {
    const past = together(v, me, v.partner);
    const last = past[past.length - 1];
    const rate = overall(v, v.partner);
    switch (personality) {
        case 'dove': return 'C';
        case 'hawk': return 'B';
        case 'random': return rng() < 0.5 ? 'C' : 'B';
        case 'tft': return last ? last.theirs : (rate !== null && rate < 0.3 ? 'B' : 'C');
        case 'grudger': return past.some(p => p.theirs === 'B') ? 'B' : 'C';
        case 'pavlov': if (!last) return 'C'; return last.theirs === 'C' ? last.mine : (last.mine === 'C' ? 'B' : 'C');
        case 'tf2t': return past.length >= 2 && past.slice(-2).every(p => p.theirs === 'B') ? 'B' : 'C';
        case 'adaptive': default: {
            if (v.rounds && v.round >= v.rounds) return 'B';                     // nothing left to protect
            if (rate !== null && rate > 0.9 && (v.history || []).length >= 4 && rng() < 0.35) return 'B';  // exploit a pushover
            if (rate !== null && rate < 0.25) return 'B';
            if (last && last.theirs === 'B') return rng() < 0.15 ? 'C' : 'B';     // punish, sometimes forgive
            return 'C';
        }
    }
}

export default {
    reveal: mem => (mem.personality ? PERSONALITIES[mem.personality] : null),
    decide(v, me, ctx) {
        const mem = ctx.memory;
        if (!mem.personality) {
            const pool = Object.keys(PERSONALITIES).filter(k => PERSONALITIES[k].level === ctx.difficulty);
            mem.personality = pick(ctx.rng, pool);
        }
        if (v.phase !== 'choose' || !v.partner || v.mine) return null;
        if (mem.planRound !== v.round) { mem.plan = chooseMove(mem.personality, v, me, ctx.rng); mem.planRound = v.round; }
        return { action: { choice: mem.plan }, delay: think(ctx.rng, 900, 2600) };
    },
};
