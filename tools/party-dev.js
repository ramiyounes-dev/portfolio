/* Local dev host for the party games, no dependencies: `npm run party` then open http://127.0.0.1:8788/explore/
   Serves the site and runs the real PartyRoom class with in-memory stand-ins for Durable Object storage
   and WebSockets. Production runs on Cloudflare (wrangler deploy); this is only for local play-testing. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PartyRoom } from '../workers/party/room.js';
import { PartyLobby } from '../workers/party/lobby.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8788);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.jpg': 'image/jpeg' };

/* ---------- Durable Object stand-ins ---------- */
function makeState() {
    const mem = new Map();
    const state = {
        storage: {
            get: async k => (mem.has(k) ? structuredClone(mem.get(k)) : undefined),
            put: async (k, v) => { mem.set(k, structuredClone(v)); },
            setAlarm: async () => {},
            deleteAll: async () => mem.clear(),
        },
        // Like Cloudflare: no request is handled until the constructor's async load has finished
        blockConcurrencyWhile: fn => { state.ready = Promise.resolve(fn()); return state.ready; },
    };
    return state;
}
const lobby = new PartyLobby(makeState());
const ENV = { PARTY_LOBBY: { idFromName: n => n, get: () => ({ fetch: (u, init) => lobby.fetch(new Request(u, init)) }) } };
const rooms = new Map();
function roomFor(code) {
    if (!rooms.has(code)) rooms.set(code, new PartyRoom(makeState(), ENV));
    return rooms.get(code);
}

/* ---------- Minimal WebSocket server socket (RFC 6455, text frames) ---------- */
class DevSocket {
    constructor(sock) {
        this.sock = sock;
        this.listeners = { message: [], close: [], error: [] };
        this.buf = Buffer.alloc(0);
        this.open = true;
        sock.on('data', d => this.onData(d));
        sock.on('close', () => this.emitClose());
        sock.on('error', () => this.emitClose());
    }
    addEventListener(type, fn) {
        (this.listeners[type] || (this.listeners[type] = [])).push(fn);
        if (type === 'message' && this.early) { const q = this.early; this.early = null; q.forEach(m => fn(m)); }
    }
    emitClose() { if (!this.open) return; this.open = false; this.listeners.close.forEach(fn => fn({})); }
    send(text) {
        if (!this.open) return;
        const payload = Buffer.from(text);
        const len = payload.length;
        const head = len < 126 ? Buffer.from([0x81, len])
            : len < 65536 ? Buffer.from([0x81, 126, len >> 8, len & 255])
                : (() => { const b = Buffer.alloc(10); b[0] = 0x81; b[1] = 127; b.writeBigUInt64BE(BigInt(len), 2); return b; })();
        this.sock.write(Buffer.concat([head, payload]));
    }
    close() { if (this.open) { try { this.sock.write(Buffer.from([0x88, 0])); } catch (e) { /* */ } this.sock.end(); this.emitClose(); } }
    onData(d) {
        this.buf = Buffer.concat([this.buf, d]);
        while (this.buf.length >= 2) {
            const op = this.buf[0] & 0x0f;
            let len = this.buf[1] & 0x7f, off = 2;
            if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
            else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
            const masked = this.buf[1] & 0x80;
            const total = off + (masked ? 4 : 0) + len;
            if (this.buf.length < total) return;
            const mask = masked ? this.buf.subarray(off, off + 4) : null;
            const data = Buffer.from(this.buf.subarray(off + (masked ? 4 : 0), total));
            if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
            this.buf = this.buf.subarray(total);
            if (process.env.PARTY_DEBUG) console.log("frame", op, data.length);
            if (op === 0x1) {
                const m = { data: data.toString('utf8') };
                if (this.listeners.message.length) this.listeners.message.forEach(fn => fn(m));
                else (this.early || (this.early = [])).push(m);   // arrived before the room attached
            }
            else if (op === 0x8) { this.close(); return; }
            else if (op === 0x9) this.sock.write(Buffer.concat([Buffer.from([0x8a, data.length]), data]));
        }
    }
}

/* ---------- HTTP ---------- */
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/party-rooms') {
        lobby.fetch(new Request('https://lobby/list' + url.search)).then(async r => res.writeHead(200, { 'Content-Type': 'application/json' }).end(await r.text()));
        return;
    }
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch (e) { /* 404 below */ }
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data);
    });
});

server.on('upgrade', (req, sock) => {
    const url = new URL(req.url, 'http://x');
    const m = url.pathname.match(/^\/party\/([A-Z0-9]{4,5})$/);
    if (!m) { sock.destroy(); return; }
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    url.searchParams.set('code', m[1]);
    const room = roomFor(m[1]);
    const ws = new DevSocket(sock);
    (room.state.ready || Promise.resolve()).then(() => room.attach(ws, url.searchParams));
});

server.listen(PORT, '127.0.0.1', () => console.log(`Party dev host: http://127.0.0.1:${PORT}/explore/`));
