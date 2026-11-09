/* Shared setup flow, identical for every game:
   1. How many players?  2. vs AI (difficulty)  or  Humans -> Same device (names) | Online (create / join / public rooms). */

import { icon } from './icons.js';
import { playersBadge } from './howto.js';

const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } },
};

export function createSetup(el, { logic, ui, t, esc, onLocal, onCreate, onJoin, listRooms, initialCode = '', lang = () => 'en' }) {
    const min = logic.min, max = Math.min(12, logic.max);
    const s = {
        step: initialCode ? 'online' : 'count',
        count: Math.min(max, Math.max(min, Number(store.get('party:count:' + logic.id)) || min)),
        difficulty: store.get('party:difficulty') || 'medium',
        role: ui.aiRoles ? ui.aiRoles[0].id : null,
        names: [],
        nick: store.get('party:name') || '',
        code: initialCode,
        visibility: 'public',
        rooms: null,
        msg: '',
    };

    const back = to => `<button type="button" class="text-link su-back" data-go="${to}">← ${esc(t('su.back'))}</button>`;
    const choice = (go, icon, title, sub) => `<button type="button" class="su-choice" data-go="${go}"><span class="su-ic">${icon}</span><span><b>${esc(title)}</b><span>${esc(sub)}</span></span><span class="mb-arrow">→</span></button>`;

    function render() {
        let html = '';
        if (s.step === 'count') {
            html = `<div class="su-step"><span class="p-label">${esc(t('su.step', { n: 1 }))}</span><h2 class="su-h">${esc(t('su.howMany'))}</h2>
              ${min === max ? `<div class="su-fixed">${playersBadge(min, max, lang())}<span>${esc(t('su.fixed', { n: min }))}</span></div>`
                : `<div class="su-count"><button type="button" class="su-pm" data-d="-1" ${s.count <= min ? 'disabled' : ''}>−</button><b>${s.count}</b><button type="button" class="su-pm" data-d="1" ${s.count >= max ? 'disabled' : ''}>+</button></div>
                 <div class="su-range">${playersBadge(min, max, lang())}</div>`}
              <button type="button" class="p-btn primary big" data-go="who">${esc(t('su.next'))}</button></div>`;
        } else if (s.step === 'who') {
            html = `<div class="su-step"><span class="p-label">${esc(t('su.step', { n: 2 }))}</span><h2 class="su-h">${esc(t('su.who'))}</h2>
              ${choice('ai', icon('bot'), t('su.vsAi'), t('su.vsAiSub', { n: s.count - 1 }))}
              ${choice('humans', icon('people'), t('su.humans'), t('su.humansSub', { n: s.count }))}
              ${back('count')}</div>`;
        } else if (s.step === 'ai') {
            html = `<div class="su-step"><h2 class="su-h">${esc(t('su.vsAi'))}</h2>
              <p class="g-note">${esc(t('su.aiLine', { n: s.count - 1 }))}</p>
              <span class="p-label">${esc(t('su.difficulty'))}</span>
              <div class="su-seg">${['easy', 'medium', 'hard'].map(d => `<button type="button" data-diff="${d}" aria-pressed="${s.difficulty === d}">${esc(t('su.' + d))}</button>`).join('')}</div>
              ${ui.aiRoles ? `<span class="p-label">${esc(t('su.yourRole'))}</span><div class="su-seg">${ui.aiRoles.map(r => `<button type="button" data-role="${r.id}" aria-pressed="${s.role === r.id}">${esc(t(r.label))}</button>`).join('')}</div>` : ''}
              <label class="p-field"><span class="p-label">${esc(t('nickname'))}</span><input class="p-input" data-nick maxlength="16" value="${esc(s.nick)}" placeholder="${esc(t('nicknamePh'))}"></label>
              <button type="button" class="p-btn primary big" data-start="ai">${esc(t('su.play'))}</button>${back('who')}</div>`;
        } else if (s.step === 'humans') {
            html = `<div class="su-step"><h2 class="su-h">${esc(t('su.where'))}</h2>
              ${choice('device', icon('phone'), t('su.device'), t('su.deviceSub'))}
              ${choice('online', icon('globe'), t('su.online'), t('su.onlineSub'))}
              ${back('who')}</div>`;
        } else if (s.step === 'device') {
            while (s.names.length < s.count) s.names.push('');
            s.names.length = s.count;
            html = `<div class="su-step"><h2 class="su-h">${esc(t('su.device'))}</h2><p class="g-note">${esc(t('su.namesLine'))}</p>
              ${s.names.map((n, i) => `<input class="p-input su-name" data-name="${i}" maxlength="16" value="${esc(n)}" placeholder="${esc(t('su.playerN', { n: i + 1 }))}">`).join('')}
              <button type="button" class="p-btn primary big" data-start="device">${esc(t('su.next'))}</button>${back('humans')}</div>`;
        } else if (s.step === 'online') {
            html = `<div class="su-step"><h2 class="su-h">${esc(t('su.online'))}</h2>
              <label class="p-field"><span class="p-label">${esc(t('nickname'))}</span><input class="p-input" data-nick maxlength="16" value="${esc(s.nick)}" placeholder="${esc(t('nicknamePh'))}"></label>
              <div class="su-box"><span class="p-label">${esc(t('su.create'))}</span>
                <div class="su-seg"><button type="button" data-vis="public" aria-pressed="${s.visibility === 'public'}">${esc(t('su.public'))}</button><button type="button" data-vis="private" aria-pressed="${s.visibility === 'private'}">${esc(t('su.private'))}</button></div>
                <p class="p-mono">${esc(t(s.visibility === 'public' ? 'su.publicSub' : 'su.privateSub'))} · ${esc(t('su.target', { n: s.count }))}</p>
                <button type="button" class="p-btn primary big" data-create="1">${esc(t('create'))}</button></div>
              <div class="su-box"><span class="p-label">${esc(t('su.join'))}</span>
                <div class="p-join"><input class="p-input code" data-code maxlength="5" autocapitalize="characters" autocomplete="off" spellcheck="false" value="${esc(s.code)}" placeholder="${esc(t('codePh'))}"><button type="button" class="p-btn" data-join="1">${esc(t('join'))}</button></div>
                <div class="su-rooms-head"><span class="p-label">${esc(t('su.openRooms'))}</span><button type="button" class="text-link" data-refresh="1">${icon('refresh')} ${esc(t('su.refresh'))}</button></div>
                <ul class="su-rooms">${roomList()}</ul></div>
              <p class="p-msg" aria-live="polite">${s.msg}</p>
              ${back('humans')}</div>`;
            if (s.rooms === null) refreshRooms();
        }
        el.innerHTML = html;
    }

    function roomList() {
        if (s.rooms === null) return `<li class="p-mono">${esc(t('connecting'))}</li>`;
        if (!s.rooms.length) return `<li class="p-mono">${esc(t('su.noRooms'))}</li>`;
        return s.rooms.map(r => `<li><button type="button" class="su-room" data-room="${esc(r.code)}">
            <span><b>${esc(r.host || r.code)}</b><span class="p-mono">${esc(r.code)} · ${esc(r.lang.toUpperCase())}</span></span>
            <span class="p-mono">${r.players}/${r.target || r.max}${r.target && r.target < r.max ? ` (${r.max})` : ''} · ${esc(t(r.phase === 'lobby' ? 'su.inLobby' : 'su.inGame'))}</span></button></li>`).join('');
    }

    async function refreshRooms() {
        try { s.rooms = await listRooms(); } catch (e) { s.rooms = []; }
        if (s.step === 'online') { const ul = el.querySelector('.su-rooms'); if (ul) ul.innerHTML = roomList(); }
    }

    function nick() {
        const n = s.nick.trim().slice(0, 16);
        if (!n) { message(t('err.name_required')); return null; }
        store.set('party:name', n);
        return n;
    }
    function message(m) { s.msg = esc(m); const p = el.querySelector('.p-msg'); if (p) p.innerHTML = s.msg; }

    el.addEventListener('input', e => {
        if (e.target.matches('[data-nick]')) s.nick = e.target.value;
        if (e.target.matches('[data-code]')) { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); s.code = e.target.value; }
        if (e.target.matches('[data-name]')) s.names[Number(e.target.dataset.name)] = e.target.value;
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-code]')) el.querySelector('[data-join]').click(); });
    el.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.d) { s.count = Math.min(max, Math.max(min, s.count + Number(b.dataset.d))); store.set('party:count:' + logic.id, s.count); }
        else if (b.dataset.go) { s.step = b.dataset.go; s.msg = ''; if (s.step === 'ai' && s.count < 2) s.count = 2; }
        else if (b.dataset.diff) { s.difficulty = b.dataset.diff; store.set('party:difficulty', s.difficulty); }
        else if (b.dataset.role) s.role = b.dataset.role;
        else if (b.dataset.vis) s.visibility = b.dataset.vis;
        else if (b.dataset.refresh) { s.rooms = null; }
        else if (b.dataset.start === 'ai') { const n = nick(); if (n) onLocal({ mode: 'ai', count: Math.max(2, s.count), names: [n], difficulty: s.difficulty, role: s.role }); return; }
        else if (b.dataset.start === 'device') { onLocal({ mode: 'device', count: s.count, names: s.names.map((x, i) => x.trim() || t('su.playerN', { n: i + 1 })) }); return; }
        else if (b.dataset.create) { const n = nick(); if (n) onCreate({ name: n, target: s.count, visibility: s.visibility }); return; }
        else if (b.dataset.join) { const n = nick(); if (n) onJoin({ name: n, code: s.code }); return; }
        else if (b.dataset.room) { s.code = b.dataset.room; const n = nick(); if (n) onJoin({ name: n, code: s.code }); return; }
        else return;
        render();
    });

    render();
    return { render, message, show(step) { s.step = step; render(); } };
}
