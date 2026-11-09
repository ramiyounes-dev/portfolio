/* A test bot that joins a room and plays random legal moves.
   Usage: node tests/e2e/bot.mjs CODE game Name [seconds]   (against `npm run party`) */
const [code, game, name = 'Bot', secs = '120'] = process.argv.slice(2);
const BASE = process.env.PARTY_URL || 'ws://127.0.0.1:8788';
import { STRATEGIES } from './strategies.mjs';



let me = null, busy = false;
const ws = new WebSocket(`${BASE}/party/${code}?game=${game}`);
ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', name }));
ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === 'welcome') me = m.pid;
    if (m.t === 'error') { console.log('error', m.code); process.exit(1); }
    if (m.t !== 'state' || !m.view || busy) return;
    const strat = STRATEGIES[game];
    const a = strat && strat(m.view, me, m.room);
    if (a) { busy = true; setTimeout(() => { ws.send(JSON.stringify({ t: 'act', a })); busy = false; }, 500 + Math.random() * 700); }
};
setTimeout(() => process.exit(0), Number(secs) * 1000);
