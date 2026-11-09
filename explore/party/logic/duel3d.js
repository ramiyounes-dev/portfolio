/* Server-side rules for the 3D duels (Connect 4, Dama, Quoridor), built on each game's own Board class.
   The server replays the move list to validate every move, keeps the match score and handles rematches
   (either player asks, the other accepts), so the browsers stay in sync and nobody can play out of turn. */

export function makeDuel({ id, newBoard, legal, outcome }) {
    function board(s) {
        const b = newBoard();
        let p = s.starter;
        for (const m of s.moves) { legal(b, p, m, true); p = p === 'A' ? 'B' : 'A'; }
        return b;
    }
    function newGame(s, starter) {
        s.moves = [];
        s.starter = starter;
        s.current = starter;
        s.winner = null;
        s.draw = false;
        s.resetReq = null;
        s.game++;
    }
    const pidOf = (s, role) => s.players.find(p => s.roles[p] === role);

    return {
        id, min: 2, max: 2, duel: true,
        settings: [{ key: 'queueMode', type: 'select', def: 'winner', options: ['winner', 'rotate'] }],

        setup(ctx) {
            const players = ctx.players.slice(0, 2);
            const s = { players, roles: { [players[0]]: 'A', [players[1]]: 'B' }, scores: { A: 0, B: 0 }, game: 0, declines: 0 };
            newGame(s, 'A');
            return s;
        },

        act(s, pid, a) {
            const role = s.roles[pid];
            if (!role) return { error: 'not_your_turn' };
            if (a.reset) {
                if (a.reset === 'request') { s.resetReq = role; return {}; }
                if (!s.resetReq || s.resetReq === role) return { error: 'illegal' };
                if (a.reset === 'accept') {
                    const starter = s.winner ? (s.winner === 'A' ? 'B' : 'A') : (s.starter === 'A' ? 'B' : 'A');
                    newGame(s, starter);
                } else { s.resetReq = null; s.declines++; }
                return {};
            }
            if (s.winner || s.draw) return { error: 'illegal' };
            if (role !== s.current) return { error: 'not_your_turn' };
            const b = board(s);
            const move = legal(b, role, a.m, false);
            if (!move) return { error: 'illegal' };
            s.moves.push(move);
            const res = outcome(b, role);
            if (res === 'draw') s.draw = true;
            else if (res) { s.winner = res; s.scores[res]++; }
            else s.current = role === 'A' ? 'B' : 'A';
            s.resetReq = null;
            return {};
        },

        awaiting: s => (s.winner || s.draw ? [] : [pidOf(s, s.current)].filter(Boolean)),
        seated: s => s.players,

        view(s, pid) {
            return {
                players: s.players, roles: s.roles, myRole: s.roles[pid] || null, moves: s.moves, game: s.game,
                starter: s.starter, current: s.current, winner: s.winner, draw: s.draw, scores: s.scores,
                resetReq: s.resetReq, declines: s.declines, turn: s.winner || s.draw ? null : pidOf(s, s.current),
            };
        },
    };
}
