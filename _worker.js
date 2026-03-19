export default {
    async fetch(request, env) {
        if (request.headers.get('Upgrade') === 'websocket') {
            const url = new URL(request.url);
            const match = url.pathname.match(/^\/ws\/([a-zA-Z0-9]{2,20})$/);
            if (!match) return new Response('Invalid room ID', { status: 400 });

            const roomId = match[1].toUpperCase();
            const id = env.QUORIDOR_ROOM.idFromName(roomId);
            const stub = env.QUORIDOR_ROOM.get(id);
            return stub.fetch(request);
        }

        return env.ASSETS.fetch(request);
    },
};
