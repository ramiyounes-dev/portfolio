/* PartyRoom: one Durable Object per room code, shared by every party game.
   Server-authoritative: the game state lives here, clients send intents and receive only their own view.

   Game modules (explore/party/logic/*.js) are pure and shared with the browser:
     { id, min, max, duel?, settings: [...], setup(ctx), act(state, pid, action, ctx), tick?(state, ctx),
       view(state, pid, ctx), join?(state, pid, ctx), seated?(state), awaiting?(state), sync?(state) }
   A module sets state.deadline (ms) when it waits on a timer, and state.over = { ranking, winners } at the end. */

import { GAMES } from './registry.js';
import { makeRng } from '../../explore/party/core/rng.js';
import { WORDS } from '../../explore/party/words/index.js';

const ROOM_MAX = 12;               // absolute cap: players + spectators
const GRACE_MS = 60_000;           // a dropped player keeps their seat this long
const MAX_MSG = 48_000;            // bytes per client message (drawing strokes are the largest)
const RATE = { window: 1000, max: 45 };
const IDLE_MS = 6 * 60 * 60 * 1000;
const NEXT_MS = 10_000;            // duel with people waiting: the next match starts on its own after this

const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

function cleanName(s) {
    return String(s || '').replace(/[<>"'`\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}

function defaultSettings(mod) {
    const s = { expected: 0, autostart: true };
    for (const f of mod.settings || []) s[f.key] = f.def;
    return s;
}

/** Validate a settings patch against the module schema (+ room-level keys). */
function applySettings(mod, current, patch) {
    const out = { ...current };
    const schema = [
        { key: 'expected', type: 'int', min: 0, max: Math.min(ROOM_MAX, mod.max) },
        { key: 'autostart', type: 'bool' },
        ...(mod.settings || []),
    ];
    for (const f of schema) {
        if (!(f.key in patch)) continue;
        const v = patch[f.key];
        if (f.type === 'int') {
            const n = Math.round(Number(v));
            if (Number.isFinite(n)) out[f.key] = Math.min(f.max, Math.max(f.min, n));
        } else if (f.type === 'bool') {
            out[f.key] = !!v;
        } else if (f.type === 'select') {
            if (f.options.includes(v)) out[f.key] = v;
        }
    }
    return out;
}

export class PartyRoom {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.conns = new Map();        // ws -> { pid, hits: [] }
        this.timer = null;
        this.graceTimers = new Map();
        this.rng = makeRng(crypto.getRandomValues(new Uint32Array(1))[0]);
        this.room = null;
        state.blockConcurrencyWhile(async () => {
            this.room = (await state.storage.get('room')) || null;
            if (this.room) {
                // Sockets never survive a restart: everyone reconnects within the grace period
                const now = Date.now();
                for (const p of this.room.players) { p.connected = false; p.lastSeen = Math.max(p.lastSeen || 0, now); this.scheduleGrace(p.id); }
                this.arm();
            }
        });
    }

    get mod() { return this.room ? GAMES[this.room.game] : null; }

    /* ---------------- HTTP / WebSocket entry ---------------- */
    async fetch(request) {
        if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        server.accept();
        this.attach(server, new URL(request.url).searchParams);
        return new Response(null, { status: 101, webSocket: client });
    }

    /** Wire an accepted socket into the room. Also used by the local dev host (tools/party-dev.js). */
    attach(server, params) {
        const game = params.get('game');
        const code = params.get('code');
        const create = params.get('create') === '1';
        const fail = (err, extra = {}) => {
            try { server.send(JSON.stringify({ t: 'error', code: err, ...extra })); server.close(4000, err); } catch (e) { /* closed */ }
        };

        const mod = GAMES[game];
        if (!mod) return fail('bad_game');
        if (create) {
            if (this.room && this.liveCount() > 0) return fail('taken');
            this.room = {
                code, game, phase: 'lobby', created: Date.now(),
                players: [], host: null, order: 0,
                settings: defaultSettings(mod), lang: params.get('lang') === 'fr' ? 'fr' : 'en',
                visibility: params.get('visibility') === 'public' ? 'public' : 'private',
                state: null, results: null, wins: {}, queue: [], streak: {}, seq: 0,
            };
            const target = Math.round(Number(params.get('target')));
            if (Number.isFinite(target) && target >= mod.min) this.room.settings.expected = Math.min(ROOM_MAX, mod.max, target);
        } else {
            if (!this.room) return fail('not_found');
            if (this.room.game !== game) return fail('wrong_game', { game: this.room.game });
        }

        this.conns.set(server, { pid: null, hits: [] });
        server.addEventListener('message', e => this.onMessage(server, e.data).catch(err => console.error(err)));
        server.addEventListener('close', () => this.onClose(server));
        server.addEventListener('error', () => this.onClose(server));
        this.touch();
    }

    /* ---------------- Helpers ---------------- */
    player(id) { return this.room.players.find(p => p.id === id); }
    present(p) { return p && !p.left && (p.connected || Date.now() - (p.lastSeen || 0) < GRACE_MS); }
    isAway(id) { const p = this.player(id); return !this.present(p); }
    liveCount() { return this.room.players.filter(p => this.present(p)).length; }
    names() { const o = {}; for (const p of this.room.players) o[p.id] = p.name; return o; }

    ctx() {
        const r = this.room;
        return {
            now: Date.now(), rng: this.rng, lang: r.lang, words: WORDS[r.lang] || WORDS.en,
            settings: r.settings, names: this.names(), isAway: id => this.isAway(id),
        };
    }

    seated() {
        const st = this.room.state;
        if (!st) return [];
        return this.mod.seated ? this.mod.seated(st) : (st.players || []);
    }

    send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch (e) { /* socket closing */ } }

    touch() { this.state.storage.setAlarm(Date.now() + IDLE_MS); }

    save() { if (this.room) this.state.storage.put('room', this.room); }

    /* ---------------- Messages ---------------- */
    async onMessage(ws, raw) {
        const conn = this.conns.get(ws);
        if (!conn || !this.room) return;
        if (typeof raw !== 'string' || raw.length > MAX_MSG) return;
        const now = Date.now();
        conn.hits = conn.hits.filter(t => now - t < RATE.window);
        if (conn.hits.length >= RATE.max) return;
        conn.hits.push(now);

        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (!msg || typeof msg.t !== 'string') return;

        if (msg.t === 'ping') return this.send(ws, { t: 'pong', now });
        if (msg.t === 'hello') return this.hello(ws, conn, msg);
        const pid = conn.pid;
        if (!pid) return;
        const p = this.player(pid);
        if (!p) return;
        const r = this.room;
        const isHost = r.host === pid;

        switch (msg.t) {
            case 'leave': this.leave(pid); break;
            case 'settings':
                if (!isHost || r.phase === 'playing' || typeof msg.patch !== 'object') return;
                r.settings = applySettings(this.mod, r.settings, msg.patch);
                if (msg.patch.lang === 'en' || msg.patch.lang === 'fr') r.lang = msg.patch.lang;
                if (!this.checkAutostart()) this.changed();
                break;
            case 'spectate':
                p.spectator = !!msg.on;
                if (p.spectator) r.queue = r.queue.filter(id => id !== pid);
                else if (this.mod.duel && r.phase !== 'lobby' && !this.seated().includes(pid) && !r.queue.includes(pid)) r.queue.push(pid);
                if (!this.checkAutostart()) this.changed();
                break;
            case 'start':
                if (!isHost || r.phase !== 'lobby') return;
                if (!this.startGame()) this.send(ws, { t: 'err', code: 'not_enough' });
                break;
            case 'rematch': {
                if (r.phase !== 'results') return;
                // Duel with nobody waiting: both players have to say yes. Otherwise the host starts it.
                if (this.mod.duel && !this.queueReady() && this.seated().includes(pid)) {
                    r.rematch = r.rematch || [];
                    if (msg.off) r.rematch = r.rematch.filter(id => id !== pid);
                    else if (!r.rematch.includes(pid)) r.rematch.push(pid);
                    const need = this.seated().filter(id => !this.isAway(id));
                    if (need.length >= 2 && need.every(id => r.rematch.includes(id))) {
                        if (!this.startGame({ rematch: true })) this.send(ws, { t: 'err', code: 'not_enough' });
                    } else this.changed();
                    return;
                }
                if (!isHost) return;
                if (!this.startGame({ rematch: true })) this.send(ws, { t: 'err', code: 'not_enough' });
                break;
            }
            case 'lobby':
                if (!isHost || r.phase === 'lobby') return;
                this.toLobby();
                break;
            case 'act': {
                if (r.phase !== 'playing' || !r.state) return;
                const res = this.mod.act(r.state, pid, msg.a || {}, this.ctx()) || {};
                if (res.error) return this.send(ws, { t: 'err', code: res.error });
                if (res.event) {
                    for (const [w, c] of this.conns) if (c.pid && c.pid !== pid) this.send(w, { t: 'event', e: res.event });
                }
                if (res.private) this.send(ws, { t: 'note', note: res.private });
                if (res.quiet) { this.save(); return; }
                this.changed();
                break;
            }
        }
    }

    hello(ws, conn, msg) {
        const r = this.room;
        let p = msg.pid ? this.player(msg.pid) : null;
        if (p && p.left) p = null;
        if (p) {
            conn.pid = p.id;
            p.connected = true;
            p.lastSeen = Date.now();
            clearTimeout(this.graceTimers.get(p.id));
            this.graceTimers.delete(p.id);
            if (!r.host || this.isAway(r.host)) r.host = p.id;
        } else {
            const name = cleanName(msg.name);
            if (!name) return this.send(ws, { t: 'error', code: 'name_required', soft: true });
            const active = r.players.filter(q => !q.left);
            if (active.length >= ROOM_MAX) return this.send(ws, { t: 'error', code: 'full' });
            if (active.some(q => q.name.toLowerCase() === name.toLowerCase() && this.present(q))) {
                return this.send(ws, { t: 'error', code: 'name_taken', soft: true });
            }
            // A ghost with the same name (expired grace) gives up its slot
            r.players = r.players.filter(q => !(q.name.toLowerCase() === name.toLowerCase() && !this.present(q) && r.phase === 'lobby'));
            p = { id: uid(), name, order: r.order++, connected: true, lastSeen: Date.now(), spectator: !!msg.spectator, late: r.phase !== 'lobby' };
            r.players.push(p);
            conn.pid = p.id;
            if (!r.host || this.isAway(r.host)) r.host = p.id;
            if (r.phase === 'playing' || (r.phase === 'results' && this.mod.duel)) this.lateJoin(p.id);
        }
        this.send(ws, { t: 'welcome', pid: p.id, code: r.code });
        if (r.state && this.mod.sync) this.send(ws, { t: 'sync', data: this.mod.sync(r.state, p.id) });
        if (!this.checkAutostart()) this.changed();
    }

    lateJoin(pid) {
        const r = this.room;
        const p = this.player(pid);
        if (p.spectator) return;
        if (this.mod.duel) { if (!this.seated().includes(pid) && !r.queue.includes(pid)) r.queue.push(pid); return; }
        if (this.mod.join && !this.seated().includes(pid)) this.mod.join(r.state, pid, this.ctx());
    }

    leave(pid) {
        const r = this.room;
        const p = this.player(pid);
        if (!p) return;
        p.left = true;
        p.connected = false;
        p.lastSeen = 0;
        this.forfeit(pid);
        r.queue = r.queue.filter(id => id !== pid);
        if (r.phase === 'lobby') r.players = r.players.filter(q => q.id !== pid);
        for (const [w, c] of this.conns) if (c.pid === pid) { c.pid = null; try { w.close(1000, 'left'); } catch (e) { /* */ } }
        this.passHost();
        this.changed();
    }

    passHost() {
        const r = this.room;
        if (r.host && !this.isAway(r.host)) return;
        const next = r.players.filter(q => this.present(q)).sort((a, b) => a.order - b.order)[0];
        r.host = next ? next.id : null;
    }

    onClose(ws) {
        const conn = this.conns.get(ws);
        this.conns.delete(ws);
        if (!conn || !conn.pid || !this.room) return;
        const pid = conn.pid;
        if ([...this.conns.values()].some(c => c.pid === pid)) return;  // still open in another tab
        const p = this.player(pid);
        if (!p) return;
        p.connected = false;
        p.lastSeen = Date.now();
        this.scheduleGrace(pid);
        this.changed();
    }

    scheduleGrace(pid) {
        clearTimeout(this.graceTimers.get(pid));
        this.graceTimers.set(pid, setTimeout(() => this.graceExpired(pid), GRACE_MS + 100));
    }

    graceExpired(pid) {
        this.graceTimers.delete(pid);
        const r = this.room;
        if (!r) return;
        const p = this.player(pid);
        if (!p || p.connected) return;
        if (r.phase === 'lobby') r.players = r.players.filter(q => q.id !== pid);
        r.queue = r.queue.filter(id => id !== pid);
        this.forfeit(pid);     // a duel player gone past the grace period loses the match
        this.passHost();
        this.changed();   // re-arms timers: an away player's turns are now skipped quickly
        if (!this.conns.size && !r.players.some(q => this.present(q))) this.save();
    }

    /** A duel player who left (or stayed away past the grace period) loses the match: the other one wins it.
        Open-ended duels (the 3D games keep a running score) are left alone. */
    forfeit(pid) {
        const r = this.room, mod = this.mod;
        if (!mod.duel || mod.endless || r.phase !== 'playing' || !r.state || r.state.over) return;
        const seats = this.seated();
        if (!seats.includes(pid)) return;
        const other = seats.find(id => id !== pid);
        if (!other) return;
        const score = id => (r.state.wins && r.state.wins[id] != null ? r.state.wins[id] : '');
        r.state.over = {
            ranking: [{ id: other, score: score(other), rank: 1 }, { id: pid, score: score(pid), rank: 2 }],
            winners: [other], note: 'forfeit', noteVars: { name: (this.player(pid) || {}).name || '?' },
        };
        r.state.deadline = null;
    }

    /** Someone is waiting to play the next duel (queue of present, non-spectating players). */
    queueReady() {
        const r = this.room;
        if (!this.mod.duel) return false;
        const eligible = this.eligible(), seats = this.seated();
        return r.queue.some(id => eligible.includes(id) && !seats.includes(id));
    }

    /* ---------------- Game lifecycle ---------------- */
    eligible() {
        return this.room.players.filter(p => !p.spectator && this.present(p)).sort((a, b) => a.order - b.order).map(p => p.id);
    }

    checkAutostart() {
        const r = this.room, s = r.settings;
        if (r.phase !== 'lobby' || !s.autostart || !s.expected) return false;
        if (this.eligible().length < Math.max(s.expected, this.mod.min)) return false;
        return this.startGame();
    }

    pickSeats(rematch) {
        const r = this.room, mod = this.mod;
        const eligible = this.eligible();
        if (!mod.duel) return eligible.slice(0, mod.max);

        const prev = rematch && r.state ? this.seated() : [];
        const winners = r.results && r.results.winners ? r.results.winners : [];
        const queue = r.queue.filter(id => eligible.includes(id));
        let order;
        if (prev.length === 2 && queue.length) {
            let [a, b] = prev;
            if (winners.length === 1) { a = winners[0]; b = prev.find(id => id !== a); }
            else if ((r.streak[a] || 0) < (r.streak[b] || 0)) [a, b] = [b, a];   // draw: the longer-seated one steps out
            order = r.settings.queueMode === 'rotate' ? [...queue, a, b] : [a, ...queue, b];
        } else {
            order = [...prev, ...queue, ...eligible];
        }
        order = [...new Set(order)].filter(id => eligible.includes(id));
        const seats = order.slice(0, 2);
        r.queue = order.slice(2);
        for (const id of Object.keys(r.streak)) if (!seats.includes(id)) r.streak[id] = 0;
        for (const id of seats) r.streak[id] = (r.streak[id] || 0) + 1;
        return seats;
    }

    startGame({ rematch = false } = {}) {
        const r = this.room, mod = this.mod;
        if (this.eligible().length < mod.min) return false;
        const seats = this.pickSeats(rematch);
        if (seats.length < mod.min) return false;
        r.players = r.players.filter(p => !p.left);
        for (const p of r.players) p.late = false;
        r.state = mod.setup({ ...this.ctx(), players: seats });
        r.phase = 'playing';
        r.results = null;
        r.rematch = [];
        r.nextAt = null;
        this.changed();
        return true;
    }

    toLobby() {
        const r = this.room;
        r.phase = 'lobby';
        r.state = null;
        r.results = null;
        r.rematch = [];
        r.nextAt = null;
        r.players = r.players.filter(p => !p.left && this.present(p));
        for (const p of r.players) p.late = false;
        this.passHost();
        this.changed();
    }

    changed() {
        const r = this.room;
        if (!r) return;
        if (r.phase === 'playing' && r.state && r.state.over) {
            r.phase = 'results';
            r.results = r.state.over;
            for (const w of r.results.winners || []) r.wins[w] = (r.wins[w] || 0) + 1;
            r.rematch = [];
        }
        // Results of a duel with people waiting: the next match starts by itself after a visible countdown
        if (r.phase === 'results') {
            if (this.queueReady()) r.nextAt = r.nextAt || Date.now() + NEXT_MS;
            else r.nextAt = null;
            // A rematch vote from someone no longer seated or present does not count
            r.rematch = (r.rematch || []).filter(id => this.seated().includes(id) && !this.isAway(id));
        }
        r.seq++;
        this.arm();
        this.save();
        this.broadcast();
        this.report();
    }

    /** Tell the public room list about this room (only when the summary changes). */
    report(remove = false) {
        const r = this.room;
        if (!this.env || !this.env.PARTY_LOBBY || !r || r.visibility !== 'public') return;
        const live = r.players.filter(p => this.present(p) && !p.spectator);
        const host = this.player(r.host);
        const body = remove || !live.length ? { code: r.code, remove: true } : {
            code: r.code, game: r.game, host: host ? host.name : '', lang: r.lang, visibility: r.visibility,
            players: live.length, target: r.settings.expected || 0, max: Math.min(ROOM_MAX, this.mod.max),
            phase: r.phase === 'lobby' ? 'lobby' : 'playing',
        };
        const key = JSON.stringify(body);
        if (key === this.lastReport && Date.now() - (this.lastReportAt || 0) < 60_000) return;
        this.lastReport = key;
        this.lastReportAt = Date.now();
        const stub = this.env.PARTY_LOBBY.get(this.env.PARTY_LOBBY.idFromName('lobby'));
        stub.fetch('https://lobby/report', { method: 'POST', body: key }).catch(() => { /* list is best effort */ });
    }

    arm() {
        clearTimeout(this.timer);
        this.timer = null;
        const r = this.room;
        if (r && r.phase === 'results' && r.nextAt) {
            this.timer = setTimeout(() => { if (this.room && this.room.phase === 'results' && this.queueReady()) this.startGame({ rematch: true }); }, Math.max(0, r.nextAt - Date.now()));
            return;
        }
        if (!r || r.phase !== 'playing' || !r.state) return;
        const st = r.state;
        const waiting = this.mod.awaiting ? this.mod.awaiting(st) : [];
        const allAway = waiting.length > 0 && waiting.every(id => this.isAway(id));
        let delay = st.deadline ? st.deadline - Date.now() : Infinity;
        if (allAway) delay = Math.min(delay, 1500);
        if (!Number.isFinite(delay)) return;
        this.timer = setTimeout(() => this.fire(), Math.max(0, delay));
    }

    fire() {
        const r = this.room;
        if (!r || r.phase !== 'playing' || !r.state || !this.mod.tick) return;
        this.mod.tick(r.state, this.ctx());
        this.changed();
    }

    /* ---------------- Views ---------------- */
    publicRoom() {
        const r = this.room, mod = this.mod;
        return {
            code: r.code, game: r.game, phase: r.phase, host: r.host, seq: r.seq, lang: r.lang, visibility: r.visibility || 'private',
            settings: r.settings, min: mod.min, max: Math.min(ROOM_MAX, mod.max), duel: !!mod.duel, roomMax: ROOM_MAX,
            players: r.players.filter(p => !p.left).map(p => ({
                id: p.id, name: p.name, order: p.order, connected: p.connected, away: this.isAway(p.id),
                spectator: !!p.spectator, late: !!p.late,
            })),
            seated: this.seated(), queue: r.queue, wins: r.wins, results: r.results, now: Date.now(),
            rematch: r.rematch || [], nextAt: r.nextAt || null,
        };
    }

    broadcast() {
        const r = this.room;
        if (!r) return;
        const room = this.publicRoom();
        const ctx = this.ctx();
        for (const [ws, c] of this.conns) {
            if (!c.pid) continue;
            const view = r.state ? this.mod.view(r.state, c.pid, ctx) : null;
            this.send(ws, { t: 'state', me: c.pid, room, view });
        }
    }

    async alarm() {
        if (this.conns.size) { this.touch(); this.report(); return; }
        this.report(true);
        await this.state.storage.deleteAll();
        this.room = null;
    }
}
