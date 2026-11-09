/* Test helpers: a fake room context for pure game logic modules. */
import { makeRng } from '../../explore/party/core/rng.js';
import { WORDS } from '../../explore/party/words/index.js';

export function makeCtx(mod, { players = ['a', 'b'], settings = {}, seed = 1, lang = 'en', now = 1_000_000, away = [] } = {}) {
    const defaults = {};
    for (const f of mod.settings || []) defaults[f.key] = f.def;
    const ctx = {
        now, rng: makeRng(seed), lang, words: WORDS[lang],
        settings: { ...defaults, ...settings },
        names: Object.fromEntries(players.map(p => [p, p.toUpperCase()])),
        isAway: id => away.includes(id),
        players,
    };
    return ctx;
}

/** Advance the clock and run the module's timer callback. */
export function advance(mod, state, ctx, ms) {
    ctx.now += ms;
    if (mod.tick) mod.tick(state, ctx);
}
