/* The chrome every game shares: mode menu, online lobby, tutorial, reset flow, win screen, HUD.
   Games keep only their own rules, rendering and moves. */

import { net, onNet, netSend, connectToRoom, disconnect } from '../network.js';
import { initThemeToggle } from './theme.js';
import { coarse } from './pointer.js';

const $ = id => document.getElementById(id);
export const NAME = { A: 'Amber', B: 'Ivory' };

export function createShell(opts) {
    initThemeToggle();

    const el = {
        turn: $('hud-turn'), hint: $('hud-hint'),
        cardA: $('card-a'), cardB: $('card-b'),
        countA: $('count-a'), countB: $('count-b'),
        scoreA: $('score-a'), scoreB: $('score-b'),
        youA: $('you-a'), youB: $('you-b'),
        mode: $('mode-overlay'), modeButtons: $('mode-buttons'), modeSub: $('mode-sub'),
        lobby: $('lobby-panel'), room: $('room-input'), join: $('btn-join-room'), lobbyStatus: $('lobby-status'), lobbyBack: $('btn-lobby-back'),
        howTo: $('btn-how-to-play'), tutorial: $('tutorial-panel'),
        tutPrev: $('tut-prev'), tutNext: $('tut-next'), tutBack: $('tut-back'), tutDots: $('tut-dots'), tutControls: $('tut-controls-content'),
        resetBtn: $('btn-reset'), menuBtn: $('btn-change-mode'),
        confirm: $('reset-confirm'), confirmText: document.querySelector('#reset-confirm-box p'), yes: $('btn-confirm-yes'), no: $('btn-confirm-no'),
        win: $('win-overlay'), winMsg: $('win-message'), winSub: $('win-sub'), winIcon: $('win-icon'), winAgain: $('btn-win-reset'),
    };

    let gameMode = 'local';
    let resetPending = false;

    /* ---------- HUD ---------- */
    function setTurn(player, { over = false, label = null } = {}) {
        el.turn.textContent = label || `${NAME[player]}'s turn`;
        el.turn.dataset.player = over ? '' : player;
        el.cardA.classList.toggle('is-turn', !over && player === 'A');
        el.cardB.classList.toggle('is-turn', !over && player === 'B');
    }
    function setHint(text) { el.hint.textContent = text || ''; }
    function setCounts(a, b) { el.countA.textContent = a; el.countB.textContent = b; }
    function setScores(s) {
        el.scoreA.textContent = `${s.A} ${s.A === 1 ? 'win' : 'wins'}`;
        el.scoreB.textContent = `${s.B} ${s.B === 1 ? 'win' : 'wins'}`;
    }
    function setBadges(a, b) {
        el.youA.textContent = a || ''; el.youA.classList.toggle('hidden', !a);
        el.youB.textContent = b || ''; el.youB.classList.toggle('hidden', !b);
    }

    /* ---------- Overlays ---------- */
    function show(node) { node.classList.remove('hidden'); const f = node.querySelector('button:not([disabled]), input'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30); }
    function hide(node) { node.classList.add('hidden'); }

    function showWin({ winner, title, sub }) {
        el.winMsg.textContent = title;
        el.winSub.textContent = sub || '';
        el.win.dataset.player = winner || '';
        show(el.win);
    }
    function hideWin() { hide(el.win); }

    /* ---------- Menu ---------- */
    function menuHome() {
        el.modeButtons.classList.remove('hidden');
        el.modeSub.textContent = 'Choose a game mode';
        el.modeSub.classList.remove('hidden');
        el.howTo.classList.remove('hidden');
        el.tutorial.classList.add('hidden');
        el.lobby.classList.add('hidden');
        el.lobbyStatus.textContent = '';
        el.join.disabled = false;
    }

    function openMenu() {
        if (gameMode === 'online') disconnect();
        gameMode = 'local';
        resetPending = false;
        hide(el.confirm);
        hideWin();
        menuHome();
        el.room.value = '';
        show(el.mode);
        opts.onMenu && opts.onMenu();
    }

    el.modeButtons.addEventListener('click', e => {
        const btn = e.target.closest('.mode-btn');
        if (!btn) return;
        const mode = btn.dataset.mode;
        if (mode === 'online') {
            el.modeButtons.classList.add('hidden');
            el.howTo.classList.add('hidden');
            el.modeSub.textContent = 'Same room code on both devices';
            el.lobby.classList.remove('hidden');
            el.room.focus();
            return;
        }
        gameMode = mode;
        hide(el.mode);
        opts.onStart(mode);
    });

    el.lobbyBack && el.lobbyBack.addEventListener('click', menuHome);

    async function joinRoom() {
        const code = el.room.value.trim().toUpperCase();
        if (code.length < 2) { el.lobbyStatus.textContent = 'Enter a room code (2+ characters)'; return; }
        el.join.disabled = true;
        el.lobbyStatus.textContent = 'Connecting...';
        try {
            const init = await connectToRoom(opts.roomPrefix + code);
            gameMode = 'online';
            opts.onJoin(init);
            if (init.opponentConnected) {
                el.lobbyStatus.textContent = `You are ${NAME[init.role]}. Game on!`;
                setTimeout(() => hide(el.mode), 600);
            } else {
                el.lobbyStatus.textContent = `You are ${NAME[init.role]}. Waiting for your opponent...`;
            }
        } catch (err) {
            el.lobbyStatus.textContent = (err && err.message) || 'Connection failed';
            el.join.disabled = false;
        }
    }
    el.join.addEventListener('click', joinRoom);
    el.room.addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });

    onNet('opponent_joined', () => {
        el.lobbyStatus.textContent = 'Opponent joined!';
        setTimeout(() => { hide(el.mode); opts.onOpponent && opts.onOpponent(true); }, 600);
    });
    onNet('opponent_left', () => { setHint('Opponent disconnected...'); opts.onOpponent && opts.onOpponent(false); });
    onNet('disconnected', () => { if (gameMode === 'online') setHint('Connection lost. Open the menu to reconnect.'); });

    /* ---------- Reset ---------- */
    function confirm(text) { el.confirmText.textContent = text; show(el.confirm); }

    function requestReset({ fromWin = false } = {}) {
        if (gameMode === 'online') {
            if (resetPending) return;
            resetPending = true;
            netSend({ type: 'reset_request' });
            setHint('Rematch requested, waiting for your opponent...');
            return;
        }
        if (fromWin) { hideWin(); opts.onReset(); return; }  // a finished game needs no "are you sure?"
        confirm('Restart this game?');
    }

    el.resetBtn.addEventListener('click', () => requestReset());
    el.winAgain.addEventListener('click', () => requestReset({ fromWin: true }));
    el.menuBtn.addEventListener('click', openMenu);

    el.yes.addEventListener('click', () => {
        hide(el.confirm);
        if (gameMode === 'online') netSend({ type: 'reset_accept' });
        resetPending = false;
        hideWin();
        opts.onReset();
    });
    el.no.addEventListener('click', () => {
        if (gameMode === 'online') netSend({ type: 'reset_decline' });
        hide(el.confirm);
    });

    onNet('reset_request', () => confirm('Your opponent wants to restart. Accept?'));
    onNet('reset_accept', () => { resetPending = false; hideWin(); opts.onReset(); });
    onNet('reset_decline', () => {
        resetPending = false;
        setHint('Your opponent declined the restart.');
        setTimeout(() => opts.refreshHint && opts.refreshHint(), 2500);
    });

    /* ---------- Tutorial ---------- */
    const slides = [...document.querySelectorAll('.tut-slide')];
    let slide = 0;
    slides.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = 'tut-dot';
        el.tutDots.appendChild(d);
    });
    const dots = [...el.tutDots.children];

    if (el.tutControls && opts.controls) {
        const rows = coarse ? opts.controls.touch : opts.controls.mouse;
        el.tutControls.innerHTML = rows.map(([icon, label]) =>
            `<div class="tut-ctrl-row"><div class="tut-ctrl-icon" aria-hidden="true">${icon}</div><div class="tut-ctrl-label">${label}</div></div>`).join('');
    }

    function showSlide(i) {
        slide = Math.max(0, Math.min(slides.length - 1, i));
        slides.forEach((s, k) => s.classList.toggle('hidden', k !== slide));
        dots.forEach((d, k) => d.classList.toggle('active', k === slide));
        el.tutPrev.disabled = slide === 0;
        el.tutNext.disabled = slide === slides.length - 1;
    }
    el.howTo.addEventListener('click', () => {
        el.modeButtons.classList.add('hidden');
        el.modeSub.classList.add('hidden');
        el.howTo.classList.add('hidden');
        el.tutorial.classList.remove('hidden');
        showSlide(0);
        el.tutNext.focus();
    });
    el.tutBack.addEventListener('click', menuHome);
    el.tutPrev.addEventListener('click', () => showSlide(slide - 1));
    el.tutNext.addEventListener('click', () => showSlide(slide + 1));
    let sx = null;
    el.tutorial.addEventListener('pointerdown', e => { sx = e.clientX; });
    el.tutorial.addEventListener('pointerup', e => {
        if (sx === null) return;
        const dx = e.clientX - sx; sx = null;
        if (Math.abs(dx) > 40) showSlide(slide + (dx < 0 ? 1 : -1));
    });

    /* ---------- Keyboard: Escape closes the top dialog ---------- */
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (!el.confirm.classList.contains('hidden')) { el.no.click(); e.preventDefault(); }
        else if (!el.tutorial.classList.contains('hidden')) { menuHome(); e.preventDefault(); }
        else if (!el.lobby.classList.contains('hidden')) { menuHome(); e.preventDefault(); }
    });

    return {
        get gameMode() { return gameMode; },
        setTurn, setHint, setCounts, setScores, setBadges,
        showWin, hideWin, openMenu, requestReset,
        isMenuOpen: () => !el.mode.classList.contains('hidden'),
        isDialogOpen: () => !el.mode.classList.contains('hidden') || !el.confirm.classList.contains('hidden') || !el.win.classList.contains('hidden'),
        net, netSend, onNet,
    };
}
