/* How to play: one fixed-size panel shared by every Explore game.
   A game gives a list of steps { title: {en, fr}, text: {en, fr} | (lang) => html, art: (lang) => svg }.
   Every slide uses the same layout (title, 4:3 picture, scrolling text, pinned footer), so the panel never
   resizes and Previous / Next never move. Swipe, arrow keys, Escape and a close button. */

import { icon } from './icons.js';

const STR = {
    en: {
        howto: 'How to play', prev: 'Previous', next: 'Next', play: 'Play', close: 'Close', step: 'Step {n} of {total}',
        duel: '2 players', range: '{min}-{max} players', duelLine: 'A duel for exactly 2 players.', rangeLine: 'From {min} to {max} players.',
    },
    fr: {
        howto: 'Règles du jeu', prev: 'Précédent', next: 'Suivant', play: 'Jouer', close: 'Fermer', step: 'Étape {n} sur {total}',
        duel: '2 joueurs', range: '{min}-{max} joueurs', duelLine: 'Un duel pour 2 joueurs exactement.', rangeLine: 'De {min} à {max} joueurs.',
    },
};
const tr = (lang, key, vars = {}) => (STR[lang] || STR.en)[key].replace(/\{(\w+)\}/g, (_, k) => vars[k]);
const pick = (v, lang) => (typeof v === 'function' ? v(lang) : v && (v[lang] ?? v.en)) || '';

/** Player range as a badge: a duel badge for 2-player-only games, a group badge for the others. */
export function playersBadge(min, max, lang = 'en') {
    max = Math.min(12, max);
    const duel = min === 2 && max === 2;
    const label = duel ? tr(lang, 'duel') : min === max ? `${min} ${lang === 'fr' ? 'joueurs' : 'players'}` : tr(lang, 'range', { min, max });
    return `<span class="pbadge ${duel ? 'is-duel' : 'is-group'}">${icon(duel ? 'versus' : 'people')}<span>${label}</span></span>`;
}
export function playersLine(min, max, lang = 'en') {
    max = Math.min(12, max);
    return min === 2 && max === 2 ? tr(lang, 'duelLine') : tr(lang, 'rangeLine', { min, max });
}

export function createHowTo({ steps, min = 2, max = 2, lang = () => 'en', playing = () => false, onClose = null }) {
    const root = document.createElement('div');
    root.className = 'ht hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'ht-title');
    root.innerHTML = `<div class="ht-panel">
        <div class="ht-head"><span class="ht-kicker"></span><button type="button" class="ht-x">${icon('close')}</button></div>
        <div class="ht-titlerow"><h2 class="ht-title" id="ht-title"></h2><span class="ht-badge"></span></div>
        <div class="ht-art" aria-hidden="true"></div>
        <div class="ht-text" tabindex="0"></div>
        <div class="ht-foot">
          <button type="button" class="ht-btn ht-prev">${icon('chevL')}<span></span></button>
          <div class="ht-dots" role="status" aria-live="polite"></div>
          <button type="button" class="ht-btn ht-next"><span></span>${icon('chevR')}</button>
        </div></div>`;
    document.body.append(root);
    const q = s => root.querySelector(s);
    const panel = q('.ht-panel'), art = q('.ht-art'), text = q('.ht-text'), prev = q('.ht-prev'), next = q('.ht-next'), dots = q('.ht-dots');
    let i = 0, opener = null;

    function render(animate = false) {
        const L = lang();
        const step = steps[i];
        const last = i === steps.length - 1;
        q('.ht-kicker').textContent = tr(L, 'howto');
        q('.ht-x').setAttribute('aria-label', tr(L, 'close'));
        q('.ht-title').textContent = pick(step.title, L);
        q('.ht-badge').innerHTML = i === 0 ? playersBadge(min, max, L) : '';
        art.innerHTML = pick(step.art, L);
        text.innerHTML = (i === 0 ? `<p class="ht-players">${playersLine(min, max, L)}</p>` : '') + `<p>${pick(step.text, L)}</p>`;
        text.scrollTop = 0;
        prev.disabled = i === 0;
        prev.querySelector('span').textContent = tr(L, 'prev');
        next.querySelector('span').textContent = last ? tr(L, playing() ? 'close' : 'play') : tr(L, 'next');
        next.classList.toggle('is-last', last);
        dots.innerHTML = steps.map((_, k) => `<span class="ht-dot${k === i ? ' on' : ''}"></span>`).join('')
            + `<span class="ht-sr">${tr(L, 'step', { n: i + 1, total: steps.length })}</span>`;
        if (animate) { panel.classList.remove('ht-swap'); void panel.offsetWidth; panel.classList.add('ht-swap'); }
    }
    function go(k) {
        const n = Math.max(0, Math.min(steps.length - 1, k));
        if (n === i) return;
        i = n;
        render(true);
    }
    function open(at = 0) {
        opener = document.activeElement;
        i = Math.max(0, Math.min(steps.length - 1, at));
        render();
        root.classList.remove('hidden');
        setTimeout(() => next.focus({ preventScroll: true }), 30);
    }
    function close() {
        if (root.classList.contains('hidden')) return;
        root.classList.add('hidden');
        if (opener && opener.focus) opener.focus({ preventScroll: true });
        onClose && onClose();
    }
    const isOpen = () => !root.classList.contains('hidden');

    prev.addEventListener('click', () => go(i - 1));
    next.addEventListener('click', () => (i === steps.length - 1 ? close() : go(i + 1)));
    q('.ht-x').addEventListener('click', close);
    root.addEventListener('click', e => { if (e.target === root) close(); });

    // Swipe left / right anywhere on the panel (vertical drags still scroll the text).
    let sx = null, sy = 0;
    panel.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    panel.addEventListener('pointerup', e => {
        if (sx === null) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        sx = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) go(i + (dx < 0 ? 1 : -1));
    });
    panel.addEventListener('pointercancel', () => { sx = null; });

    // Keys are caught first so the game underneath never sees them while the panel is open.
    document.addEventListener('keydown', e => {
        if (!isOpen()) return;
        if (e.key === 'ArrowRight') go(i + 1);
        else if (e.key === 'ArrowLeft') go(i - 1);
        else if (e.key === 'Escape') close();
        else if (e.key === 'Tab') {
            const f = [...root.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
            const k = f.indexOf(document.activeElement);
            const to = e.shiftKey ? (k <= 0 ? f.length - 1 : k - 1) : (k === f.length - 1 ? 0 : k + 1);
            f[to].focus();
        } else { e.stopImmediatePropagation(); return; }   // Enter / Space still press the focused button
        e.preventDefault();
        e.stopImmediatePropagation();
    }, true);

    return { open, close, isOpen, refresh: () => { if (isOpen()) render(); }, el: root };
}
