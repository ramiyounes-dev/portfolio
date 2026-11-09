/* LocalHost: runs a game's rule module in the browser, for "vs AI" and "Same device" play.
   It speaks the same messages as the online PartyRoom, so every game UI works unchanged.
   - AI seats only ever see mod.view(state, botId): the AI never reads hidden information.
   - Same device: when the next private view belongs to another person, a handoff screen hides it first. */

import { makeRng } from '../core/rng.js';
import { WORDS } from '../words/index.js';

export const TABLE = '__table__';     // neutral viewer: public information only
export const BOT_NAMES = ['Ada', 'Turing', 'Hopper', 'Lovelace', 'Shannon', 'Knuth', 'Liskov', 'Hamilton', 'Babbage', 'Dijkstra', 'Minsky'];

export function createLocalHost({ mod, ai, players, settings, lang, mode, difficulty, humanRole, privateInfo, devicePrepare, onMessage }) {
    const rng = makeRng();
    let seq = 0;
    const room = {
        code: null, game: mod.id, phase: 'lobby', host: players[0].id, local: true, mode, difficulty,
        players: players.map((p, i) => ({ ...p, order: i, connected: true, away: false, spectator: false, late: false })),
        settings: { ...settings }, lang, state: null, results: null, wins: {},
    };
    let viewer = players.find(p => !p.bot).id;
    let handoff = null;             // pid we are waiting to reveal to
    let handoffAt = 0;
    let timer = null;
    const pending = {};             // botId -> timeout
    const memory = {};              // botId -> private AI memory (only what that seat observed)
    let closed = false;

    const humans = () => room.players.filter(p => !p.bot).map(p => p.id);
    const bots = () => room.players.filter(p => p.bot).map(p => p.id);
    const names = () => Object.fromEntries(room.players.map(p => [p.id, p.name]));
    const ctx = () => ({ now: Date.now(), rng, lang: room.lang, words: WORDS[room.lang] || WORDS.en, settings: room.settings, names: names(), isAway: () => false });
    const seated = () => (room.state ? (mod.seated ? mod.seated(room.state) : room.state.players || []) : []);

    function publicRoom() {
        return {
            code: null, game: room.game, phase: room.phase, host: room.host, seq: ++seq, lang: room.lang, local: true, mode, difficulty,
            settings: room.settings, min: mod.min, max: Math.min(12, mod.max), duel: !!mod.duel, roomMax: 12,
            players: room.players.map(p => ({ id: p.id, name: p.name, order: p.order, connected: true, away: false, spectator: false, late: false, bot: !!p.bot })),
            seated: seated(), queue: [], wins: room.wins, results: room.results, now: Date.now(),
            thinking: Object.keys(pending).filter(id => pending[id] && room.state && (mod.awaiting ? mod.awaiting(room.state) : []).includes(id)),
            aiReveal: room.phase === 'results' && ai && ai.reveal ? Object.fromEntries(bots().map(b => [b, ai.reveal(memory[b] || {})]).filter(e => e[1])) : null,
        };
    }

    function sendState(as) {
        if (closed) return;
        onMessage({ t: 'state', me: as, room: publicRoom(), view: room.state ? mod.view(room.state, as, ctx()) : null });
    }

    /** Pick who looks at the screen next, with a handoff when private information changes hands. */
    function emit() {
        let next = viewer;
        const secret = id => {
            if (id === TABLE || !room.state || !privateInfo) return false;
            if (typeof privateInfo !== 'function') return true;
            return !!privateInfo(mod.view(room.state, id, ctx()), id);
        };
        if (mode === 'ai') next = humans()[0];
        else if (room.phase === 'playing' && room.state) {
            const waiting = (mod.awaiting ? mod.awaiting(room.state) : []).filter(id => humans().includes(id));
            if (waiting.length) { if (!waiting.includes(viewer)) next = waiting[0]; }
            else if (secret(viewer)) next = TABLE;               // nobody to act: put the phone down, hide secrets
            else if (viewer === TABLE && typeof privateInfo === 'function') next = humans()[0];
        } else if (privateInfo) next = TABLE;
        const needsHandoff = mode === 'device' && privateInfo && next !== TABLE && next !== viewer && humans().length > 1
            && (secret(next) || secret(viewer));
        viewer = next;
        if (needsHandoff) {
            handoff = next;
            handoffAt = Date.now();
            clearTimeout(timer);            // the clock stops while the phone changes hands
            if (room.state && mod.sync) onMessage({ t: 'sync', data: mod.sync(room.state, next) });
            onMessage({ t: 'handoff', to: next, name: names()[next] });
            return;
        }
        if (handoff) return;
        sendState(viewer);
    }

    function arm() {
        clearTimeout(timer);
        if (handoff) return;
        if (room.phase !== 'playing' || !room.state || !room.state.deadline) return;
        timer = setTimeout(() => { if (room.phase === 'playing' && mod.tick) { mod.tick(room.state, ctx()); changed(); } }, Math.max(0, room.state.deadline - Date.now()));
    }

    function changed() {
        if (room.phase === 'playing' && room.state && room.state.over) {
            room.phase = 'results';
            room.results = room.state.over;
            for (const w of room.results.winners || []) room.wins[w] = (room.wins[w] || 0) + 1;
            for (const b of Object.keys(pending)) { clearTimeout(pending[b]); pending[b] = null; }
        }
        arm();
        emit();
        observeAndThink();
    }

    /* ---------- AI ---------- */
    function aiCtx(id, firing = false) {
        memory[id] = memory[id] || {};
        return { difficulty, memory: memory[id], rng, lang: room.lang, words: WORDS[room.lang] || WORDS.en, settings: room.settings, names: names(), firing, now: Date.now(), humanRole, humans: humans() };
    }

    function observeAndThink() {
        if (!ai || room.phase !== 'playing' || !room.state) return;
        const waiting = mod.awaiting ? mod.awaiting(room.state) : [];
        for (const b of bots()) {
            const v = mod.view(room.state, b, ctx());
            if (ai.observe) ai.observe(v, b, aiCtx(b));
            if (pending[b]) continue;
            if (!waiting.includes(b) && !ai.reactive) continue;
            const d = ai.decide(v, b, aiCtx(b));
            if (!d) continue;
            const delay = d.delay !== undefined ? d.delay : 500 + rng() * 900;
            pending[b] = setTimeout(() => fire(b), Math.max(80, delay));
        }
        // keep the "thinking" indicator in sync
        if (Object.values(pending).some(Boolean)) sendStateQuietly();
    }

    let quietTimer = null;
    function sendStateQuietly() { clearTimeout(quietTimer); quietTimer = setTimeout(() => { if (!handoff) sendState(viewer); }, 30); }

    function fire(b) {
        pending[b] = null;
        if (closed || room.phase !== 'playing' || !room.state) return;
        const v = mod.view(room.state, b, ctx());
        const d = ai.decide(v, b, aiCtx(b, true));
        if (!d) { observeAndThink(); return; }
        const a = d.action || d;
        const res = mod.act(room.state, b, a, ctx()) || {};
        if (res.error) {
            console.warn('[AI] refused move', mod.id, a, res.error);
            memory[b].refused = (memory[b].refused || 0) + 1;
            if (memory[b].refused > 3 && mod.tick) { memory[b].refused = 0; mod.tick(room.state, ctx()); changed(); return; }
            setTimeout(observeAndThink, 300);
            return;
        }
        memory[b].refused = 0;
        if (res.event) onMessage({ t: 'event', e: res.event });
        if (res.quiet) { observeAndThink(); return; }      // e.g. a drawing stroke: no full re-render
        changed();
    }

    /* ---------- Messages from the UI ---------- */
    function startGame() {
        if (room.players.length < mod.min) { onMessage({ t: 'err', code: 'not_enough' }); return; }
        room.state = mod.setup({ ...ctx(), players: room.players.map(p => p.id).slice(0, mod.max) });
        if (ai && ai.prepare && mode === 'ai') ai.prepare(room.state, humans()[0], { mod, ctx: ctx(), humanRole, difficulty });
        if (devicePrepare && mode === 'device') devicePrepare(room.state, { mod, ctx: ctx() });
        room.phase = 'playing';
        room.results = null;
        for (const b of bots()) memory[b] = {};
        handoff = null;
        viewer = mode === 'ai' || typeof privateInfo === 'function' || !privateInfo ? humans()[0] : TABLE;
        changed();
    }

    function send(msg) {
        if (closed) return;
        switch (msg.t) {
            case 'act': {
                if (room.phase !== 'playing' || !room.state) return;
                const as = msg.as || viewer;
                const res = mod.act(room.state, as, msg.a || {}, ctx()) || {};
                if (res.error) { onMessage({ t: 'err', code: res.error }); return; }
                if (res.private) onMessage({ t: 'note', note: res.private });
                if (res.event) { /* local drawing is already on screen */ }
                if (res.quiet) return;
                changed();
                return;
            }
            case 'start': case 'rematch': startGame(); return;
            case 'lobby':
                room.phase = 'lobby'; room.state = null; room.results = null; handoff = null;
                clearTimeout(timer);
                emit();
                return;
            case 'settings':
                if (room.phase === 'playing') return;
                for (const [k, v] of Object.entries(msg.patch || {})) {
                    if (k === 'lang' && (v === 'en' || v === 'fr')) room.lang = v;
                    else room.settings[k] = v;
                }
                emit();
                return;
            case 'reveal':
                if (handoff && room.state && room.state.deadline) room.state.deadline += Date.now() - handoffAt;
                handoff = null;
                arm();
                sendState(viewer);
                return;
            case 'addPlayer':
                if (room.phase === 'playing' || room.players.length >= Math.min(12, mod.max)) return;
                room.players.push({ id: 'p' + Date.now().toString(36), name: msg.name, order: room.players.length, bot: false, connected: true });
                emit();
                return;
            case 'removePlayer':
                if (room.phase === 'playing' || room.players.length <= mod.min) return;
                room.players = room.players.filter(p => p.id !== msg.id);
                if (!room.players.some(p => p.id === room.host)) room.host = room.players[0].id;
                emit();
                return;
            case 'renamePlayer': {
                const p = room.players.find(q => q.id === msg.id);
                if (p && !p.bot && msg.name) p.name = String(msg.name).slice(0, 16);
                emit();
                return;
            }
            case 'leave': close(); return;
        }
    }

    function close() {
        closed = true;
        clearTimeout(timer);
        for (const b of Object.keys(pending)) clearTimeout(pending[b]);
    }

    setTimeout(() => { onMessage({ t: 'welcome', pid: viewer, local: true }); emit(); }, 0);
    return { send, close, local: true, get viewer() { return viewer; }, humans };
}
