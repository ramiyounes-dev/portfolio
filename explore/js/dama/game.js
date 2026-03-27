import { DamaBoard } from './Board.js';

const board = new DamaBoard();

const state = {
    board,
    currentPlayer: 'A',
    startingPlayer: 'A',
    winner: null,
    gameMode: 'local',
    myRole: null,
    aiPlayer: 'B',
    scores: { A: 0, B: 0 },
    moveCount: 0,
    listeners: {}
};

function on(event, cb) {
    if (!state.listeners[event]) state.listeners[event] = [];
    state.listeners[event].push(cb);
}

function emit(event, data) {
    (state.listeners[event] || []).forEach(cb => cb(data));
}

function setGameMode(gm) {
    state.gameMode = gm;
    if (gm === 'ai') { state.aiPlayer = 'B'; state.myRole = 'A'; }
    else if (gm === 'local') { state.myRole = null; }
    emit('gameModeChange', { gameMode: gm });
}

function tryMove(move) {
    if (state.winner) return false;
    const ok = board.applyMove(move);
    if (!ok) return false;
    state.moveCount++;
    emit('boardChange', null);
    _checkEnd();
    return true;
}

function applyRemoteMove(move) {
    if (state.winner) return;
    board.applyMove(move);
    state.moveCount++;
    emit('boardChange', null);
    _checkEnd();
}

function _checkEnd() {
    const winner = board.checkWin();
    if (winner) {
        state.winner = winner;
        emit('win', { winner });
        return;
    }
    const next = state.currentPlayer === 'A' ? 'B' : 'A';
    if (!board.hasLegalMoves(next)) {
        state.winner = state.currentPlayer;
        emit('win', { winner: state.currentPlayer });
        return;
    }
    _nextTurn();
}

function _nextTurn() {
    state.currentPlayer = state.currentPlayer === 'A' ? 'B' : 'A';
    emit('turnChange', { player: state.currentPlayer });
    if (state.gameMode === 'ai' && state.currentPlayer === state.aiPlayer)
        emit('aiTurn', { player: state.aiPlayer });
}

function finishTurn() {
    state.moveCount++;
    _checkEnd();
}

function resetGame() {
    const fresh = new DamaBoard();
    board.grid = fresh.grid;
    state.currentPlayer = state.startingPlayer;
    state.winner = null;
    state.moveCount = 0;
    emit('reset', null);
    emit('boardChange', null);
    emit('turnChange', { player: state.startingPlayer });
}

function replayMoves(moves) {
    const fresh = new DamaBoard();
    board.grid = fresh.grid;
    state.currentPlayer = state.startingPlayer;
    state.winner = null;
    state.moveCount = 0;

    for (const move of moves) {
        if (state.winner) break;
        board.applyMove(move);
        state.moveCount++;
        const winner = board.checkWin();
        if (winner) { state.winner = winner; }
        else { state.currentPlayer = state.currentPlayer === 'A' ? 'B' : 'A'; }
    }
    emit('reset', null);
    emit('boardChange', null);
    emit('turnChange', { player: state.currentPlayer });
    if (state.winner) emit('win', { winner: state.winner });
}

export { state, board, on, emit, setGameMode, tryMove, applyRemoteMove, finishTurn, resetGame, replayMoves };
