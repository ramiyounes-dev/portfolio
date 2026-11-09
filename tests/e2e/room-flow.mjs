/* End-to-end room flow against the local dev host (`npm run party`). Run: node tests/e2e/room-flow.mjs */
const BASE = process.env.PARTY_URL || 'ws://127.0.0.1:8788';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function client(code, game, { create = false } = {}) {
    const c = { msgs: [], state: null, pid: null, errors: [] };
    c.ws = new WebSocket(`${BASE}/party/${code}?game=${game}${create ? '&create=1' : ''}`);
    c.ws.onmessage = e => {
        const m = JSON.parse(e.data);
        c.msgs.push(m);
        if (m.t === 'state') c.state = m;
        if (m.t === 'welcome') c.pid = m.pid;
        if (m.t === 'error' || m.t === 'err') c.errors.push(m.code);
    };
    c.ready = new Promise(r => { c.ws.onopen = r; });
    c.send = o => c.ws.send(JSON.stringify(o));
    c.hello = (name, pid) => c.send({ t: 'hello', name, pid });
    c.act = a => c.send({ t: 'act', a });
    return c;
}

export function check(cond, label) {
    if (!cond) { console.error('FAIL', label); process.exitCode = 1; }
    else console.log('ok  ', label);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    const code = 'T' + Math.random().toString(36).slice(2, 5).toUpperCase().replace(/[^A-Z]/g, 'K').padEnd(3, 'K');
    const A = client(code, 'tictactoe', { create: true }); await A.ready; A.hello('Alice'); await sleep(150);
    check(A.pid && A.state.room.host === A.pid, 'creator is host');

    const B = client(code, 'tictactoe'); await B.ready; B.hello('alice'); await sleep(150);
    check(B.errors.includes('name_taken'), 'duplicate nickname refused');
    B.hello('Bob'); await sleep(150);
    check(A.state.room.players.length === 2, 'two players in lobby');

    const W = client(code, 'battleship'); await W.ready; await sleep(100);
    check(W.errors.includes('wrong_game') || W.errors.includes('bad_game'), 'wrong game refused');

    B.send({ t: 'start' }); await sleep(100);
    check(A.state.room.phase === 'lobby', 'only the host can start');
    A.send({ t: 'start' }); await sleep(150);
    check(A.state.room.phase === 'playing', 'game started');
    const v = A.state.view;
    const turnClient = v.turn === A.pid ? A : B;
    const other = turnClient === A ? B : A;

    const C = client(code, 'tictactoe'); await C.ready; C.hello('Carol'); await sleep(150);
    check(C.state.room.queue.includes(C.pid), 'late joiner goes to the challenger queue');
    check(!C.state.room.seated.includes(C.pid), 'late joiner is a spectator');

    // Reconnect: Bob drops and comes back with his id
    const bobPid = B.pid;
    B.ws.close(); await sleep(150);
    check(A.state.room.players.find(p => p.id === bobPid).connected === false, 'drop is visible to others');
    const B2 = client(code, 'tictactoe'); await B2.ready; B2.hello('Bob', bobPid); await sleep(150);
    check(B2.pid === bobPid && B2.state.room.seated.includes(bobPid), 'reconnect restores the same seat');
    const T = turnClient === B ? B2 : turnClient, O = other === B ? B2 : other;

    // T wins with the top row, best of 3 => play two games (X alternates)
    async function winGame(x, o) { for (const [p, c] of [[x, 0], [o, 3], [x, 1], [o, 4], [x, 2]]) { p.act({ cell: c }); await sleep(60); } }
    await winGame(T, O);
    check(A.state.view.scores[T.pid] === 1, 'game 1 scored');
    await sleep(2800);
    // game 2: X switched to O-player; let T win as O: X plays 0,1, then T blocks... simpler: X (O client) plays badly
    const x2 = A.state.view.x === T.pid ? T : O, o2 = x2 === T ? O : T;
    for (const [p, c] of [[x2, 0], [o2, 4], [x2, 1], [o2, 2], [x2, 8], [o2, 6]]) { p.act({ cell: c }); await sleep(60); }
    await sleep(150);
    check(A.state.room.phase === 'results', 'match over after 2 wins');
    check(A.state.room.results.winners[0] === T.pid, 'winner recorded');
    check(A.state.room.wins[T.pid] === 1, 'room win tally');

    A.send({ t: 'rematch' }); await sleep(150);
    const seats = A.state.room.seated;
    check(seats.includes(T.pid) && seats.includes(C.pid) && !seats.includes(O.pid), 'winner stays on, challenger comes in');
    check(A.state.room.queue[0] === O.pid, 'loser goes to the back of the queue');

    A.send({ t: 'lobby' }); await sleep(120);
    check(A.state.room.phase === 'lobby', 'back to lobby');
    for (const c of [A, B2, C]) c.ws.close();
    await sleep(100);
    process.exit();
}
