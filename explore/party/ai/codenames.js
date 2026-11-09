/* Codenames AI, built on a hand-made category table (words/assoc.js) rather than real semantics:
   Spymasters give category clues ("fruit 3") that avoid the assassin (and, from Medium up, the other team);
   Operatives guess the board words listed under the clue. A human Spymaster's clue only helps the AI when it matches
   one of the categories; otherwise AI Operatives guess blindly. Spymasters see the key, Operatives never do.
   With a human Operative on the team, AI teammates simply back the human's proposals. */
import { ASSOC } from '../words/assoc.js';
import { clueProblem, other } from '../logic/codenames.js';
import { fold } from '../core/text.js';
import { think, best } from './common.js';

const table = lang => ASSOC[lang] || ASSOC.en;
const membersOf = (lang, clue) => {
    const t = table(lang), f = fold(clue);
    const key = Object.keys(t).find(k => fold(k) === f);
    return key ? new Set(t[key].map(fold)) : null;
};

export function chooseClue(v, team, difficulty, lang, rng) {
    const opts = [];
    for (const [clue, list] of Object.entries(table(lang))) {
        if (clueProblem(clue, v.words, v.revealed)) continue;
        const set = new Set(list.map(fold));
        const hit = kind => v.words.filter((w, i) => !v.revealed[i] && v.key[i] === kind && set.has(fold(w))).length;
        const own = hit(team), opp = hit(other(team)), neutral = hit('neutral'), assassin = hit('assassin');
        if (!own) continue;
        opts.push({ clue, own, opp, neutral, assassin });
    }
    if (!opts.length) return null;
    let score;
    if (difficulty === 'easy') score = o => o.own - o.assassin * 3 + rng() * 2;
    else if (difficulty === 'medium') score = o => (o.assassin ? -100 : 0) + Math.min(o.own, 3) * 2 - o.opp * 3 - o.neutral + rng() * 0.5;
    else score = o => (o.assassin ? -1000 : 0) + o.own * 3 - o.opp * 6 - o.neutral * 1.5 + rng() * 0.2;
    const o = best(rng, opts, score);
    const n = difficulty === 'easy' ? Math.min(o.own, 2) : Math.min(o.own, difficulty === 'medium' ? 3 : 4);
    return { clue: o.clue, n };
}

/* Teammates must agree on a word: every AI ranks words the same way for a given clue (no shared secret, just a
   deterministic order), so their votes converge. */
const hash = str => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const firstBy = (list, v, salt) => [...list].sort((a, b) => hash(salt + v.words[a]) - hash(salt + v.words[b]))[0];

function unrevealed(v) { return v.words.map((w, i) => (v.revealed[i] ? -1 : i)).filter(i => i >= 0); }

export function chooseGuess(v, me, mem, difficulty, lang, rng) {
    const open = unrevealed(v);
    const salt = v.clue.word + v.guesses;
    if (v.clue.n > 0 && v.guesses >= v.clue.n) return v.guesses >= 1 ? { endTurn: true } : { propose: firstBy(open, v, salt) };
    const set = membersOf(lang, v.clue.word);
    let cands = set ? open.filter(i => set.has(fold(v.words[i]))) : [];
    if (difficulty === 'hard' && !cands.length && v.guesses >= 1) {
        // spend a bonus guess on an earlier clue's leftovers
        for (const old of mem.clues || []) { const s = membersOf(lang, old); if (s) cands = open.filter(i => s.has(fold(v.words[i]))); if (cands.length) break; }
    }
    if (difficulty === 'easy' && hash(salt + 'easy') % 100 < 35) return { propose: firstBy(open, v, salt) };
    if (cands.length) return { propose: firstBy(cands, v, salt) };
    if (v.guesses >= 1) return { endTurn: true };
    return { propose: firstBy(open, v, salt) };
}

export default {
    /** vs AI: the human's team is red; the human is Spymaster or Operative as chosen; then the game begins. */
    prepare(s, humanId, { mod, ctx, humanRole }) {
        if (!humanId) {
            // AI-only (tests): keep the random teams, pick the first of each as Spymaster
            for (const t of ['red', 'blue']) s.spymasters[t] = s.teams[t][0];
        } else {
            const bots = s.players.filter(id => id !== humanId);
            s.teams = { red: [humanId], blue: [] };
            bots.forEach((id, i) => s.teams[i % 2 ? 'red' : 'blue'].push(id));
            if (s.teams.red.length < 2) s.teams.red.push(s.teams.blue.pop());
            s.spymasters = { red: humanRole === 'spymaster' ? humanId : s.teams.red.find(id => id !== humanId), blue: s.teams.blue[0] };
        }
        mod.act(s, s.players[0], { begin: true }, ctx);
    },
    observe(v, me, ctx) {
        if (v.clue && ctx.memory.lastClue !== v.clue.word + v.clue.team) {
            ctx.memory.lastClue = v.clue.word + v.clue.team;
            if (v.clue.team === v.myTeam) (ctx.memory.clues = ctx.memory.clues || []).unshift(v.clue.word);
        }
    },
    decide(v, me, ctx) {
        if (!v.words || v.winner) return null;
        const lang = ctx.lang, mem = ctx.memory;
        if (v.phase === 'clue' && v.isSpy && v.turnTeam === v.myTeam) {
            const key = 'clue:' + v.revealed.map(Boolean).join();
            if (mem.key !== key) { mem.key = key; mem.plan = chooseClue(v, v.myTeam, ctx.difficulty, lang, ctx.rng) || { clue: lang === 'fr' ? 'chose' : 'thing', n: 1 }; }
            return { action: mem.plan, delay: think(ctx.rng, 2500, 4500) };
        }
        if (v.phase !== 'guess' || v.isSpy || v.turnTeam !== v.myTeam) return null;
        const humanOps = (ctx.humans || []).filter(id => v.teams[v.myTeam].includes(id) && v.spymasters[v.myTeam] !== id);
        if (humanOps.length) {
            const target = v.proposals[humanOps[0]];
            if (target === undefined || v.proposals[me] === target) return null;
            return { action: { propose: target }, delay: think(ctx.rng, 500, 1000) };
        }
        const key = 'g:' + v.clue.word + ':' + v.guesses + ':' + v.revealed.map(Boolean).join();
        if (mem.key !== key) { mem.key = key; mem.plan = chooseGuess(v, me, mem, ctx.difficulty, lang, ctx.rng); }
        if (mem.plan.propose !== undefined && v.proposals[me] === mem.plan.propose) {
            // already voted: wait for teammates (or, with only AI teammates, they converge on candidates)
            return null;
        }
        return { action: mem.plan, delay: think(ctx.rng, 1500, 3000) };
    },
};
