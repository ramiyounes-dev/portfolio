/* Headless smoke test: a full room of bots plays one game to the results screen.
   Usage: node tests/e2e/smoke.mjs game [players=3] [timeoutSec=90] [settingsJSON]   (against `npm run party`) */
import { STRATEGIES } from './strategies.mjs';
import { fold } from '../../explore/party/core/text.js';
import { WORDS } from '../../explore/party/words/index.js';
const [game, n = '3', secs = '90', settingsJson = '{}'] = process.argv.slice(2);
const BASE = process.env.PARTY_URL || 'ws://127.0.0.1:8788';
const code = 'S' + Array.from({ length: 3 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)]).join('');
const bots = [];
const errors = [];
let done = false;

function bot(name, create, onState) {
    const b = { name, me: null, last: null, busy: false, words: [...WORDS.en, ...WORDS.fr].map(fold) };
    b.ws = new WebSocket(`${BASE}/party/${code}?game=${game}${create ? '&create=1' : ''}`);
    b.ws.onopen = () => b.ws.send(JSON.stringify({ t: 'hello', name }));
    b.ws.onmessage = e => {
        const m = JSON.parse(e.data);
        if (m.t === 'welcome') b.me = m.pid;
        if (m.t === 'error') errors.push(`${name}: ${m.code}`);
        if (m.t === 'err' && !['not_your_turn', 'illegal', 'cooldown'].includes(m.code)) errors.push(`${name}: err ${m.code}`);
        if (m.t !== 'state') return;
        b.last = m;
        onState && onState(b, m);
        think(b);
    };
    return b;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Decide on the latest state; if a move is already queued, look again right after sending it. */
function think(b) {
    const m = b.last;
    if (!m || !m.view || m.room.phase !== 'playing') return;
    if (b.busy) { b.again = true; return; }
    const a = STRATEGIES[game](m.view, b.me, m.room, b);
    if (!a) return;
    b.busy = true;
    setTimeout(() => {
        b.ws.send(JSON.stringify({ t: 'act', a }));
        b.busy = false;
        if (b.again) { b.again = false; setTimeout(() => think(b), 30); }
    }, 40 + Math.random() * 120);
}
const host = bot('Host', true, (b, m) => {
    if (m.room.phase === 'results' && !done) {
        done = true;
        const r = m.room.results;
        console.log('results:', JSON.stringify(r.ranking.map(x => [b.last.room.players.find(p => p.id === x.id)?.name, x.score])), 'winners', r.winners.length);
    }
});
bots.push(host);
await sleep(300);
host.ws.send(JSON.stringify({ t: 'settings', patch: JSON.parse(settingsJson) }));
for (let i = 1; i < Number(n); i++) { bots.push(bot('Bot' + i)); await sleep(120); }
await sleep(300);
host.ws.send(JSON.stringify({ t: 'start' }));
await sleep(1500);
const late = bot('Late');          // a late joiner arrives mid-game
bots.push(late);
const t0 = Date.now();
while (!done && Date.now() - t0 < Number(secs) * 1000) await sleep(200);
const lateState = late.last && late.last.room;
console.log(done ? 'ok   game reached results' : 'FAIL no results within timeout', '| phase', host.last?.room.phase);
console.log('late joiner:', lateState ? (lateState.seated.includes(late.me) ? 'seated' : lateState.queue.includes(late.me) ? 'queued' : 'waiting') : 'none');
if (errors.length) console.log('errors:', errors.slice(0, 5));
process.exit(done && !errors.length ? 0 : 1);
