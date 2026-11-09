/* Random legal strategies per game, used by the bot and the smoke test: (view, me, room) => action | null */
export const pick = a => a[Math.floor(Math.random() * a.length)];

export const STRATEGIES = {
    tictactoe: (v, me) => (v.phase === 'play' && v.turn === me ? { cell: pick(v.cells.map((c, i) => (c ? -1 : i)).filter(i => i >= 0)) } : null),
    rps: (v, me, room) => (v.phase === 'choose' && room.seated.includes(me) && !v.chosen.includes(me) ? { pick: pick(v.variant === 'spock' ? ['rock', 'paper', 'scissors', 'lizard', 'spock'] : ['rock', 'paper', 'scissors']) } : null),
    dilemma: (v, me) => (v.phase === 'choose' && v.partner && !v.mine ? (Math.random() < 0.2 && v.chatOn ? { type: 'say', text: pick(['🤝', 'trust me', '😈']) } : { choice: pick(['C', 'B']) }) : null),
    nim: (v, me) => {
        if (v.phase !== 'play' || v.turn !== me) return null;
        const open = v.piles.map((n, i) => (n ? i : -1)).filter(i => i >= 0);
        const p = pick(open);
        return { pile: p, take: 1 + Math.floor(Math.random() * v.piles[p]) };
    },
    dots: (v, me) => {
        if (v.turn !== me) return null;
        const free = [];
        v.h.forEach((o, i) => { if (!o) free.push({ kind: 'h', r: Math.floor(i / v.C), c: i % v.C }); });
        v.v.forEach((o, i) => { if (!o) free.push({ kind: 'v', r: Math.floor(i / (v.C + 1)), c: i % (v.C + 1) }); });
        return free.length ? pick(free) : null;
    },
    reversi: (v, me) => (v.turn === me && v.legal.length ? { cell: pick(v.legal) } : null),
    memory: (v, me) => (v.phase === 'pick' && v.turn === me ? { card: pick(v.cards.map((c, i) => (c ? -1 : i)).filter(i => i >= 0)) } : null),
    hangman: (v, me) => {
        if (v.turn !== me) return null;
        if (v.phase === 'setword') return Math.random() < 0.5 ? { random: true } : { word: pick(['château', 'pomme', 'élève', 'garçon']) };
        if (v.phase !== 'guess') return null;
        const left = 'ESARINTULOMDPCGBVHFQYXJKWZ'.split('').filter(L => !v.guessed.includes(L) && !v.wrongLetters.includes(L));
        return { letter: left[Math.floor(Math.random() * Math.min(6, left.length))] };
    },
    anagram: (v, me, room, b) => {
        if (v.phase !== 'guess' || v.done || !room.seated.includes(me)) return null;
        // A bot that sometimes cheats by asking the hint, then guesses shuffles (and occasionally the real list)
        if (v.hintsOn && !v.hint && Math.random() < 0.2) return { hint: true };
        b.tries = (b.tries || 0) + 1;
        if (b.tries % 4 === 0 && b.words) { const w = b.words.find(x => x.length === v.letters.length && [...x].sort().join('') === [...v.letters].sort().join('')); if (w) return { answer: w }; }
        return { answer: v.letters.split('').sort(() => Math.random() - 0.5).join('') };
    },
    mastermind: (v, me) => {
        if (v.phase === 'code' && v.maker === me) return { random: true };
        if (v.phase === 'break' && v.mine && !v.mine.solved && !v.mine.out) return { guess: Array.from({ length: v.len }, () => Math.floor(Math.random() * v.colors)) };
        return null;
    },
    battleship: (v, me) => {
        if (v.phase === 'place' && v.me === me && !v.ready[me]) return { random: true };
        if (v.phase === 'battle' && v.turn === me) return { cell: pick(v.shots[me].map((x, i) => (x ? -1 : i)).filter(i => i >= 0)) };
        return null;
    },
    blackjack: (v, me, room) => {
        if (!room.seated.includes(me)) return null;
        if (v.phase === 'bet' && !v.bets[me] && v.chips[me] >= v.minBet) return { bet: Math.min(v.chips[me], pick([10, 25, 50, 100])) };
        if (v.phase === 'play' && v.turn && v.turn.id === me) {
            const h = v.hands[me][v.turn.h];
            return { move: h.value.total < 15 ? 'hit' : h.cards.length === 2 && Math.random() < 0.2 ? 'double' : 'stand' };
        }
        return null;
    },
    uno: (v, me) => {
        if (!v.mine) return null;
        if (v.vulnerable && v.vulnerable !== me && Math.random() < 0.5) return { catch: v.vulnerable };
        if (v.turn !== me || v.result) return null;
        if (v.needColor) return { color: pick(['R', 'Y', 'G', 'B']) };
        if (v.phase === 'challenge') return Math.random() < 0.5 ? { challenge: true } : { accept: true };
        if (v.mine.length === 2 && Math.random() < 0.7) return { uno: true };
        if (v.playable.length) return { card: pick(v.playable), color: pick(['R', 'Y', 'G', 'B']) };
        return v.drawn !== null ? { pass: true } : { draw: true };
    },
    cheat: (v, me) => {
        if (!v.mine) return null;
        if (v.phase === 'challenge' && v.claim && v.claim.pid !== me && Math.random() < 0.15) return { call: true };
        if (v.phase !== 'play' || v.turn !== me || !v.mine.length) return null;
        const right = v.mine.filter(c => c.r === v.rank).slice(0, v.maxPlay);
        return { cards: (right.length ? right : [pick(v.mine)]).map(c => c.id) };
    },
    codenames: (v, me, room, b) => {
        if (v.phase === 'teams') {
            if (v.myTeam && !v.spymasters[v.myTeam]) return { spymaster: true };
            const ok = ['red', 'blue'].every(t => v.teams[t].length >= 2 && v.spymasters[t]);
            return ok && room.host === me ? { begin: true } : null;
        }
        if (v.phase === 'clue' && v.isSpy && v.myTeam === v.turnTeam) return { clue: 'zq' + Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 5), n: 1 + Math.floor(Math.random() * 2) };
        if (v.phase === 'guess' && v.myTeam === v.turnTeam && !v.isSpy) {
            if (v.guesses && Math.random() < 0.2) return { endTurn: true };
            const open = v.revealed.map((r, i) => (r ? -1 : i)).filter(i => i >= 0);
            const proposed = Object.values(v.proposals);
            return { propose: proposed.length && Math.random() < 0.7 ? proposed[0] : pick(open) };
        }
        return null;
    },
    pictionary: (v, me, room, b) => {
        if (v.phase === 'choose' && v.drawer === me) return { choose: Math.floor(Math.random() * 3) };
        if (v.phase !== 'draw') return null;
        if (v.drawer === me) { b.sid = (b.sid || 0) + 1; return Math.random() < 0.3 ? { seg: { id: b.sid, c: '#2f6fd1', w: 2, pts: [100, 100, 500, 500, 900, 200] } } : null; }
        if (v.done || !room.seated.includes(me)) return null;
        return { guess: pick(b.words.slice(0, 60)) };
    },
    ultimate: (v, me) => {
        if (v.turn !== me) return null;
        const moves = [];
        for (const b of v.playable) for (let i = 0; i < 9; i++) if (!v.cells[b * 9 + i]) moves.push(b * 9 + i);
        return moves.length ? { cell: pick(moves) } : null;
    },
};
