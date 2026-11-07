/* Theme: same localStorage key as the main page, so all pages share the choice.
   The <head> of each page sets data-theme before paint; this wires the toggle. */

const root = document.documentElement;
const listeners = [];

export function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function onThemeChange(cb) {
    listeners.push(cb);
    cb(currentTheme());
}

function apply(theme) {
    root.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0D0B08' : '#F5F0E8';
    listeners.forEach(cb => cb(theme));
}

export function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        apply(next);
        try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    });
}

/* Colours used by the 3D scenes, per theme. Players: A = Amber, B = Ivory (the site's accent and paper). */
export const PALETTE = {
    dark: {
        bg: 0x0d0b08, floor: 0x14110d, fogNear: 420, fogFar: 1100,
        frame: 0x3b2f23, tileA: 0x2a2219, tileB: 0x30271d, groove: 0x15120e,
        hemiSky: 0xfff1dc, hemiGround: 0x1a140e, hemi: 0.55, key: 2.1, rim: 0.6,
    },
    light: {
        bg: 0xf5f0e8, floor: 0xece5d9, fogNear: 520, fogFar: 1400,
        frame: 0x33291f, tileA: 0x3b3026, tileB: 0x43372b, groove: 0x1c1712,
        hemiSky: 0xffffff, hemiGround: 0xb9ae9c, hemi: 0.9, key: 2.3, rim: 0.4,
    },
};

export const PLAYER = {
    A: { name: 'Amber', color: 0xd29433, emissive: 0x6b3f05 },
    B: { name: 'Ivory', color: 0xece4d3, emissive: 0x4a4335 },
};

export const ACCENT = 0xc9943a;
export const DANGER = 0xc0453a;
