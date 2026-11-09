/* Public room list + auto-start at the target size. Run against `npm run party`. */
import { check } from './room-flow.mjs';
const BASE = process.env.PARTY_URL || 'ws://127.0.0.1:8788';
const HTTP = BASE.replace(/^ws/, 'http');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function client(code, game, q = '') {
    const c = { state: null, errors: [] };
    c.ws = new WebSocket(`${BASE}/party/${code}?game=${game}${q}`);
    c.ws.onmessage = e => { const m = JSON.parse(e.data); if (m.t === 'state') c.state = m; if (m.t === 'error') c.errors.push(m.code); };
    c.ready = new Promise(r => { c.ws.onopen = r; });
    c.send = o => c.ws.send(JSON.stringify(o));
    return c;
}
const code = 'P' + Math.random().toString(36).slice(2, 5).toUpperCase().replace(/[^A-Z]/g, 'Q').padEnd(3, 'Q');
const A = client(code, 'nim', '&create=1&target=3&visibility=public'); await A.ready; A.send({ t: 'hello', name: 'Host' }); await sleep(200);
let list = await (await fetch(`${HTTP}/party-rooms?game=nim`)).json();
const mine = list.find(r => r.code === code);
check(mine && mine.host === 'Host' && mine.players === 1 && mine.target === 3 && mine.phase === 'lobby', 'public room is listed with host, count and target');
check(!(await (await fetch(`${HTTP}/party-rooms?game=uno`)).json()).some(r => r.code === code), 'list is per game');
const priv = 'R' + code.slice(1);
const X = client(priv, 'nim', '&create=1&target=2&visibility=private'); await X.ready; X.send({ t: 'hello', name: 'Secret' }); await sleep(200);
list = await (await fetch(`${HTTP}/party-rooms?game=nim`)).json();
check(!list.some(r => r.code === priv), 'private rooms are not listed');
const B = client(code, 'nim'); await B.ready; B.send({ t: 'hello', name: 'B' }); await sleep(150);
check(A.state.room.phase === 'lobby', 'not started below target');
const C = client(code, 'nim'); await C.ready; C.send({ t: 'hello', name: 'C' }); await sleep(200);
check(A.state.room.phase === 'playing', 'auto-starts when the target is reached');
list = await (await fetch(`${HTTP}/party-rooms?game=nim`)).json();
check(list.find(r => r.code === code)?.phase === 'playing', 'list shows in progress');
for (const c of [A, B, C, X]) c.ws.close();
process.exit();
