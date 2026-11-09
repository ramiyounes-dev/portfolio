/* Online play for the 3D duels, on the shared PartyRoom server (same rooms, codes, public list and reconnection
   as every other Explore game). The server validates moves; this adapter turns its state updates back into the
   small event protocol the games already speak: init, state_sync, drop / move / wall, score,
   reset_request / reset_accept / reset_decline, opponent_joined / opponent_left, plus lobby and error. */

import { connect } from '../party/client/net.js';

export const net = {
    myRole: null,
    opponentConnected: false,
    scores: { A: 0, B: 0 },
    roomCode: null,
    connected: false,
    room: null,
    me: null,
};

const listeners = {};
export function onNet(event, cb) { (listeners[event] = listeners[event] || []).push(cb); }
function emitNet(event, data) { (listeners[event] || []).forEach(cb => cb(data)); }

let conn = null;
let last = null;           // last game view
let started = false;       // 'init' sent for this connection
let name = '';

const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* blocked */ } },
};

/** Old-protocol message for a server move. */
function toMsg(m) {
    if (m.type === 'drop') return { type: 'drop', col: m.col };
    if (m.from) return { type: 'move', move: m };       // Dama
    return { ...m };                                     // Quoridor: { type: 'move', x, y } | { type: 'wall', ... }
}

export function netSend(msg) {
    if (!conn) return;
    if (msg.type === 'drop') conn.send({ t: 'act', a: { m: { col: msg.col } } });
    else if (msg.type === 'move' && msg.move) conn.send({ t: 'act', a: { m: msg.move } });
    else if (msg.type === 'move' || msg.type === 'wall') conn.send({ t: 'act', a: { m: msg } });
    else if (msg.type === 'reset_request') conn.send({ t: 'act', a: { reset: 'request' } });
    else if (msg.type === 'reset_accept') conn.send({ t: 'act', a: { reset: 'accept' } });
    else if (msg.type === 'reset_decline') conn.send({ t: 'act', a: { reset: 'decline' } });
    // 'win' / 'draw' / 'reset' are decided by the server now
}

function opponentOnline(room, view) {
    const other = view.players.find(id => id !== net.me);
    const p = room.players.find(q => q.id === other);
    return !!(p && p.connected);
}

function onState(room, view) {
    net.room = room;
    if (room.phase === 'lobby' || !view) { emitNet('lobby', { room, code: net.roomCode, me: net.me }); return; }
    net.myRole = view.myRole;
    const online = opponentOnline(room, view);
    if (!started) {
        started = true;
        net.opponentConnected = online;
        net.scores = view.scores;
        const names = {};
        for (const [pid, role] of Object.entries(view.roles)) { const p = room.players.find(q => q.id === pid); if (p) names[role] = p.name; }
        emitNet('init', { role: view.myRole, opponentConnected: online, scores: view.scores, startingPlayer: view.starter, names });
        if (view.moves.length) emitNet('state_sync', { moves: view.moves.map(toMsg) });
        last = view;
        return;
    }
    const prev = last;
    last = view;
    if (online !== net.opponentConnected) { net.opponentConnected = online; emitNet(online ? 'opponent_joined' : 'opponent_left', null); }
    if (view.game !== prev.game) {
        net.scores = view.scores;
        emitNet('score', { scores: view.scores, nextStarter: view.starter });
        emitNet('reset_accept', null);
        return;
    }
    if (view.moves.length > prev.moves.length) {
        for (let i = prev.moves.length; i < view.moves.length; i++) {
            const mover = (i % 2 === 0) ? view.starter : (view.starter === 'A' ? 'B' : 'A');
            if (mover !== view.myRole) emitNet(toMsg(view.moves[i]).type, toMsg(view.moves[i]));
        }
    } else if (view.moves.length < prev.moves.length) emitNet('state_sync', { moves: view.moves.map(toMsg) });
    if (view.scores.A !== prev.scores.A || view.scores.B !== prev.scores.B) {
        net.scores = view.scores;
        emitNet('score', { scores: view.scores, nextStarter: view.winner ? (view.winner === 'A' ? 'B' : 'A') : null });
    }
    if (view.resetReq && view.resetReq !== view.myRole && prev.resetReq !== view.resetReq) emitNet('reset_request', null);
    if (view.declines > prev.declines && prev.resetReq === view.myRole) emitNet('reset_decline', null);
}

/** Create or join a room. Resolves when the server accepts us (the game itself starts with 'init'). */
export function connectParty({ game, code, create = false, name: nick, target = 2, visibility = 'private', lang = 'en' }) {
    disconnect();
    name = nick;
    net.roomCode = code;
    started = false;
    last = null;
    return new Promise((resolve, reject) => {
        let settled = false;
        conn = connect({
            code, game, create, lang, extra: create ? { target, visibility } : {},
            onStatus(s) {
                net.connected = s === 'open';
                if (s === 'reconnecting') { emitNet('disconnected', {}); started = false; }   // resync with 'init' on return
            },
            onMessage(msg) {
                switch (msg.t) {
                    case '_open': conn.send({ t: 'hello', pid: store.get('party:pid:' + code), name }); break;
                    case 'welcome':
                        net.me = msg.pid;
                        store.set('party:pid:' + code, msg.pid);
                        if (!settled) { settled = true; resolve({ code, pid: msg.pid }); }
                        break;
                    case 'state': net.me = msg.me; onState(msg.room, msg.view); break;
                    case 'err':
                        // our move was refused (out of sync): reload the true position
                        if (last) emitNet('state_sync', { moves: last.moves.map(toMsg) });
                        break;
                    case 'error':
                        if (!settled) { settled = true; reject(Object.assign(new Error(msg.code), { code: msg.code, game: msg.game })); }
                        else emitNet('error', msg);
                        break;
                }
            },
        });
    });
}

export function disconnect() {
    if (conn) { try { conn.send({ t: 'leave' }); } catch (e) { /* closed */ } const c = conn; setTimeout(() => c.close(), 100); }
    if (net.roomCode) store.set('party:pid:' + net.roomCode, null);
    conn = null;
    net.connected = false;
    net.opponentConnected = false;
    net.myRole = null;
    net.room = null;
    started = false;
}
