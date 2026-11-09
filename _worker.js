export { PartyRoom } from './workers/party/room.js';
export { PartyLobby } from './workers/party/lobby.js';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Public party rooms, per game (for the setup screen)
        if (url.pathname === '/party-rooms' && request.method === 'GET') {
            const stub = env.PARTY_LOBBY.get(env.PARTY_LOBBY.idFromName('lobby'));
            return stub.fetch(`https://lobby/list?game=${encodeURIComponent(url.searchParams.get('game') || '')}`);
        }

        // Party games: one PartyRoom Durable Object per room code (server-authoritative)
        const party = url.pathname.match(/^\/party\/([A-Z0-9]{4,5})$/);
        if (party && request.headers.get('Upgrade') === 'websocket') {
            const code = party[1];
            const target = new URL(request.url);
            target.searchParams.set('code', code);
            const stub = env.PARTY_ROOM.get(env.PARTY_ROOM.idFromName('party:' + code));
            return stub.fetch(new Request(target, request));
        }

        return env.ASSETS.fetch(request);
    },
};
