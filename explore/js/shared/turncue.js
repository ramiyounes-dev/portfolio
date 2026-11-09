/* "Your turn" cue, shared by every Explore game (party games and the 3D duels).
   A soft two-note chime made with Web Audio (no file to load), a light vibration where the browser has it
   (not iOS Safari: the chime alone is the cue there), and a blinking tab title while the tab is hidden.
   Games only say when the turn becomes the local player's (see turnWatcher); muting is one switch for both. */

const KEY = 'explore:turnCue';
let muted = false;
try { muted = localStorage.getItem(KEY) === 'off'; } catch (e) { /* storage blocked: cue on */ }

let ctx = null;
/* Browsers keep audio locked until the page gets a tap or a key: create / resume the context on the first one */
function unlock() {
    try {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ctx = new AC();
        }
        if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { /* no audio */ }
}
if (typeof window !== 'undefined') {
    for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { capture: true, passive: true });
}

function chime() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(ctx.destination);
    // Two soft sine notes (E6 then A6), each with a quick attack and a gentle fade: about 0.2 s in all
    [[1318.5, 0], [1760, 0.09]].forEach(([f, at]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + at);
        g.gain.exponentialRampToValueAtTime(0.05, now + at + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16);
        o.connect(g).connect(out);
        o.start(now + at);
        o.stop(now + at + 0.18);
    });
}

function buzz() {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;   // iOS Safari: none
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try { navigator.vibrate([20, 40, 20]); } catch (e) { /* not allowed */ }
}

/* Hidden tab: the title blinks "● Your turn" until the player comes back */
let blink = null, savedTitle = '';
function flashTitle(text) {
    if (blink || typeof document === 'undefined') return;
    savedTitle = document.title;
    let on = false;
    blink = setInterval(() => { on = !on; document.title = on ? `● ${text}` : savedTitle; }, 1000);
    const stop = () => {
        if (document.hidden) return;
        clearInterval(blink); blink = null;
        document.title = savedTitle;
        document.removeEventListener('visibilitychange', stop);
    };
    document.addEventListener('visibilitychange', stop);
}

/** The cue itself. title: the words for the blinking tab title ("Your turn"). */
export function notifyTurn({ title = 'Your turn' } = {}) {
    if (muted) return;
    chime();
    buzz();
    if (document.hidden) flashTitle(title);
}

export const isCueMuted = () => muted;
export function setCueMuted(v) {
    muted = !!v;
    try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch (e) { /* not saved */ }
    for (const b of document.querySelectorAll('.cue-toggle')) paint(b);
}

/** Fires only when a turn key changes into "mine": not on the first state seen (page load, reconnect),
    not again while it stays the same turn. reset() forgets the last state (e.g. on reconnect). */
export function turnWatcher() {
    let last = null;
    return {
        update(key, mine, title) {
            const fire = last !== null && key !== last && mine;
            last = key;
            if (fire) notifyTurn({ title });
            return fire;
        },
        reset() { last = null; },
    };
}

/* ---------- The mute switch (header, next to the theme toggle) ---------- */
const BELL = '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>';
const SLASH = '<path d="M4 4l16 16"/>';
function paint(b) {
    b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BELL}${muted ? SLASH : ''}</svg>`;
    b.setAttribute('aria-pressed', String(!muted));
    const lang = document.documentElement.lang === 'fr' ? 'fr' : 'en';
    const label = lang === 'fr' ? (muted ? 'Signal de tour coupé' : 'Signal de tour (son et vibration)') : (muted ? 'Turn alert off' : 'Turn alert (sound and vibration)');
    b.setAttribute('aria-label', label);
    b.title = label;
}
/** A button for the header: same size as the theme toggle, always there, so nothing moves when it changes. */
export function cueToggle() {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cue-toggle';
    paint(b);
    b.addEventListener('click', () => {
        setCueMuted(!muted);
        if (!muted) { unlock(); setTimeout(chime, 30); }   // a sample, so the player hears what it sounds like
    });
    return b;
}
export const repaintCueToggles = () => document.querySelectorAll('.cue-toggle').forEach(paint);
