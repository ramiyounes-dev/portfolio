export const net = {
    ws: null,
    myRole: null,
    opponentConnected: false,
    scores: { A: 0, B: 0 },
    roomCode: null,
    connected: false,
};

const listeners = {};

export function onNet(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
}

function emitNet(event, data) {
    (listeners[event] || []).forEach(cb => cb(data));
}

export function netSend(msg) {
    if (net.ws && net.ws.readyState === WebSocket.OPEN) {
        net.ws.send(JSON.stringify(msg));
    }
}

export function connectToRoom(roomCode) {
    return new Promise((resolve, reject) => {
        net.roomCode = roomCode.toUpperCase();
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${proto}//${location.host}/ws/${net.roomCode}`;

        net.ws = new WebSocket(url);

        net.ws.onopen = () => {
            net.connected = true;
            emitNet('connected', null);
        };

        net.ws.onmessage = (e) => {
            let msg;
            try { msg = JSON.parse(e.data); } catch { return; }

            if (msg.type === 'init') {
                net.myRole = msg.role;
                net.opponentConnected = msg.opponentConnected;
                net.scores = msg.scores;
                resolve(msg);
            } else if (msg.type === 'opponent_joined') {
                net.opponentConnected = true;
            } else if (msg.type === 'opponent_left') {
                net.opponentConnected = false;
            } else if (msg.type === 'score') {
                net.scores = msg.scores;
            }

            emitNet(msg.type, msg);
        };

        net.ws.onclose = (e) => {
            net.connected = false;
            net.opponentConnected = false;
            emitNet('disconnected', { code: e.code, reason: e.reason });
        };

        net.ws.onerror = () => {
            net.connected = false;
            reject(new Error('WebSocket connection failed'));
        };

        setTimeout(() => reject(new Error('Connection timeout')), 8000);
    });
}

export function disconnect() {
    if (net.ws) {
        net.ws.close();
        net.ws = null;
    }
    net.connected = false;
    net.opponentConnected = false;
    net.myRole = null;
}
