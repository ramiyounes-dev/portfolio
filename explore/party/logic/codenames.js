/* Codenames: two teams, a 5x5 grid of words, Spymasters give one-word clues. The key only goes to the Spymasters. */
import { fold } from '../core/text.js';

const TEAMS = ['red', 'blue'];
export const other = t => (t === 'red' ? 'blue' : 'red');

export function makeKey(starting, rng) {
    const key = [...Array(9).fill(starting), ...Array(8).fill(other(starting)), ...Array(7).fill('neutral'), 'assassin'];
    return rng.shuffle(key);
}

/** A clue is one word that is neither a board word nor contains one. */
export function clueProblem(clue, words, revealed) {
    const c = String(clue || '').trim();
    if (!/^[\p{L}]+$/u.test(c) || fold(c).length < 2) return 'cn.oneWord';
    const fc = fold(c);
    for (let i = 0; i < words.length; i++) {
        if (revealed[i]) continue;
        const fw = fold(words[i]);
        if (fc === fw || fc.includes(fw) || fw.includes(fc)) return 'cn.onBoard';
    }
    return null;
}

function teamOf(s, id) { return TEAMS.find(t => s.teams[t].includes(id)) || null; }
function operatives(s, team) { return s.teams[team].filter(id => id !== s.spymasters[team]); }

function setTimer(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function log(s, e) { s.log.push(e); if (s.log.length > 12) s.log.shift(); }

function teamsValid(s) { return TEAMS.every(t => s.teams[t].length >= 2 && s.spymasters[t] && s.teams[t].includes(s.spymasters[t])); }

function startPlay(s, ctx) {
    s.starting = ctx.rng() < 0.5 ? 'red' : 'blue';
    const pool = ctx.rng.shuffle(ctx.words.filter(w => fold(w).length <= 11));
    s.words = [...new Set(pool)].slice(0, 25);
    s.key = makeKey(s.starting, ctx.rng);
    s.revealed = Array(25).fill(null);
    s.turnTeam = s.starting;
    s.phase = 'clue';
    s.clue = null;
    s.proposals = {};
    s.log = [];
    setTimer(s, ctx);
}

function left(s, team) { return s.key.filter((k, i) => k === team && !s.revealed[i]).length; }

function win(s, team, why) {
    s.winner = team;
    s.phase = 'done';
    s.deadline = null;
    const rows = [...s.teams[team].map(id => ({ id, score: 9 - left(s, team) - (team !== s.starting ? 1 : 0), rank: 1 })),
        ...s.teams[other(team)].map(id => ({ id, score: (other(team) === s.starting ? 9 : 8) - left(s, other(team)), rank: 2 }))];
    s.over = { ranking: rows, winners: [...s.teams[team]], note: why === 'assassin' ? 'cn.byAssassin' : 'cn.byAgents', noteVars: { team } };
}

function endTurn(s, ctx) {
    s.turnTeam = other(s.turnTeam);
    s.phase = 'clue';
    s.clue = null;
    s.proposals = {};
    setTimer(s, ctx);
}

function reveal(s, idx, ctx) {
    const kind = s.key[idx];
    const team = s.turnTeam;
    s.revealed[idx] = kind;
    s.proposals = {};
    log(s, { k: 'reveal', team, word: s.words[idx], kind });
    if (kind === 'assassin') { win(s, other(team), 'assassin'); return; }
    for (const t of TEAMS) if (!left(s, t)) { win(s, t, 'agents'); return; }
    if (kind !== team) { endTurn(s, ctx); return; }
    s.guesses++;
    if (s.clue.n > 0 && s.guesses >= s.clue.n + 1) endTurn(s, ctx);
}

export default {
    id: 'codenames',
    min: 4,
    max: 12,
    settings: [
        { key: 'spymasters', type: 'select', def: 'volunteer', options: ['volunteer', 'random'] },
        { key: 'timer', type: 'int', unit: 's', def: 0, min: 0, max: 300, step: 30 },
        { key: 'quickVote', type: 'bool', def: false, hidden: true },
    ],

    setup(ctx) {
        const ids = ctx.rng.shuffle([...ctx.players]);
        const s = { players: [...ctx.players], teams: { red: [], blue: [] }, spymasters: { red: null, blue: null }, phase: 'teams', late: [], log: [], host: ctx.players[0], quickVote: !!ctx.settings.quickVote };
        ids.forEach((id, i) => s.teams[TEAMS[i % 2]].push(id));
        if (ctx.settings.spymasters === 'random') for (const t of TEAMS) s.spymasters[t] = s.teams[t][0] || null;
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over) return { error: 'illegal' };
        const team = teamOf(s, pid);
        if (!team) return { error: 'not_your_turn' };

        // Team setup (and switching later as an operative)
        if (a.join && TEAMS.includes(a.join)) {
            if (s.phase !== 'teams' && s.spymasters[team] === pid) return { error: 'illegal' };
            s.teams[team] = s.teams[team].filter(id => id !== pid);
            if (s.spymasters[team] === pid) s.spymasters[team] = null;
            s.teams[a.join].push(pid);
            return {};
        }
        if (a.spymaster) {
            const current = s.spymasters[team];
            if (s.phase !== 'teams' && current && !ctx.isAway(current)) return { error: 'illegal' };   // mid-game only to replace someone who left
            s.spymasters[team] = pid;
            return {};
        }
        if (s.phase === 'teams') {
            if (a.shuffle) {
                const ids = ctx.rng.shuffle([...s.players]);
                s.teams = { red: [], blue: [] };
                ids.forEach((id, i) => s.teams[TEAMS[i % 2]].push(id));
                s.spymasters = { red: s.teams.red[0], blue: s.teams.blue[0] };
                return {};
            }
            if (a.begin) {
                if (!teamsValid(s)) return { error: 'cn.needTeams' };
                startPlay(s, ctx);
                return {};
            }
            return { error: 'illegal' };
        }

        if (s.phase === 'clue') {
            if (team !== s.turnTeam || pid !== s.spymasters[team]) return { error: 'not_your_turn' };
            const problem = clueProblem(a.clue, s.words, s.revealed);
            if (problem) return { error: problem };
            const n = Math.max(0, Math.min(9, Math.floor(Number(a.n) || 0)));
            s.clue = { word: String(a.clue).trim().slice(0, 24), n, team };
            s.guesses = 0;
            s.flagged = false;
            s.phase = 'guess';
            log(s, { k: 'clue', team, word: s.clue.word, n });
            setTimer(s, ctx);
            return {};
        }

        if (s.phase === 'guess') {
            if (a.flag) {
                // The opposing Spymaster flags an illegal clue before any guess: the turn passes
                if (pid !== s.spymasters[other(s.turnTeam)] || s.guesses > 0) return { error: 'illegal' };
                log(s, { k: 'flag', team: other(s.turnTeam), word: s.clue.word });
                endTurn(s, ctx);
                return {};
            }
            if (team !== s.turnTeam || pid === s.spymasters[team]) return { error: 'not_your_turn' };
            if (a.endTurn) { if (s.guesses < 1) return { error: 'cn.guessFirst' }; endTurn(s, ctx); return {}; }
            const idx = Number(a.propose);
            if (!Number.isInteger(idx) || idx < 0 || idx > 24 || s.revealed[idx]) return { error: 'illegal' };
            if (s.proposals[pid] === idx) { delete s.proposals[pid]; return {}; }
            s.proposals[pid] = idx;
            const ops = operatives(s, team).filter(id => !ctx.isAway(id));
            const need = s.quickVote || ops.length <= 2 ? 1 : Math.floor(ops.length / 2) + 1;
            const votes = ops.filter(id => s.proposals[id] === idx).length;
            if (votes >= need) reveal(s, idx, ctx);
            return {};
        }
        return { error: 'illegal' };
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'clue' || s.phase === 'guess') endTurn(s, ctx);
    },

    /* Late joiner: joins the smaller team as an Operative and plays straight away. */
    join(s, pid) {
        if (TEAMS.some(t => s.teams[t].includes(pid))) return;
        const t = s.teams.red.length <= s.teams.blue.length ? 'red' : 'blue';
        s.teams[t].push(pid);
        s.players.push(pid);
        s.late.push(pid);
    },

    awaiting(s) {
        if (s.over) return [];
        if (s.phase === 'clue') return [s.spymasters[s.turnTeam]];
        if (s.phase === 'guess') return operatives(s, s.turnTeam);
        return [];
    },
    seated: s => s.players,

    view(s, pid) {
        const team = teamOf(s, pid);
        const isSpy = team && s.spymasters[team] === pid;
        const done = !!s.over;
        return {
            phase: s.phase, teams: s.teams, spymasters: s.spymasters, players: s.players, late: s.late,
            myTeam: team, isSpy, turnTeam: s.turnTeam, starting: s.starting,
            words: s.words || null, revealed: s.revealed || null,
            key: s.key && (isSpy || done) ? s.key : null,                  // only Spymasters see the key
            clue: s.clue || null, guesses: s.guesses || 0, proposals: s.proposals || {},
            left: s.key ? { red: left(s, 'red'), blue: left(s, 'blue') } : null,
            winner: s.winner || null, log: s.log, deadline: s.deadline, timerTotal: s.timerTotal,
        };
    },
};
