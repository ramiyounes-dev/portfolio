import { Board } from './Board.js';

const board = new Board();

const state = {
    board,
    currentPlayer: 'A',
    startingPlayer: 'A',
    mode: 'move',
    winner: null,
    gameMode: 'local',
    myRole: null,
    aiPlayer: 'B',
    scores: { A: 0, B: 0 },
    moveCount: 0,
    gen: 0,            // bumps on every reset: late AI replies for an old game are ignored
    listeners: {}
};

function on(event, cb) {
    if (!state.listeners[event]) state.listeners[event] = [];
    state.listeners[event].push(cb);
}

function emit(event, data) {
    (state.listeners[event] || []).forEach(cb => cb(data));
}

function setMode(mode) {
    state.mode = mode;
    emit('modeChange', { mode });
}

function setGameMode(gm) {
    state.gameMode = gm;
    state.gen++;
    if (gm === 'ai') {
        state.aiPlayer = 'B';
        state.myRole = 'A';
    } else if (gm === 'local') {
        state.myRole = null;
    }
    emit('gameModeChange', { gameMode: gm });
}

function tryMovePawn(x, y) {
    if (state.winner) return false;
    if (state.mode !== 'move') return false;
    const ok = board.movePawn(state.currentPlayer, { x, y });
    if (!ok) return false;
    state.moveCount++;
    emit('boardChange', null);
    const winner = board.checkWin();
    if (winner) {
        state.winner = winner;
        emit('win', { winner });
    } else {
        _nextTurn();
    }
    return true;
}

function tryPlaceWall(wx, wy, orientation) {
    if (state.winner) return false;
    const ok = board.placeWall(wx, wy, orientation, state.currentPlayer);
    if (!ok) return false;
    state.moveCount++;
    emit('boardChange', null);
    _nextTurn();
    return true;
}

function applyRemoteMove(msg) {
    if (state.winner) return false;
    if (msg.type === 'move') {
        if (!board.movePawn(state.currentPlayer, { x: msg.x, y: msg.y })) return false;
        state.moveCount++;
        emit('boardChange', null);
        const winner = board.checkWin();
        if (winner) {
            state.winner = winner;
            emit('win', { winner });
        } else {
            _nextTurn();
        }
    } else if (msg.type === 'wall') {
        if (!board.placeWall(msg.wx, msg.wy, msg.orientation, state.currentPlayer)) return false;
        state.moveCount++;
        emit('boardChange', null);
        _nextTurn();
    } else if (msg.type === 'reset') {
        resetGame();
    }
    return true;
}

function _nextTurn() {
    state.currentPlayer = state.currentPlayer === 'A' ? 'B' : 'A';
    state.mode = 'move';
    emit('turnChange', { player: state.currentPlayer });
}

function resetGame() {
    const fresh = new Board();
    state.gen++;
    board.grid = fresh.grid;
    board.walls = fresh.walls;
    board.wallOwners = fresh.wallOwners;
    board.pawns = fresh.pawns;
    board.wallCounts = fresh.wallCounts;
    state.currentPlayer = state.startingPlayer;
    state.mode = 'move';
    state.winner = null;
    state.moveCount = 0;
    emit('reset', null);
    emit('boardChange', null);
    emit('turnChange', { player: state.startingPlayer });
}

function replayMoves(moves) {
    const fresh = new Board();
    state.gen++;
    board.grid = fresh.grid;
    board.walls = fresh.walls;
    board.wallOwners = fresh.wallOwners;
    board.pawns = fresh.pawns;
    board.wallCounts = fresh.wallCounts;
    state.currentPlayer = state.startingPlayer;
    state.mode = 'move';
    state.winner = null;
    state.moveCount = 0;

    for (const msg of moves) {
        if (state.winner) break;
        if (msg.type === 'move') {
            board.movePawn(state.currentPlayer, { x: msg.x, y: msg.y });
        } else if (msg.type === 'wall') {
            board.placeWall(msg.wx, msg.wy, msg.orientation, state.currentPlayer);
        }
        state.moveCount++;
        const winner = board.checkWin();
        if (winner) {
            state.winner = winner;
        } else {
            state.currentPlayer = state.currentPlayer === 'A' ? 'B' : 'A';
        }
    }
    state.mode = 'move';
    emit('reset', null);
    emit('boardChange', null);
    emit('turnChange', { player: state.currentPlayer });
    if (state.winner) emit('win', { winner: state.winner });
}

export { state, board, on, emit, setMode, setGameMode, tryMovePawn, tryPlaceWall, applyRemoteMove, resetGame, replayMoves };
