/* The chrome every 3D game shares: the shared setup flow (same as every Explore game), online rooms on the
   PartyRoom server, How to play (also during play), FR/EN, reset flow, win screen and HUD.
   Games keep only their own rules, rendering and moves. */

import { net, onNet, netSend, connectParty, disconnect } from '../network.js';
import { initThemeToggle } from './theme.js';
import { tr, getLang, setLang, translatePage } from './i18n3d.js';
import { createSetup } from '../../party/client/setup.js';
import { makeT } from '../../party/client/i18n.js';
import { makeCode, cleanCode, CODE_RE } from '../../party/core/roomcode.js';
import { createHowTo } from '../../party/client/howto.js';

const $ = id => document.getElementById(id);
const BASE_NAME = { A: 'Amber', B: 'Ivory' };
export const NAME = { ...BASE_NAME };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createShell(opts) {
    initThemeToggle();
    let lang = getLang();
    const t = makeT(null, () => lang);

    const el = {
        turn: $('hud-turn'), hint: $('hud-hint'),
        cardA: $('card-a'), cardB: $('card-b'),
        countA: $('count-a'), countB: $('count-b'),
        scoreA: $('score-a'), scoreB: $('score-b'),
        youA: $('you-a'), youB: $('you-b'),
        mode: $('mode-overlay'), modeButtons: $('mode-buttons'), modeSub: $('mode-sub'),
        lobby: $('lobby-panel'),
        howTo: $('btn-how-to-play'),
        resetBtn: $('btn-reset'), menuBtn: $('btn-change-mode'),
        confirm: $('reset-confirm'), confirmText: document.querySelector('#reset-confirm-box p'), yes: $('btn-confirm-yes'), no: $('btn-confirm-no'),
        win: $('win-overlay'), winMsg: $('win-message'), winSub: $('win-sub'), winIcon: $('win-icon'), winAgain: $('btn-win-reset'),
    };

    let gameMode = 'local';
    let resetPending = false;
    let playing = false;          // a game is on screen (the overlay may show How to play on top of it)
    let roomCode = null;

    /* ---------- Language switch (top bar) ---------- */
    const topRight = document.createElement('div');
    topRight.className = 'top-right';
    topRight.innerHTML = '<div class="lang-switch" role="group" aria-label="Language"><button type="button" data-lang="en">EN</button><button type="button" data-lang="fr">FR</button></div>';
    const themeBtn = $('theme-toggle');
    themeBtn.replaceWith(topRight);
    topRight.append(themeBtn);
    topRight.querySelector('.lang-switch').addEventListener('click', e => {
        const b = e.target.closest('button[data-lang]');
        if (!b) return;
        lang = b.dataset.lang;
        setLang(lang);
        applyLang();
        opts.refreshHint && opts.refreshHint();
    });

    /* ---------- How to play during play ---------- */
    const helpBtn = document.createElement('button');
    helpBtn.className = 'ctrl-btn';
    helpBtn.type = 'button';
    helpBtn.id = 'btn-help';
    helpBtn.textContent = '?';
    helpBtn.addEventListener('click', () => howto.open());
    el.menuBtn.after(helpBtn);

    /* ---------- HUD ---------- */
    let lastTurn = null;
    function setTurn(player, o = {}) {
        lastTurn = [player, o];
        const { over = false, label = null } = o;
        el.turn.textContent = tr(label || `${NAME[player]}'s turn`, lang);
        el.turn.dataset.player = over ? '' : player;
        el.cardA.classList.toggle('is-turn', !over && player === 'A');
        el.cardB.classList.toggle('is-turn', !over && player === 'B');
    }
    let lastHint = '';
    function setHint(text) { lastHint = text || ''; el.hint.textContent = tr(lastHint, lang); }
    function setCounts(a, b) { el.countA.textContent = a; el.countB.textContent = b; }
    let lastScores = { A: 0, B: 0 };
    function setScores(s) {
        lastScores = s;
        el.scoreA.textContent = tr(`${s.A} ${s.A === 1 ? 'win' : 'wins'}`, lang);
        el.scoreB.textContent = tr(`${s.B} ${s.B === 1 ? 'win' : 'wins'}`, lang);
    }
    function setBadges(a, b) {
        el.youA.textContent = tr(a, lang) || ''; el.youA.classList.toggle('hidden', !a);
        el.youB.textContent = tr(b, lang) || ''; el.youB.classList.toggle('hidden', !b);
    }
    function setNames() {
        for (const [card, p] of [[el.cardA, 'A'], [el.cardB, 'B']]) {
            const nameEl = card.querySelector('.pc-name');
            const textNode = [...nameEl.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
            if (textNode) textNode.textContent = tr(NAME[p], lang);
        }
    }

    function applyLang() {
        document.documentElement.lang = lang;
        topRight.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
        translatePage(document, lang);
        if (opts.title) { $('mode-title').textContent = opts.title[lang] || opts.title.en; document.querySelector('.top-title').textContent = opts.title[lang] || opts.title.en; }
        el.howTo.textContent = t('howto');
        helpBtn.setAttribute('aria-label', t('howto'));
        howto.refresh();
        setNames();
        if (lastTurn) setTurn(...lastTurn);
        setHint(lastHint);
        setScores(lastScores);
        if (setup) setup.render();
        if (roomCode && !el.mode.classList.contains('hidden')) renderRoom(net.room);
    }

    /* ---------- Overlays ---------- */
    function show(node) { node.classList.remove('hidden'); const f = node.querySelector('button:not([disabled]), input'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30); }
    function hide(node) { node.classList.add('hidden'); }

    function showWin({ winner, title, sub }) {
        el.winMsg.textContent = tr(title, lang);
        el.winSub.textContent = tr(sub || '', lang);
        el.win.dataset.player = winner || '';
        show(el.win);
    }
    function hideWin() { hide(el.win); }

    /* ---------- Setup flow (shared with every Explore game) ---------- */
    el.lobby.classList.add('hidden');
    el.modeSub.classList.add('hidden');
    el.modeButtons.innerHTML = '<div id="su"></div><p id="room-status" class="p-msg center" aria-live="polite"></p>';
    const suEl = el.modeButtons.querySelector('#su');
    const statusEl = el.modeButtons.querySelector('#room-status');
    const logic = { id: opts.gameId, min: 2, max: 2 };
    let setup = null;

    function startLocal({ mode, names, difficulty }) {
        disconnect();
        roomCode = null;
        Object.assign(NAME, BASE_NAME);
        if (mode === 'device' && names) { NAME.A = names[0] || BASE_NAME.A; NAME.B = names[1] || BASE_NAME.B; }
        setNames();
        gameMode = mode === 'ai' ? 'ai' : 'local';
        hide(el.mode);
        playing = true;
        opts.onStart(gameMode, { difficulty: difficulty || 'hard' });
    }

    async function startOnline({ name, code, create, target, visibility }) {
        statusEl.textContent = t('connecting');
        try {
            await connectParty({ game: opts.gameId, code, create, name, target, visibility, lang });
            roomCode = code;
            gameMode = 'online';
            history.replaceState(null, '', `${location.pathname}?room=${code}`);
            renderRoom(net.room);
        } catch (err) {
            if (err.code === 'taken' && create) return startOnline({ name, code: makeCode(), create, target, visibility });
            statusEl.innerHTML = err.code === 'wrong_game'
                ? `${esc(t('err.wrong_game'))}`
                : esc(t('err.' + (err.code || 'not_found')));
        }
    }

    /** Waiting room: the code to share, who is here, and the auto-start at 2 players. */
    function renderRoom(room) {
        if (!roomCode) return;
        const players = room ? room.players : [];
        const link = `${location.origin}${location.pathname}?room=${roomCode}`;
        suEl.innerHTML = `<div class="su-step"><span class="p-label">${esc(t('roomCode'))}</span>
            <div class="su-code">${esc(roomCode)}</div>
            <div class="p-join"><button type="button" class="p-btn" data-copy="1">${esc(t('copy'))}</button><button type="button" class="p-btn" data-share="1">${esc(t('share'))}</button></div>
            <p class="p-mono center">${players.map((p, i) => esc(p.name) + (i >= 2 ? ` (${esc(t('spectator'))})` : '')).join(' · ')}</p>
            <p class="p-msg center">${esc(players.length >= 2 ? t('ready') : t('waitingMore', { n: 2 - players.length }))}</p>
            <button type="button" class="text-link su-back" data-leave="1">← ${esc(t('leave'))}</button></div>`;
        suEl.querySelector('[data-copy]').onclick = async () => { try { await navigator.clipboard.writeText(link); statusEl.textContent = t('copied'); } catch (e) { statusEl.textContent = link; } };
        suEl.querySelector('[data-share]').onclick = async () => {
            const text = t('shareText', { game: opts.title ? opts.title[lang] : '', code: roomCode });
            if (navigator.share) { try { await navigator.share({ text, url: link }); } catch (e) { /* cancelled */ } } else suEl.querySelector('[data-copy]').click();
        };
        suEl.querySelector('[data-leave]').onclick = () => openMenu();
    }

    function buildSetup() {
        const params = new URLSearchParams(location.search);
        setup = createSetup(suEl, {
            logic, ui: {}, t, esc, lang: () => lang, initialCode: params.get('room') ? cleanCode(params.get('room')) : '',
            listRooms: async () => (await fetch(`/party-rooms?game=${encodeURIComponent(opts.gameId)}`, { cache: 'no-store' })).json(),
            onLocal: startLocal,
            onCreate: ({ name, target, visibility }) => startOnline({ name, code: makeCode(), create: true, target, visibility }),
            onJoin: ({ name, code }) => {
                const c = cleanCode(code);
                if (!CODE_RE.test(c)) { setup.message(t('err.code')); return; }
                startOnline({ name, code: c, create: false });
            },
        });
    }

    onNet('lobby', ({ room }) => { if (roomCode) { show(el.mode); renderRoom(room); } });
    onNet('init', init => {
        hide(el.mode);
        playing = true;
        Object.assign(NAME, BASE_NAME, init.names || {});     // online: show the players' nicknames
        setNames();
        opts.onJoin(init);
        if (!init.role) setHint(t('spectating'));      // a third visitor watches the duel
    });

    /* ---------- Menu ---------- */
    function menuHome() {
        el.modeButtons.classList.remove('hidden');
        el.howTo.classList.remove('hidden');
        statusEl.textContent = '';
        if (roomCode) renderRoom(net.room);
        else if (!setup) buildSetup();
        else { setup.show('count'); }
    }

    function openMenu() {
        if (gameMode === 'online') disconnect();
        roomCode = null;
        history.replaceState(null, '', location.pathname);
        gameMode = 'local';
        resetPending = false;
        playing = false;
        hide(el.confirm);
        hideWin();
        if (setup) setup.show('count'); else buildSetup();
        menuHome();
        show(el.mode);
        opts.onMenu && opts.onMenu();
    }

    onNet('opponent_joined', () => { setHint(''); opts.onOpponent && opts.onOpponent(true); });
    onNet('opponent_left', () => { setHint('Opponent disconnected...'); opts.onOpponent && opts.onOpponent(false); });
    onNet('disconnected', () => { if (gameMode === 'online') setHint(t('reconnecting')); });

    /* ---------- Reset ---------- */
    function confirm(text) { el.confirmText.textContent = tr(text, lang); show(el.confirm); }

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
        if (gameMode !== 'online') opts.onReset();      // online: the server starts the new game for both
    });
    el.no.addEventListener('click', () => {
        if (gameMode === 'online') netSend({ type: 'reset_decline' });
        hide(el.confirm);
    });

    onNet('reset_request', () => confirm('Your opponent wants to restart. Accept?'));
    onNet('reset_accept', () => { resetPending = false; hide(el.confirm); hideWin(); opts.onReset(); });
    onNet('reset_decline', () => {
        resetPending = false;
        setHint('Your opponent declined the restart.');
        setTimeout(() => opts.refreshHint && opts.refreshHint(), 2500);
    });

    /* ---------- How to play (shared panel, also during play) ---------- */
    const howto = createHowTo({ steps: opts.howto, min: 2, max: 2, lang: () => lang, playing: () => playing });
    el.howTo.addEventListener('click', () => howto.open());

    /* ---------- Keyboard: Escape closes the confirm dialog ---------- */
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !el.confirm.classList.contains('hidden')) { el.no.click(); e.preventDefault(); }
    });

    buildSetup();
    applyLang();

    return {
        get gameMode() { return gameMode; },
        setTurn, setHint, setCounts, setScores, setBadges,
        showWin, hideWin, openMenu, requestReset,
        isMenuOpen: () => !el.mode.classList.contains('hidden') || howto.isOpen(),
        isDialogOpen: () => !el.mode.classList.contains('hidden') || howto.isOpen() || !el.confirm.classList.contains('hidden') || !el.win.classList.contains('hidden'),
        net, netSend, onNet,
    };
}
