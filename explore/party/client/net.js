/* WebSocket to a PartyRoom, with automatic reconnection (the server keeps the seat for 60 s). */

const FATAL = new Set(['not_found', 'wrong_game', 'full', 'bad_game', 'taken']);

export function connect({ code, game, create = false, lang = 'en', extra = {}, onMessage, onStatus }) {
    let ws = null;
    let closedByUs = false;
    let attempt = 0;
    let firstOpen = true;
    let fatal = false;
    let pingTimer = null;
    const queue = [];

    function url() {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const q = new URLSearchParams({ game, lang });
        if (create && firstOpen) {
            q.set('create', '1');
            for (const [k, v] of Object.entries(extra)) if (v != null) q.set(k, String(v));
        }
        return `${proto}//${location.host}/party/${code}?${q}`;
    }

    function open() {
        onStatus && onStatus(attempt ? 'reconnecting' : 'connecting');
        ws = new WebSocket(url());
        ws.onopen = () => {
            attempt = 0;
            firstOpen = false;
            onStatus && onStatus('open');
            clearInterval(pingTimer);
            pingTimer = setInterval(() => send({ t: 'ping' }), 25_000);
            onMessage({ t: '_open' });
            while (queue.length) ws.send(queue.shift());
        };
        ws.onmessage = e => {
            let msg;
            try { msg = JSON.parse(e.data); } catch { return; }
            if (msg.t === 'error' && FATAL.has(msg.code)) fatal = true;
            onMessage(msg);
        };
        ws.onclose = () => {
            clearInterval(pingTimer);
            if (closedByUs || fatal) { onStatus && onStatus('closed'); return; }
            attempt++;
            onStatus && onStatus('reconnecting');
            setTimeout(open, Math.min(5000, 400 * 2 ** Math.min(attempt, 4)));
        };
    }

    function send(obj) {
        const s = JSON.stringify(obj);
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(s);
        else if (obj.t !== 'ping') queue.push(s);
    }

    open();
    return {
        send,
        close() { closedByUs = true; clearInterval(pingTimer); try { ws.close(1000); } catch (e) { /* */ } },
    };
}
