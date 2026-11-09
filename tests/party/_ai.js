/* AI-vs-AI simulator that mirrors the browser LocalHost (same decide/observe/fire cycle, simulated clock). */
import { makeCtx } from './_harness.js';

export function simulate(mod, ai, { players = ['a', 'b'], difficulty = 'medium', settings = {}, seed = 1, lang = 'en', maxEvents = 20000, humanRole = null } = {}) {
    const ctx = makeCtx(mod, { players, settings, seed, lang });
    const state = mod.setup({ ...ctx });
    if (ai.prepare) ai.prepare(state, null, { mod, ctx, humanRole, difficulty });
    const memory = Object.fromEntries(players.map(p => [p, {}]));
    const pending = {};
    const refused = [];
    const aiCtx = (id, firing) => ({ difficulty, memory: memory[id], rng: ctx.rng, lang, words: ctx.words, settings: ctx.settings, names: ctx.names, firing, now: ctx.now, humanRole, humans: [] });
    let events = 0;
    while (!state.over && events++ < maxEvents) {
        const waiting = mod.awaiting ? mod.awaiting(state) : [];
        const seated = mod.seated ? mod.seated(state) : players;
        for (const b of seated) {
            const v = mod.view(state, b, ctx);
            if (ai.observe) ai.observe(v, b, aiCtx(b, false));
            if (pending[b] !== undefined) continue;
            if (!waiting.includes(b) && !ai.reactive) continue;
            const d = ai.decide(v, b, aiCtx(b, false));
            if (!d) continue;
            pending[b] = ctx.now + Math.max(80, d.delay !== undefined ? d.delay : 1000);
        }
        let nextBot = null, at = Infinity;
        for (const [b, tm] of Object.entries(pending)) if (tm < at) { at = tm; nextBot = b; }
        const dl = state.deadline || Infinity;
        if (at === Infinity && dl === Infinity) throw new Error(`${mod.id}: stuck, nobody to move (seed ${seed})`);
        if (dl <= at) {
            ctx.now = Math.max(ctx.now, dl);
            mod.tick(state, ctx);
            continue;
        }
        ctx.now = Math.max(ctx.now, at);
        delete pending[nextBot];
        const d = ai.decide(mod.view(state, nextBot, ctx), nextBot, aiCtx(nextBot, true));
        if (!d) continue;
        const res = mod.act(state, nextBot, d.action || d, ctx) || {};
        if (res.error) {
            refused.push({ pid: nextBot, action: d.action || d, error: res.error });
            if (refused.length > 50) throw new Error(`${mod.id}: AI keeps making illegal moves: ${JSON.stringify(refused.slice(-3))}`);
        }
    }
    return { state, refused, events, ctx };
}
