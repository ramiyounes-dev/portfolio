/* Battleship: private fleets on 10x10 grids, alternate shots. Ship positions never reach the opponent or spectators. */

export const N = 10;
export const FLEET = [
    { type: 'carrier', size: 5 },
    { type: 'battleship', size: 4 },
    { type: 'cruiser', size: 3 },
    { type: 'submarine', size: 3 },
    { type: 'destroyer', size: 2 },
];
const PLACE_MS = 120_000;

export function cellsOf(ship) {
    const out = [];
    for (let i = 0; i < ship.size; i++) out.push(ship.dir === 'h' ? ship.r * N + ship.c + i : (ship.r + i) * N + ship.c);
    return out;
}

/** A fleet is valid when it has exactly the five ships, all on the grid, without overlaps. */
export function validFleet(fleet) {
    if (!Array.isArray(fleet) || fleet.length !== FLEET.length) return false;
    const used = new Set();
    for (const spec of FLEET) {
        const ship = fleet.find(s => s && s.type === spec.type);
        if (!ship || !Number.isInteger(ship.r) || !Number.isInteger(ship.c) || (ship.dir !== 'h' && ship.dir !== 'v')) return false;
        if (ship.r < 0 || ship.c < 0) return false;
        if (ship.dir === 'h' ? ship.c + spec.size > N || ship.r >= N : ship.r + spec.size > N || ship.c >= N) return false;
        for (const cell of cellsOf({ ...ship, size: spec.size })) { if (used.has(cell)) return false; used.add(cell); }
    }
    return true;
}

export function randomFleet(rng) {
    for (;;) {
        const fleet = [];
        const used = new Set();
        let ok = true;
        for (const spec of FLEET) {
            let placed = false;
            for (let tries = 0; tries < 200 && !placed; tries++) {
                const dir = rng() < 0.5 ? 'h' : 'v';
                const r = rng.int(dir === 'v' ? N - spec.size + 1 : N), c = rng.int(dir === 'h' ? N - spec.size + 1 : N);
                const cells = cellsOf({ r, c, dir, size: spec.size });
                if (cells.some(x => used.has(x))) continue;
                cells.forEach(x => used.add(x));
                fleet.push({ type: spec.type, r, c, dir });
                placed = true;
            }
            if (!placed) { ok = false; break; }
        }
        if (ok) return fleet;
    }
}

function withSizes(fleet) { return fleet.map(s => ({ ...s, size: FLEET.find(f => f.type === s.type).size })); }

function setTurnTimer(s, ctx) {
    const sec = ctx.settings.timer || 0;
    s.timerTotal = sec * 1000;
    s.deadline = sec ? ctx.now + sec * 1000 : null;
}

function startBattle(s, ctx) {
    s.phase = 'battle';
    s.turn = s.players[ctx.rng() < 0.5 ? 0 : 1];
    setTurnTimer(s, ctx);
}

function fire(s, pid, cell, ctx) {
    const foe = s.players.find(id => id !== pid);
    const shots = s.shots[pid];
    const ships = withSizes(s.fleets[foe]);
    const hitShip = ships.find(sh => cellsOf(sh).includes(cell));
    let result = 'miss', sunk = null;
    if (hitShip) {
        result = 'hit';
        const allHit = cellsOf(hitShip).every(x => x === cell || shots[x]);
        if (allHit) { result = 'sunk'; sunk = hitShip.type; s.sunk[foe].push({ ...hitShip }); }
    }
    shots[cell] = result === 'miss' ? 'm' : 'h';
    s.last = { pid, cell, result, sunk };
    if (s.sunk[foe].length === FLEET.length) {
        s.over = { ranking: [{ id: pid, score: s.sunk[foe].length, rank: 1 }, { id: foe, score: s.sunk[pid].length, rank: 2 }], winners: [pid] };
        s.turn = null;
        s.deadline = null;
        return;
    }
    if (result === 'miss') s.turn = foe;          // a hit (or a sink) means you shoot again
    setTurnTimer(s, ctx);
}

export default {
    id: 'battleship',
    min: 2,
    max: 2,
    duel: true,
    settings: [
        { key: 'timer', type: 'int', unit: 's', def: 30, min: 0, max: 90, step: 5 },
        { key: 'queueMode', type: 'select', def: 'winner', options: ['winner', 'rotate'] },
    ],

    setup(ctx) {
        const players = ctx.players.slice(0, 2);
        const s = {
            players, phase: 'place', fleets: {}, ready: {}, shots: {}, sunk: {}, last: null,
            timerTotal: PLACE_MS, deadline: ctx.now + PLACE_MS,
        };
        for (const id of players) { s.shots[id] = Array(N * N).fill(null); s.sunk[id] = []; }
        return s;
    },

    act(s, pid, a, ctx) {
        if (s.over || !s.players.includes(pid)) return { error: 'illegal' };
        if (s.phase === 'place') {
            if (s.ready[pid]) return { error: 'illegal' };
            const fleet = a.random ? randomFleet(ctx.rng) : a.fleet;
            if (!validFleet(fleet)) return { error: 'bs.badFleet' };
            s.fleets[pid] = fleet.map(({ type, r, c, dir }) => ({ type, r, c, dir }));
            s.ready[pid] = true;
            if (s.players.every(id => s.ready[id])) startBattle(s, ctx);
            return {};
        }
        if (s.phase !== 'battle') return { error: 'illegal' };
        if (pid !== s.turn) return { error: 'not_your_turn' };
        const cell = Number(a.cell);
        if (!Number.isInteger(cell) || cell < 0 || cell >= N * N || s.shots[pid][cell]) return { error: 'illegal' };
        fire(s, pid, cell, ctx);
        return {};
    },

    tick(s, ctx) {
        if (s.over) return;
        if (s.phase === 'place') {
            for (const id of s.players) if (!s.ready[id]) { s.fleets[id] = randomFleet(ctx.rng); s.ready[id] = true; }
            startBattle(s, ctx);
            return;
        }
        const free = s.shots[s.turn].map((x, i) => (x ? -1 : i)).filter(i => i >= 0);
        fire(s, s.turn, ctx.rng.pick(free), ctx);
    },

    awaiting: s => (s.over ? [] : s.phase === 'place' ? s.players.filter(id => !s.ready[id]) : [s.turn]),
    seated: s => s.players,

    view(s, pid) {
        const me = s.players.includes(pid) ? pid : null;
        const foe = me ? s.players.find(id => id !== me) : null;
        const sunkOf = id => s.sunk[id].map(sh => ({ type: sh.type, r: sh.r, c: sh.c, dir: sh.dir, size: sh.size }));
        const v = {
            phase: s.phase, turn: s.turn, players: s.players, ready: s.ready, last: s.last,
            scores: Object.fromEntries(s.players.map(id => [id, s.sunk[s.players.find(x => x !== id)].length])),
            deadline: s.deadline, timerTotal: s.timerTotal,
            // Public: every player's shots (what they fired and the result) and the ships they have sunk
            shots: s.shots, sunk: Object.fromEntries(s.players.map(id => [id, sunkOf(id)])),
            me, foe,
            myFleet: me ? (s.fleets[me] || null) : null,   // only your own ships
            fleets: s.over ? s.fleets : null,                // everything is revealed at the end
        };
        return v;
    },
};
