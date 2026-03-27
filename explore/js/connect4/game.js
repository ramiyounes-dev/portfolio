import { Connect4Board } from './Board.js';

const board = new Connect4Board();

const state = {
    board,
    currentPlayer: 'A',
    startingPlayer: 'A',
    winner: null,
    draw: false,
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

function tryDrop(col) {
    if (state.winner || state.draw) return { ok: false };
    const row = board.dropDisc(col, state.currentPlayer);
    if (row < 0) return { ok: false };
    state.moveCount++;
    emit('boardChange', null);
    emit('discDropped', { row, col, player: state.currentPlayer });
    _checkEnd();
    return { ok: true, row, col };
}

function applyRemoteDrop(col) {
    if (state.winner || state.draw) return;
    const row = board.dropDisc(col, state.currentPlayer);
    if (row < 0) return;
    state.moveCount++;
    emit('boardChange', null);
    emit('discDropped', { row, col, player: state.currentPlayer });
    _checkEnd();
}

function _checkEnd() {
    const winner = board.checkWin();
    if (winner) {
        state.winner = winner;
        emit('win', { winner });
        return;
    }
    if (board.isFull()) {
        state.draw = true;
        emit('draw', null);
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

function resetGame() {
    const fresh = new Connect4Board();
    board.grid = fresh.grid;
    state.currentPlayer = state.startingPlayer;
    state.winner = null;
    state.draw = false;
    state.moveCount = 0;
    emit('reset', null);
    emit('boardChange', null);
    emit('turnChange', { player: state.startingPlayer });
}

function replayMoves(moves) {
    const fresh = new Connect4Board();
    board.grid = fresh.grid;
    state.currentPlayer = 'A';
    state.winner = null;
    state.draw = false;
    state.moveCount = 0;

    for (const m of moves) {
        if (state.winner || state.draw) break;
        board.dropDisc(m.col, state.currentPlayer);
        state.moveCount++;
        const winner = board.checkWin();
        if (winner) { state.winner = winner; }
        else if (board.isFull()) { state.draw = true; }
        else { state.currentPlayer = state.currentPlayer === 'A' ? 'B' : 'A'; }
    }
    emit('reset', null);
    emit('boardChange', null);
    emit('turnChange', { player: state.currentPlayer });
    if (state.winner) emit('win', { winner: state.winner });
    if (state.draw) emit('draw', null);
}

export { state, board, on, emit, setGameMode, tryDrop, applyRemoteDrop, resetGame, replayMoves };
