/* Party game shell: entry, lobby, game frame, results, How to play, FR/EN.
   A game provides a UI module: { logic, title, icon, strings, howto, render(root, view, api), ... }. */

import { initialLang, saveLang, makeT } from './i18n.js';
import { connect } from './net.js';
import { makeCode, cleanCode, CODE_RE } from '../core/roomcode.js';
import { initThemeToggle } from '../../js/shared/theme.js';
import { SLUGS } from './slugs.js';
import { createSetup } from './setup.js';
import { createLocalHost, BOT_NAMES } from './local.js';
import { icon } from './icons.js';
import { createHowTo, playersBadge } from './howto.js';

/* ---------- tiny DOM helpers (also used by game UIs) ---------- */
export function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
        if (v === false || v == null) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'html') el.innerHTML = v;
        else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* blocked */ } },
};

export function mountGame(ui) {
    const logic = ui.logic;
    let lang = initialLang();
    const t = makeT(ui.strings, () => lang);
    const title = () => ui.title[lang] || ui.title.en;

    let conn = null, code = null, me = null, room = null, view = null, offset = 0, status = 'idle';
    let pendingName = '';

    /* ---------- Skeleton ---------- */
    document.body.innerHTML = '';
    const top = h('header', { id: 'top-bar' },
        h('a', { id: 'back-link', href: '../' }, h('span', { 'aria-hidden': 'true' }, '←'), ' ', h('span', { 'data-t': 'back' })),
        h('span', { class: 'top-title' }),
        h('div', { class: 'top-right' },
            h('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Language' },
                h('button', { type: 'button', 'data-lang': 'en' }, 'EN'), h('button', { type: 'button', 'data-lang': 'fr' }, 'FR')),
            h('button', { id: 'theme-toggle', class: 'theme-toggle', type: 'button', 'data-ta': 'theme' }, h('span', { class: 'theme-dot', 'aria-hidden': 'true' }))));

    const entry = h('section', { id: 's-entry', class: 'p-screen' },
        h('div', { class: 'p-hero' },
            h('div', { class: 'p-kicker' }, h('span', { html: icon(ui.icon) }), h('span', { id: 'en-range' })),
            h('h1', { class: 'p-title', id: 'en-title' }),
            h('p', { class: 'p-lead', 'data-t': 'entryLead' })),
        h('div', { id: 'su' }),
        h('p', { id: 'entry-msg', class: 'p-msg', 'aria-live': 'polite' }),
        h('button', { class: 'text-link', type: 'button', 'data-t': 'howto', onclick: () => openRules() }));

    const lobby = h('section', { id: 's-lobby', class: 'p-screen hidden' },
        h('div', { class: 'p-codebox' },
            h('span', { class: 'p-label', 'data-t': 'roomCode' }),
            h('div', { class: 'p-code', id: 'lb-code' }),
            h('div', { class: 'p-row' },
                h('button', { class: 'p-btn', type: 'button', id: 'lb-copy', 'data-t': 'copy' }),
                h('button', { class: 'p-btn', type: 'button', id: 'lb-share', 'data-t': 'share' }))),
        h('div', { class: 'p-section' },
            h('div', { class: 'p-sec-head' }, h('h2', { 'data-t': 'players' }), h('span', { id: 'lb-count', class: 'p-mono' })),
            h('ul', { id: 'lb-players', class: 'p-players' }),
            h('div', { id: 'lb-local', class: 'p-row hidden' },
                h('input', { id: 'lb-newname', class: 'p-input', maxlength: '16', 'data-tp': 'su.addPh' }),
                h('button', { id: 'lb-add', class: 'p-btn', type: 'button', 'data-t': 'su.add' })),
            h('p', { id: 'lb-wait', class: 'p-msg' })),
        h('div', { class: 'p-section' },
            h('div', { class: 'p-sec-head' }, h('h2', { 'data-t': 'settings' })),
            h('div', { id: 'lb-settings', class: 'p-settings' })),
        h('label', { class: 'p-check', id: 'lb-specwrap' }, h('input', { type: 'checkbox', id: 'lb-spec' }), h('span', { 'data-t': 'watchOnly' })),
        h('button', { id: 'lb-start', class: 'p-btn primary big', type: 'button' }),
        h('p', { id: 'lb-hostmsg', class: 'p-msg center' }),
        h('div', { class: 'p-row center' },
            h('button', { class: 'text-link', type: 'button', 'data-t': 'howto', onclick: () => openRules() }),
            h('button', { class: 'text-link', type: 'button', id: 'lb-leave', 'data-t': 'leave' })));

    const game = h('section', { id: 's-game', class: 'p-screen hidden' },
        h('div', { class: 'p-gamebar' },
            h('button', { class: 'p-codechip', type: 'button', id: 'g-code' }),
            h('div', { class: 'p-status', id: 'g-status', 'aria-live': 'polite' }),
            h('button', { class: 'p-icon-btn', type: 'button', id: 'g-howto', 'data-ta': 'howto', onclick: () => openRules() }, '?')),
        h('div', { class: 'p-timer hidden', id: 'g-timer' }, h('span', { class: 'p-timer-fill' }), h('span', { class: 'p-timer-num' })),
        h('div', { class: 'p-scores', id: 'g-scores' }),
        h('div', { class: 'p-banner hidden', id: 'g-banner' }),
        h('div', { class: 'p-game', id: 'g-root' }),
        h('div', { class: 'p-results hidden', id: 'g-results' }));


    const handoffEl = h('div', { id: 'handoff', class: 'p-handoff hidden', role: 'dialog', 'aria-modal': 'true' },
        h('div', { class: 'p-handoff-box' },
            h('span', { class: 'p-label', 'data-t': 'su.passLabel' }),
            h('h2', { id: 'ho-title' }),
            h('p', { class: 'g-note', 'data-t': 'su.passHint' }),
            h('button', { id: 'ho-show', class: 'p-btn primary big', type: 'button' })));
    const toastEl = h('div', { class: 'p-toast', id: 'toast', role: 'status', 'aria-live': 'polite' });
    const conBar = h('div', { class: 'p-conn hidden', id: 'conn' });

    document.body.append(top, conBar, h('main', { class: 'party' }, entry, lobby, game), handoffEl, toastEl);
    const $ = id => document.getElementById(id);
    initThemeToggle();

    /* ---------- Language ---------- */
    function applyStatic() {
        document.documentElement.lang = lang;
        document.title = `${title()} | ramiyounes.dev`;
        top.querySelector('.top-title').textContent = title();
        $('en-title').textContent = title();
        $('en-range').innerHTML = playersBadge(logic.min, logic.max, lang);
        document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
        document.querySelectorAll('[data-tp]').forEach(el => { el.placeholder = t(el.dataset.tp); });
        document.querySelectorAll('[data-ta]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.ta)); });
        top.querySelectorAll('.lang-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
        howto.refresh();
        if (setup) setup.render();
    }
    top.querySelector('.lang-switch').addEventListener('click', e => {
        const b = e.target.closest('button[data-lang]');
        if (!b) return;
        lang = b.dataset.lang;
        saveLang(lang);
        applyStatic();
        render();
    });

    const howto = createHowTo({ steps: ui.howto, min: logic.min, max: logic.max, lang: () => lang, playing: () => !!(room && room.phase === 'playing') });
    function openRules() { howto.open(); }

    let toastTimer = null;
    function toast(text) {
        toastEl.textContent = text;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
    }

    /* ---------- Entry: shared setup flow ---------- */
    const params = new URLSearchParams(location.search);
    let setup = null;
    function entryMsg(text, html = false) { const m = $('entry-msg'); if (html) m.innerHTML = text; else m.textContent = text; }

    setup = createSetup($('su'), {
        logic, ui, t, esc, lang: () => lang, initialCode: params.get('room') ? cleanCode(params.get('room')) : '',
        listRooms: async () => (await fetch(`/party-rooms?game=${encodeURIComponent(logic.id)}`, { cache: 'no-store' })).json(),
        onCreate: ({ name, target, visibility }) => start(makeCode(), true, name, 0, { target, visibility }),
        onJoin: ({ name, code: c }) => {
            c = cleanCode(c);
            if (!CODE_RE.test(c)) { setup.message(t('err.code')); return; }
            start(c, false, name, 0);
        },
        onLocal: opts => startLocal(opts),
    });

    function localSettings(mode) {
        const out = {};
        for (const f of logic.settings || []) out[f.key] = (f.key === 'timer' && f.min === 0) ? 0 : f.def;
        if (mode === 'device' && ui.deviceSettings) Object.assign(out, ui.deviceSettings);
        if (mode === 'ai' && ui.aiSettings) Object.assign(out, ui.aiSettings);
        return out;
    }

    function startLocal({ mode, count, names, difficulty, role }) {
        if (conn) conn.close();
        code = null;
        const players = mode === 'ai'
            ? [{ id: 'you', name: names[0], bot: false }, ...[...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, count - 1).map((n, i) => ({ id: 'bot' + i, name: n + (lang === 'fr' ? ' (IA)' : ' (bot)'), bot: true }))]
            : names.map((n, i) => ({ id: 'p' + (i + 1), name: n, bot: false }));
        conn = createLocalHost({
            mod: logic, ai: ui.ai, players, settings: localSettings(mode), lang, mode, difficulty, humanRole: role,
            privateInfo: ui.privateInfo || false, devicePrepare: ui.devicePrepare, onMessage: msg => onMessage(msg, {}),
        });
    }

    /* ---------- Connection ---------- */
    function start(c, create, name, tries, extra = {}) {
        if (conn) conn.close();
        code = c;
        pendingName = name;
        entryMsg(t('connecting'));
        conn = connect({
            code, game: logic.id, create, lang, extra,
            onStatus(s) { status = s; conBar.classList.toggle('hidden', !(s === 'reconnecting' && me)); conBar.textContent = t('reconnecting'); },
            onMessage(msg) { onMessage(msg, { create, name, tries, extra }); },
        });
    }

    function onMessage(msg, ctx) {
        switch (msg.t) {
            case '_open':
                conn.send({ t: 'hello', pid: store.get('party:pid:' + code), name: ctx.name || pendingName });
                break;
            case 'welcome':
                me = msg.pid;
                if (msg.local) break;
                store.set('party:pid:' + code, me);
                history.replaceState(null, '', `${location.pathname}?room=${code}`);
                entryMsg('');
                break;
            case 'state':
                me = msg.me;
                room = msg.room;
                view = msg.view;
                setColourOrder(room.players);
                offset = room.now - Date.now();
                render();
                break;
            case 'handoff':
                $('ho-title').textContent = t('su.passTo', { name: msg.name });
                $('ho-show').textContent = t('su.imName', { name: msg.name });
                handoffEl.classList.remove('hidden');
                $('g-root').classList.add('veiled');
                break;
            case 'event': ui.onEvent && ui.onEvent(msg.e, api()); break;
            case 'sync': ui.onSync && ui.onSync(msg.data, api()); break;
            case 'note': ui.onNote ? ui.onNote(msg.note, api()) : toast(t(msg.note)); break;
            case 'err': toast(t('err.' + msg.code) !== 'err.' + msg.code ? t('err.' + msg.code) : t(msg.code)); break;
            case 'error':
                if (msg.code === 'taken' && ctx.create && ctx.tries < 6) { start(makeCode(), true, ctx.name, ctx.tries + 1, ctx.extra); return; }
                if (msg.code === 'not_found' || msg.code === 'full' || msg.code === 'wrong_game') store.set('party:pid:' + code, null);
                if (msg.soft && me) { toast(t('err.' + msg.code)); return; }
                showScreen('entry');
                if (msg.code === 'wrong_game') {
                    entryMsg(`${esc(t('err.wrong_game'))} <a href="../${esc(SLUGS[msg.game] || msg.game)}/?room=${esc(code)}">${esc(t('err.goThere'))}</a>`, true);
                } else entryMsg(t('err.' + msg.code));
                if (msg.code !== 'name_taken' && msg.code !== 'name_required') { conn && conn.close(); conn = null; me = null; room = null; }
                else { conn && conn.close(); conn = null; }
                break;
        }
    }

    // Coming back to a room link we already belong to: reconnect straight away
    if (params.get('room') && store.get('party:pid:' + cleanCode(params.get('room')))) {
        start(cleanCode(params.get('room')), false, store.get('party:name') || '', 0);
    }

    /* ---------- API for game UIs ---------- */
    function nameOf(id) { const p = room && room.players.find(q => q.id === id); return p ? p.name : '?'; }
    function api() {
        const device = !!(room && room.local && room.mode === 'device');
        const tt = device ? (k, v) => (k === 'yourTurn' ? t('turnOf', { name: nameOf(me) }) : t(k, v)) : t;
        return {
            me, room, view, lang, t: tt, h, esc, nameOf, toast,
            send: a => conn && conn.send({ t: 'act', a }),
            sendAs: (pid, a) => conn && conn.send({ t: 'act', a, as: pid }),
            local: !!(room && room.local), mode: room && room.mode,
            humans: room ? room.players.filter(p => !p.bot).map(p => p.id) : [],
            isHost: room && (room.local || room.host === me),
            seated: room ? room.seated : [],
            isSeated: !!(room && room.seated.includes(me)),
            serverNow: () => Date.now() + offset,
            timeLeft: () => (view && view.deadline ? Math.max(0, view.deadline - (Date.now() + offset)) : null),
        };
    }

    /* ---------- Screens ---------- */
    let current = 'entry';
    function showScreen(name) {
        if (current === name) return;
        current = name;
        entry.classList.toggle('hidden', name !== 'entry');
        lobby.classList.toggle('hidden', name !== 'lobby');
        game.classList.toggle('hidden', name !== 'game');
        window.scrollTo(0, 0);
    }

    function render() {
        if (!room) { showScreen('entry'); return; }
        if (room.phase === 'lobby') { showScreen('lobby'); renderLobby(); }
        else { showScreen('game'); renderGame(); }
    }

    /* ---------- Lobby ---------- */
    const shareLink = () => `${location.origin}${location.pathname}?room=${code}`;
    $('lb-copy').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(shareLink()); toast(t('copied')); }
        catch (e) { toast(shareLink()); }
    });
    $('lb-share').addEventListener('click', async () => {
        const text = t('shareText', { game: title(), code });
        if (navigator.share) { try { await navigator.share({ title: title(), text, url: shareLink() }); } catch (e) { /* cancelled */ } }
        else { try { await navigator.clipboard.writeText(shareLink()); toast(t('copied')); } catch (e) { toast(shareLink()); } }
    });
    $('lb-leave').addEventListener('click', () => leaveRoom());
    $('lb-spec').addEventListener('change', e => conn && conn.send({ t: 'spectate', on: e.target.checked }));
    $('lb-start').addEventListener('click', () => conn && conn.send({ t: 'start' }));

    $('ho-show').addEventListener('click', () => {
        handoffEl.classList.add('hidden');
        $('g-root').classList.remove('veiled');
        if (conn) conn.send({ t: 'reveal' });
    });
    $('lb-add').addEventListener('click', () => {
        const n = $('lb-newname').value.trim().slice(0, 16);
        if (!n || !conn) return;
        conn.send({ t: 'addPlayer', name: n });
        $('lb-newname').value = '';
    });
    $('lb-newname').addEventListener('keydown', e => { if (e.key === 'Enter') $('lb-add').click(); });
    $('lb-players').addEventListener('click', e => {
        const b = e.target.closest('button[data-rm]');
        if (b && conn) conn.send({ t: 'removePlayer', id: b.dataset.rm });
    });

    function leaveRoom() {
        handoffEl.classList.add('hidden');
        $('g-root').classList.remove('veiled');
        if (conn && conn.local) { conn.close(); conn = null; me = null; room = null; view = null; showScreen('entry'); setup.show('count'); return; }
        if (conn) { conn.send({ t: 'leave' }); setTimeout(() => conn && conn.close(), 150); }
        store.set('party:pid:' + code, null);
        conn = null; me = null; room = null; view = null;
        history.replaceState(null, '', location.pathname);
        showScreen('entry');
    }

    function playerRow(p, extra = '') {
        const badges = [];
        if (p.id === room.host && !room.local) badges.push(`<span class="p-badge host">${esc(t('host'))}</span>`);
        if (p.id === me && !(room.local && room.mode === 'device')) badges.push(`<span class="p-badge you">${esc(t('you'))}</span>`);
        if (p.spectator) badges.push(`<span class="p-badge">${esc(t('spectator'))}</span>`);
        if (!p.connected) badges.push(`<span class="p-badge off">${esc(p.away ? t('away') : t('offline'))}</span>`);
        if (room.local && room.mode === 'device' && room.phase === 'lobby' && room.players.length > room.min) badges.push(`<button type="button" class="p-badge rm" data-rm="${esc(p.id)}" aria-label="${esc(t('su.remove'))}">×</button>`);
        return `<li class="${p.connected ? '' : 'is-off'}"><span class="p-dot" style="--hue:${hue(p.id)}"></span><span class="p-name">${esc(p.name)}</span>${extra}<span class="p-badges">${badges.join('')}</span></li>`;
    }

    function eligibleCount() { return room.players.filter(p => !p.spectator && !p.away).length; }

    function renderLobby() {
        $('lb-code').textContent = code || '';
        lobby.querySelector('.p-codebox').classList.toggle('hidden', !!room.local);
        $('lb-specwrap').classList.toggle('hidden', !!room.local);
        $('lb-local').classList.toggle('hidden', !(room.local && room.mode === 'device' && room.players.length < room.max));
        const players = [...room.players].sort((a, b) => a.order - b.order);
        // Duels: the first two take the seats, everyone else is told up front that they watch and wait in line
        const line = room.duel && !room.local ? players.filter(p => !p.spectator && !p.away).slice(2).map(p => p.id) : [];
        $('lb-players').innerHTML = players.map(p => playerRow(p, line.includes(p.id) ? `<span class="p-badge">${esc(t('spectator'))} · ${esc(t('inLine', { n: line.indexOf(p.id) + 1 }))}</span>` : '')).join('');
        const n = eligibleCount();
        $('lb-count').textContent = `${n} / ${room.min}-${room.max}`;
        const missing = Math.max(0, room.min - n);
        $('lb-wait').textContent = missing ? t('waitingMore', { n: missing }) : t('ready');
        $('lb-wait').classList.toggle('ok', !missing);
        const mine = room.players.find(p => p.id === me);
        $('lb-spec').checked = !!(mine && mine.spectator);
        const isHost = room.local || room.host === me;
        const startBtn = $('lb-start');
        startBtn.classList.toggle('hidden', !isHost);
        startBtn.disabled = !!missing;
        startBtn.textContent = missing ? t('start') : t('startN', { n: Math.min(n, room.max) });
        $('lb-hostmsg').textContent = isHost ? '' : t('waitingHost', { name: nameOf(room.host) });
        renderSettings($('lb-settings'), isHost);
    }

    function fmt(f, v) {
        if (f.type === 'bool') return v ? t('on') : t('off');
        if (f.type === 'select') return t(`opt.${f.key}.${v}`);
        if (f.unit === 's') return v ? t('seconds', { n: v }) : t('off');
        if (f.zero && !v) return t(f.zero);
        return String(v);
    }

    function renderSettings(el, editable) {
        const s = room.settings;
        const fields = [...(logic.settings || []).filter(f => !f.hidden)];
        const rows = [];
        const row = (label, control) => rows.push(`<div class="p-set"><span class="p-set-label">${esc(label)}</span><span class="p-set-ctl">${control}</span></div>`);
        const ctl = (f, v) => {
            if (!editable) return `<span class="p-set-val">${esc(fmt(f, v))}</span>`;
            if (f.type === 'bool') return `<button type="button" class="p-toggle" data-k="${f.key}" data-v="${!v}" aria-pressed="${!!v}">${esc(fmt(f, v))}</button>`;
            if (f.type === 'select') return `<span class="p-seg">${f.options.map(o => `<button type="button" data-k="${f.key}" data-v="${esc(o)}" aria-pressed="${o === v}">${esc(t(`opt.${f.key}.${o}`))}</button>`).join('')}</span>`;
            const step = f.step || 1;
            return `<span class="p-stepper"><button type="button" data-k="${f.key}" data-n="${Math.max(f.min, v - step)}" aria-label="-" ${v <= f.min ? 'disabled' : ''}>−</button><span class="p-set-val">${esc(fmt(f, v))}</span><button type="button" data-k="${f.key}" data-n="${Math.min(f.max, v + step)}" aria-label="+" ${v >= f.max ? 'disabled' : ''}>+</button></span>`;
        };
        if (ui.wordGame) {
            const f = { key: 'lang', type: 'select', options: ['en', 'fr'] };
            row(t('wordLang'), editable
                ? `<span class="p-seg">${['en', 'fr'].map(o => `<button type="button" data-k="lang" data-v="${o}" aria-pressed="${room.lang === o}">${esc(t(o === 'en' ? 'langEn' : 'langFr'))}</button>`).join('')}</span>`
                : `<span class="p-set-val">${esc(t(room.lang === 'en' ? 'langEn' : 'langFr'))}</span>`);
            void f;
        }
        for (const f of fields) row(t('set.' + f.key) !== 'set.' + f.key ? t('set.' + f.key) : t(f.key), ctl(f, s[f.key]));
        if (!room.local) row(t('expected'), ctl({ key: 'expected', type: 'int', min: 0, max: room.max, zero: 'expectedOff' }, s.expected));
        if (!room.local && s.expected) row(t('autostart'), ctl({ key: 'autostart', type: 'bool' }, s.autostart));
        el.innerHTML = rows.join('');
    }

    $('lb-settings').addEventListener('click', e => {
        const b = e.target.closest('button[data-k]');
        if (!b || !conn) return;
        let v = b.dataset.v;
        if (b.dataset.n !== undefined) v = Number(b.dataset.n);
        else if (v === 'true' || v === 'false') v = v === 'true';
        conn.send({ t: 'settings', patch: { [b.dataset.k]: v } });
    });

    /* ---------- Game frame ---------- */
    $('g-code').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(shareLink()); toast(t('copied')); } catch (e) { toast(shareLink()); }
    });

    function scoreboard() {
        const scores = ui.scores ? ui.scores(view, api()) : (view && view.scores);
        if (!scores) return '';
        const turn = ui.turnOf ? ui.turnOf(view, api()) : (view && view.turn);
        const turns = Array.isArray(turn) ? turn : [turn];
        const ids = Object.keys(scores);
        ids.sort((a, b) => (room.players.find(p => p.id === a)?.order ?? 99) - (room.players.find(p => p.id === b)?.order ?? 99));
        return ids.map(id => {
            const p = room.players.find(q => q.id === id) || { name: '?', connected: false };
            const late = view.late && view.late.includes(id);
            return `<div class="p-score ${turns.includes(id) ? 'is-turn' : ''} ${p.connected ? '' : 'is-off'} ${id === me ? 'is-me' : ''}">
                <span class="p-dot" style="--hue:${hue(id)}"></span><span class="p-score-name">${esc(p.name)}</span>
                <span class="p-score-val">${esc(scores[id])}</span>${room.thinking && room.thinking.includes(id) ? `<span class="p-think">${esc(t('su.thinking'))}</span>` : ''}${late ? `<span class="p-badge tiny">${esc(t('late'))}</span>` : ''}</div>`;
        }).join('');
    }

    function banner() {
        const el = $('g-banner');
        const mine = room.players.find(p => p.id === me);
        let text = '', btn = '';
        if (room.phase === 'playing' && !room.local && !room.seated.includes(me)) {
            if (room.duel) {
                const pos = room.queue.indexOf(me);
                if (pos >= 0) {
                    text = t('queuePos', { n: pos + 1, mode: room.settings.queueMode === 'rotate' ? t('queueRotateShort') : t('queueWinnerShort') });
                    btn = `<button type="button" class="p-btn small" data-spec="1">${esc(t('leaveQueue'))}</button>`;
                } else {
                    text = t('spectating');
                    btn = `<button type="button" class="p-btn small" data-spec="0">${esc(t('joinQueue'))}</button>`;
                }
            } else if (view && view.pending && view.pending.includes(me)) text = t('nextRound');
            else if (mine && mine.spectator) text = t('spectating');
            else text = t('nextRound');
        }
        // Duels: everyone sees who plays next and who only watches
        let crowd = '';
        if (room.duel && !room.local && room.phase === 'playing') {
            const nameList = ids => ids.map(id => nameOf(id)).join(', ');
            const queue = room.queue.filter(id => room.players.some(p => p.id === id));
            const watching = room.players.filter(p => !room.seated.includes(p.id) && !queue.includes(p.id)).map(p => p.id);
            crowd = [queue.length ? t('duelNext', { names: nameList(queue) }) : '', watching.length ? t('duelWatch', { names: nameList(watching) }) : ''].filter(Boolean).join(' · ');
        }
        el.innerHTML = (text ? `<span>${esc(text)}</span>${btn}` : '') + (crowd ? `<span class="p-mono p-crowd">${esc(crowd)}</span>` : '');
        el.classList.toggle('hidden', !text && !crowd);
    }
    $('g-banner').addEventListener('click', e => {
        const b = e.target.closest('button[data-spec]');
        if (b && conn) conn.send({ t: 'spectate', on: b.dataset.spec === '1' });
    });

    function renderGame() {
        const count = room.players.filter(p => !p.away).length;
        $('g-code').textContent = room.local ? t(room.mode === 'ai' ? 'su.vsAiTable' : 'su.localTable') : `${code} · ${count}`;
        $('g-code').disabled = !!room.local;
        const a = api();
        const thinking = room.phase === 'playing' && room.thinking && room.thinking.length ? room.thinking : null;
        $('g-status').textContent = !view ? '' : thinking && thinking.length === 1 ? `${nameOf(thinking[0])} · ${t('su.thinking')}`
            : (ui.status ? ui.status(view, a) : defaultStatus(view));
        $('g-scores').innerHTML = view ? scoreboard() : '';
        banner();
        if (view) ui.render($('g-root'), view, a);
        renderResults();
    }

    function defaultStatus(v) {
        if (room.phase !== 'playing') return '';
        if (!v.turn) return '';
        if (room.thinking && room.thinking.includes(v.turn)) return `${nameOf(v.turn)} · ${t('su.thinking')}`;
        if (room.local && room.mode === 'device') return t('turnOf', { name: nameOf(v.turn) });
        return v.turn === me ? t('yourTurn') : t('turnOf', { name: nameOf(v.turn) });
    }

    function renderResults() {
        const el = $('g-results');
        if (room.phase !== 'results' || !room.results) { el.classList.add('hidden'); el.innerHTML = ''; return; }
        const r = room.results;
        const names = (r.winners || []).map(nameOf);
        const head = !names.length ? t('draw') : names.length === 1 ? t('winner', { name: names[0] }) : t('winners', { names: names.join(', ') });
        const isHost = room.local || room.host === me;
        const rows = (r.ranking || []).map(row => `<li><span class="p-rank">${row.rank}</span><span class="p-dot" style="--hue:${hue(row.id)}"></span><span class="p-name">${esc(nameOf(row.id))}</span><span class="p-score-val">${esc(row.label ?? row.score)}</span><span class="p-wins">${room.wins[row.id] || 0} ${esc(t((room.wins[row.id] || 0) === 1 ? 'roomWin' : 'roomWins'))}</span></li>`).join('');
        el.innerHTML = `<div class="p-results-box">
            <span class="p-label">${esc(t('results'))}</span>
            <h2 class="p-results-title">${esc(head)}</h2>
            ${r.note ? `<p class="p-msg center">${esc(t(r.note, r.noteVars || {}))}</p>` : ''}
            <div id="g-results-extra"></div>
            <ol class="p-ranking">${rows}</ol>
            ${room.aiReveal && Object.keys(room.aiReveal).length ? `<ul class="p-reveal">${Object.entries(room.aiReveal).map(([id, l]) => `<li><b>${esc(nameOf(id))}</b> ${esc(l[lang] || l.en)}</li>`).join('')}</ul>` : ''}
            ${isHost ? `<div class="p-row"><button type="button" class="p-btn primary" data-r="rematch">${esc(room.duel && !room.local ? t('nextMatch') : t('rematch'))}</button><button type="button" class="p-btn" data-r="lobby">${esc(t('toLobby'))}</button>${room.local ? `<button type="button" class="p-btn" data-r="setup">${esc(t('su.newGame'))}</button>` : ''}</div>`
                : `<p class="p-msg center">${esc(t('waitingRematch', { name: nameOf(room.host) }))}</p>`}
        </div>`;
        const wasHidden = el.classList.contains('hidden');
        el.classList.remove('hidden');
        if (ui.results) ui.results($('g-results-extra'), r, api());
        if (wasHidden) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    }
    $('g-results').addEventListener('click', e => {
        const b = e.target.closest('button[data-r]');
        if (b && b.dataset.r === 'setup') { leaveRoom(); return; }
        if (b && conn) conn.send({ t: b.dataset.r });
    });

    /* ---------- Timer bar ---------- */
    (function tick() {
        requestAnimationFrame(tick);
        const el = $('g-timer');
        if (!room || room.phase !== 'playing' || !view || !view.deadline) { el.classList.add('hidden'); return; }
        const left = Math.max(0, view.deadline - (Date.now() + offset));
        const total = view.timerTotal || 30000;
        el.classList.remove('hidden');
        el.classList.toggle('urgent', left < 5000);
        el.querySelector('.p-timer-fill').style.transform = `scaleX(${Math.min(1, left / total)})`;
        el.querySelector('.p-timer-num').textContent = Math.ceil(left / 1000);
    })();

    applyStatic();
    return { t, api };
}

/** Player colours: 12 distinct hues, handed out by join order (so nobody in a room shares a colour). */
const HUES = [28, 200, 140, 330, 260, 52, 175, 295, 8, 225, 95, 350];
const colourIndex = new Map();
export function setColourOrder(players) {
    colourIndex.clear();
    [...players].sort((a, b) => a.order - b.order).forEach((p, i) => colourIndex.set(p.id, i));
}
export function hue(id) {
    if (colourIndex.has(id)) return HUES[colourIndex.get(id) % HUES.length];
    let x = 0;
    for (const c of String(id)) x = (x * 31 + c.charCodeAt(0)) >>> 0;
    return HUES[x % HUES.length];
}
