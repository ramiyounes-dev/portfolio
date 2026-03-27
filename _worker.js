const VALID_TYPES = new Set([
    // Quoridor
    'move', 'wall',
    // Connect 4
    'drop', 'draw',
    // Shared
    'win', 'reset',
    'reset_request', 'reset_accept', 'reset_decline'
]);
const MAX_MSG_SIZE = 512;
const RATE_WINDOW = 1000;
const RATE_LIMIT = 20;

function validateMessage(msg) {
    if (!msg || typeof msg !== 'object') return false;
    if (!VALID_TYPES.has(msg.type)) return false;

    switch (msg.type) {
        case 'move':
            // Quoridor: { x, y } — Dama: { move: {...} }
            if (msg.move && typeof msg.move === 'object') return true;
            return Number.isInteger(msg.x) && Number.isInteger(msg.y)
                && msg.x >= 0 && msg.x <= 8 && msg.y >= 0 && msg.y <= 8;
        case 'wall':
            return Number.isInteger(msg.wx) && Number.isInteger(msg.wy)
                && msg.wx >= 0 && msg.wx <= 7 && msg.wy >= 0 && msg.wy <= 7
                && (msg.orientation === 'H' || msg.orientation === 'V');
        case 'drop':
            return Number.isInteger(msg.col) && msg.col >= 0 && msg.col <= 6;
        case 'win':
            return msg.winner === 'A' || msg.winner === 'B';
        case 'draw':
        case 'reset':
        case 'reset_request':
        case 'reset_accept':
        case 'reset_decline':
            return true;
        default:
            return false;
    }
}

export class GameRoom {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.rateLimits = new Map();
    }

    isRateLimited(ws) {
        const now = Date.now();
        let entry = this.rateLimits.get(ws);
        if (!entry || now - entry.windowStart > RATE_WINDOW) {
            entry = { windowStart: now, count: 0 };
            this.rateLimits.set(ws, entry);
        }
        entry.count++;
        return entry.count > RATE_LIMIT;
    }

    async fetch(request) {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Expected WebSocket', { status: 426 });
        }

        const existing = this.state.getWebSockets();
        if (existing.length >= 2) {
            return new Response('Room full', { status: 409 });
        }

        const usedRoles = existing.map(ws => this.state.getTags(ws)[0]);
        const role = usedRoles.includes('A') ? 'B' : 'A';

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        this.state.acceptWebSocket(server, [role]);

        // Always refresh the alarm on connection so the room stays alive
        await this.state.storage.setAlarm(Date.now() + 3 * 60 * 60 * 1000);

        const scores = (await this.state.storage.get('scores')) || { A: 0, B: 0 };
        const moves = (await this.state.storage.get('moves')) || [];
        const opponentConnected = existing.length > 0;

        server.send(JSON.stringify({
            type: 'init',
            role,
            opponentConnected,
            scores,
        }));

        if (moves.length > 0) {
            server.send(JSON.stringify({ type: 'state_sync', moves }));
        }

        if (opponentConnected) {
            for (const ws of existing) {
                ws.send(JSON.stringify({ type: 'opponent_joined' }));
            }
        }

        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws, message) {
        if (typeof message === 'string' && message.length > MAX_MSG_SIZE) return;
        if (this.isRateLimited(ws)) return;

        const role = this.state.getTags(ws)[0];
        const opponentRole = role === 'A' ? 'B' : 'A';
        const opponents = this.state.getWebSockets(opponentRole);

        let msg;
        try { msg = JSON.parse(message); } catch { return; }
        if (!validateMessage(msg)) return;

        await this.state.storage.setAlarm(Date.now() + 3 * 60 * 60 * 1000);

        if (msg.type === 'move' || msg.type === 'wall' || msg.type === 'drop') {
            const moves = (await this.state.storage.get('moves')) || [];
            moves.push(msg);
            await this.state.storage.put('moves', moves);
        } else if (msg.type === 'reset' || msg.type === 'reset_accept') {
            await this.state.storage.put('moves', []);
        }

        const relay = ['move', 'wall', 'drop', 'draw', 'reset',
                        'reset_request', 'reset_accept', 'reset_decline'];
        if (relay.includes(msg.type)) {
            const sanitized = JSON.stringify(msg);
            for (const opp of opponents) {
                opp.send(sanitized);
            }
        } else if (msg.type === 'win') {
            await this.state.storage.put('moves', []);
            const scores = (await this.state.storage.get('scores')) || { A: 0, B: 0 };
            scores[msg.winner] = (scores[msg.winner] || 0) + 1;
            await this.state.storage.put('scores', scores);

            const scoreMsg = JSON.stringify({ type: 'score', scores });
            ws.send(scoreMsg);
            for (const opp of opponents) {
                opp.send(scoreMsg);
            }
        }
    }

    async webSocketClose(ws) {
        this.rateLimits.delete(ws);
        const role = this.state.getTags(ws)[0];
        const opponentRole = role === 'A' ? 'B' : 'A';
        const opponents = this.state.getWebSockets(opponentRole);

        for (const opp of opponents) {
            opp.send(JSON.stringify({ type: 'opponent_left' }));
        }

        // If no one is left, schedule a short cleanup alarm instead of deleting
        // immediately — this lets players reconnect within 5 minutes and resume.
        const remaining = this.state.getWebSockets().filter(s => s !== ws);
        if (remaining.length === 0) {
            await this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
        }
    }

    async webSocketError(ws, _error) {
        await this.webSocketClose(ws);
    }

    async alarm() {
        await this.state.storage.deleteAll();
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.headers.get('Upgrade') === 'websocket') {
            const match = url.pathname.match(/^\/ws\/([a-zA-Z0-9-]{2,24})$/);
            if (!match) return new Response('Invalid room ID', { status: 400 });

            const roomId = match[1].toUpperCase();
            const id = env.GAME_ROOM.idFromName(roomId);
            const stub = env.GAME_ROOM.get(id);
            return stub.fetch(request);
        }

        return env.ASSETS.fetch(request);
    },
};
