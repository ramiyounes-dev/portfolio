/* PartyLobby: a single Durable Object holding the list of open public rooms.
   Every PartyRoom reports a short summary when it changes; the setup screen lists them per game. */

const STALE_MS = 3 * 60 * 1000;     // a room that stops reporting disappears from the list

export class PartyLobby {
    constructor(state) {
        this.state = state;
        this.rooms = new Map();
        state.blockConcurrencyWhile(async () => {
            const saved = (await state.storage.get('rooms')) || [];
            for (const r of saved) this.rooms.set(r.code, r);
        });
    }

    prune() {
        const now = Date.now();
        for (const [code, r] of this.rooms) if (now - r.at > STALE_MS) this.rooms.delete(code);
    }

    async fetch(request) {
        const url = new URL(request.url);
        if (request.method === 'POST' && url.pathname === '/report') {
            const r = await request.json().catch(() => null);
            if (!r || typeof r.code !== 'string') return new Response('bad', { status: 400 });
            if (r.remove || r.visibility !== 'public') this.rooms.delete(r.code);
            else this.rooms.set(r.code, { ...summary(r), at: Date.now() });
            this.prune();
            await this.state.storage.put('rooms', [...this.rooms.values()]);
            return new Response('ok');
        }
        if (url.pathname === '/list') {
            this.prune();
            const game = url.searchParams.get('game');
            const list = [...this.rooms.values()]
                .filter(r => (!game || r.game === game) && r.players < r.max)
                .sort((a, b) => (a.phase === 'lobby' ? 0 : 1) - (b.phase === 'lobby' ? 0 : 1) || b.at - a.at)
                .slice(0, 30)
                .map(({ at, ...rest }) => rest);
            return new Response(JSON.stringify(list), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
        }
        return new Response('not found', { status: 404 });
    }
}

/** Only these fields ever leave a room: no player ids, no game state. */
export function summary(r) {
    const str = (v, n) => String(v ?? '').slice(0, n);
    const int = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || 0));
    return {
        code: str(r.code, 5), game: str(r.game, 24), host: str(r.host, 16), lang: r.lang === 'fr' ? 'fr' : 'en',
        players: int(r.players, 0, 12), target: int(r.target, 0, 12), max: int(r.max, 1, 12),
        phase: r.phase === 'lobby' ? 'lobby' : 'playing',
    };
}
