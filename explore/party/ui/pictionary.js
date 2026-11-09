import logic, { PALETTE } from '../logic/pictionary.js';
import howto from '../howto/pictionary.js';
import ai from '../ai/pictionary.js';
import { icon } from '../client/icons.js';

/* Local drawing state (one game per page). Coordinates are 0..1000 in both axes. */
let strokes = [];
let turnNo = -1;
let canvas = null, ctx2d = null;
const WIDTHS = { 1: 4, 2: 10, 3: 24 };

function redraw() {
    if (!ctx2d) return;
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) drawStroke(s, 0);
}

function drawStroke(s, from) {
    if (!ctx2d || s.pts.length < 2) return;
    if (s.w === 0) { floodFill(s.pts[0], s.pts[1], s.c); return; }
    const k = canvas.width / 1000;
    ctx2d.save();
    ctx2d.globalCompositeOperation = s.c === 'erase' ? 'destination-out' : 'source-over';
    ctx2d.strokeStyle = s.c === 'erase' ? '#000' : s.c;
    ctx2d.fillStyle = ctx2d.strokeStyle;
    ctx2d.lineWidth = WIDTHS[s.w] * k * (s.c === 'erase' ? 2 : 1);
    ctx2d.lineCap = 'round';
    ctx2d.lineJoin = 'round';
    const start = Math.max(0, from - 2);
    if (s.pts.length === 2) {
        ctx2d.beginPath(); ctx2d.arc(s.pts[0] * k, s.pts[1] * k, ctx2d.lineWidth / 2, 0, Math.PI * 2); ctx2d.fill();
    } else {
        ctx2d.beginPath();
        ctx2d.moveTo(s.pts[start] * k, s.pts[start + 1] * k);
        for (let i = start + 2; i < s.pts.length; i += 2) ctx2d.lineTo(s.pts[i] * k, s.pts[i + 1] * k);
        ctx2d.stroke();
    }
    ctx2d.restore();
}

/** Paint bucket: fill the area around (x, y) (0..1000) that has the same colour as that point.
    Edges of lines are soft, so near-matching pixels count too, and the fill grows 1 px under the line edge. */
function floodFill(x, y, colour) {
    const W = canvas.width, H = canvas.height, k = W / 1000;
    const px = Math.min(W - 1, Math.max(0, Math.round(x * k))), py = Math.min(H - 1, Math.max(0, Math.round(y * k)));
    const img = ctx2d.getImageData(0, 0, W, H), d = img.data;
    const at = (px + py * W) * 4;
    const tr = d[at], tg = d[at + 1], tb = d[at + 2], ta = d[at + 3];
    const hex = colour.replace('#', '');
    const fr = parseInt(hex.slice(0, 2), 16), fg = parseInt(hex.slice(2, 4), 16), fb = parseInt(hex.slice(4, 6), 16);
    if (Math.abs(fr - tr) + Math.abs(fg - tg) + Math.abs(fb - tb) < 12 && ta > 240) return;   // already that colour
    const same = i => (ta < 40 ? d[i + 3] < 120 : d[i + 3] > 120 && Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) < 90);
    const seen = new Uint8Array(W * H);
    const stack = [px, py];
    while (stack.length) {
        const sy = stack.pop(), sx0 = stack.pop();
        let sx = sx0;
        while (sx > 0 && !seen[sx - 1 + sy * W] && same((sx - 1 + sy * W) * 4)) sx--;
        let up = false, down = false;
        for (; sx < W && !seen[sx + sy * W] && same((sx + sy * W) * 4); sx++) {
            seen[sx + sy * W] = 1;
            if (sy > 0) { const u = !seen[sx + (sy - 1) * W] && same((sx + (sy - 1) * W) * 4); if (u && !up) stack.push(sx, sy - 1); up = u; }
            if (sy < H - 1) { const v = !seen[sx + (sy + 1) * W] && same((sx + (sy + 1) * W) * 4); if (v && !down) stack.push(sx, sy + 1); down = v; }
        }
    }
    // Paint the area plus a 1 px rim, under the existing lines
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        const j = xx + yy * W;
        if (!(seen[j] || (xx > 0 && seen[j - 1]) || (xx < W - 1 && seen[j + 1]) || (yy > 0 && seen[j - W]) || (yy < H - 1 && seen[j + W]))) continue;
        const i = j * 4, a = d[i + 3] / 255;
        d[i] = Math.round(d[i] * a + fr * (1 - a)); d[i + 1] = Math.round(d[i + 1] * a + fg * (1 - a)); d[i + 2] = Math.round(d[i + 2] * a + fb * (1 - a)); d[i + 3] = 255;
    }
    ctx2d.putImageData(img, 0, 0);
}

function applySeg(seg) {
    const last = strokes[strokes.length - 1];
    if (last && last.id === seg.id && seg.w) { const from = last.pts.length; last.pts.push(...seg.pts); drawStroke(last, from); }
    else { const s = { ...seg, pts: [...seg.pts] }; strokes.push(s); drawStroke(s, 0); }
}

function sizeCanvas() {
    if (!canvas) return;
    const w = canvas.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = canvas.height = Math.round(w * dpr); redraw(); }
}
window.addEventListener('resize', sizeCanvas);

export default {
    logic,
    ai,
    privateInfo: (v, id) => v.drawer === id && (v.phase === 'choose' || v.phase === 'draw'),
    deviceSettings: { loud: true },
    wordGame: true,
    title: { en: 'Pictionary', fr: 'Dessiner c\'est gagner' },
    icon: 'pictionary',
    strings: {
        en: {
            'set.timer': 'Drawing time', 'set.rotations': 'Turns each', 'set.hints': 'Letter hints', 'set.difficulty': 'Words',
            'opt.difficulty.easy': 'Short', 'opt.difficulty.any': 'Any', 'opt.difficulty.hard': 'Long',
            loudDraw: 'Draw it. Everyone guesses out loud.', showWord: 'Show my word', hideWord: 'Hide my word', whoFound: 'Who said it first?', nobody: 'Nobody',
            choose: 'Choose a word to draw', choosing: '{name} is choosing a word', drawThis: 'Draw: {w}', drawing: '{name} is drawing',
            guessPh: 'Type your guess', send: 'Guess', gotIt: '{name} guessed it (+{n})', youGotIt: 'You got it. Wait for the others.',
            theWord: 'The word was {w}', undo: 'Undo', clear: 'Clear', eraser: 'Eraser', pen: 'Pen', fill: 'Fill', 'pc.close': 'Close!', 'pc.full': 'The drawing is full, clear some space',
            turnOf: 'Turn {n}',
        },
        fr: {
            'set.timer': 'Temps de dessin', 'set.rotations': 'Tours chacun', 'set.hints': 'Lettres indices', 'set.difficulty': 'Mots',
            'opt.difficulty.easy': 'Courts', 'opt.difficulty.any': 'Tous', 'opt.difficulty.hard': 'Longs',
            loudDraw: 'Dessine. Tout le monde devine à voix haute.', showWord: 'Voir mon mot', hideWord: 'Cacher mon mot', whoFound: 'Qui l\'a dit en premier ?', nobody: 'Personne',
            choose: 'Choisis un mot à dessiner', choosing: '{name} choisit un mot', drawThis: 'Dessine : {w}', drawing: '{name} dessine',
            guessPh: 'Tape ta proposition', send: 'Proposer', gotIt: '{name} a trouvé (+{n})', youGotIt: 'Trouvé. On attend les autres.',
            theWord: 'Le mot était {w}', undo: 'Annuler', clear: 'Effacer tout', eraser: 'Gomme', pen: 'Crayon', fill: 'Remplir', 'pc.close': 'Presque !', 'pc.full': 'Le dessin est plein, efface un peu',
            turnOf: 'Tour {n}',
        },
    },
    howto,

    status(v, api) { return api.t('turnOf', { n: v.turnNo }); },
    turnOf: v => (v.drawer ? [v.drawer] : []),

    onSync(data) { strokes = data.strokes || []; turnNo = data.turnNo; redraw(); },
    onEvent(e) {
        if (e.t === 'seg') applySeg(e.seg);
        else if (e.t === 'undo') { strokes.pop(); redraw(); }
        else if (e.t === 'clear') { strokes = []; redraw(); }
    },
    onNote(note, api) { api.toast(api.t(note)); },

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const isDrawer = v.drawer === me;
        if (v.turnNo !== turnNo) { turnNo = v.turnNo; strokes = []; }
        const key = `${v.turnNo}:${isDrawer}`;
        if (root.dataset.key !== key) {
            root.dataset.key = key;
            root.innerHTML = `<p class="g-big-msg pc-msg"></p><div class="pc-word"></div><div class="pc-choices"></div>
                <div class="pc-stage"><canvas class="pc-canvas"></canvas></div>
                <div class="pc-tools ${isDrawer ? '' : 'hidden'}">
                  <div class="pc-colors">${PALETTE.filter(c => c !== 'erase').map(c => `<button type="button" class="pc-color" data-c="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}
                    <button type="button" class="pc-color erase" data-c="erase" aria-label="${esc(t('eraser'))}">${icon('eraser')}</button></div>
                  <div class="p-row"><span class="p-seg pc-mode"><button type="button" data-mode="pen" aria-pressed="true">${icon('pictionary')} ${esc(t('pen'))}</button><button type="button" data-mode="fill" aria-pressed="false">${icon('bucket')} ${esc(t('fill'))}</button></span></div>
                  <div class="p-row"><span class="p-seg pc-widths">${[1, 2, 3].map(w => `<button type="button" data-w="${w}" aria-pressed="${w === 2}"><i style="--s:${4 + w * 4}px"></i></button>`).join('')}</span>
                    <button type="button" class="p-btn small" data-undo="1">${esc(t('undo'))}</button><button type="button" class="p-btn small" data-clear="1">${esc(t('clear'))}</button></div>
                </div>
                <form class="pc-guess hidden"><input class="p-input" maxlength="40" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="p-btn primary" type="submit"></button></form>
                <ul class="pc-chat"></ul>`;
            canvas = root.querySelector('.pc-canvas');
            ctx2d = canvas.getContext('2d');
            requestAnimationFrame(() => { sizeCanvas(); redraw(); });
            root._tool = { c: PALETTE[0], w: 2, mode: 'pen' };
            setupDrawing(root, api, isDrawer);
            const form = root.querySelector('.pc-guess');
            form.onsubmit = e => { e.preventDefault(); const i = form.querySelector('input'); if (i.value.trim()) send({ guess: i.value }); i.value = ''; };
            root.querySelector('.pc-tools').onclick = e => {
                const c = e.target.closest('[data-c]');
                if (c) {
                    if (c.dataset.c === 'erase') setMode('pen');      // the eraser is a pen tool, it cannot fill
                    root._tool.c = c.dataset.c; root.querySelectorAll('.pc-color').forEach(b => b.classList.toggle('on', b === c)); return;
                }
                const m = e.target.closest('[data-mode]');
                if (m) { setMode(m.dataset.mode); return; }
                const w = e.target.closest('[data-w]');
                if (w) { root._tool.w = Number(w.dataset.w); root.querySelectorAll('[data-w]').forEach(b => b.setAttribute('aria-pressed', String(b === w))); return; }
                if (e.target.closest('[data-undo]')) { strokes.pop(); redraw(); send({ undo: true }); return; }
                if (e.target.closest('[data-clear]')) { strokes = []; redraw(); send({ clear: true }); }
            };
            function setMode(mode) {
                root._tool.mode = mode;
                root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
                root.querySelector('.pc-widths').classList.toggle('off', mode === 'fill');
                root.querySelector('.pc-stage').classList.toggle('fill', mode === 'fill');
                if (mode === 'fill' && root._tool.c === 'erase') root.querySelector(`.pc-color[data-c="${PALETTE[0]}"]`).click();
            }
            root.querySelector('.pc-choices').onclick = e => { const b = e.target.closest('[data-i]'); if (b) send({ choose: Number(b.dataset.i) }); };
            root.querySelector('.pc-color').classList.add('on');
        }
        const $ = s => root.querySelector(s);
        let msg = '';
        if (v.phase === 'choose') msg = isDrawer ? t('choose') : t('choosing', { name: nameOf(v.drawer) });
        else if (v.phase === 'draw' && v.loud && isDrawer) msg = root._peek ? t('drawThis', { w: v.word.toUpperCase() }) : t('loudDraw');
        else if (v.phase === 'draw') msg = isDrawer ? t('drawThis', { w: v.word.toUpperCase() }) : v.done ? t('youGotIt') : t('drawing', { name: nameOf(v.drawer) });
        else if (v.reveal) msg = t('theWord', { w: v.reveal.word.toUpperCase() });
        $('.pc-msg').textContent = msg;
        $('.pc-word').innerHTML = v.mask ? `<div class="hm-letters">${v.mask.map(c => `<span class="hm-slot ${c ? 'on' : ''}">${c ? esc(c.toUpperCase()) : ''}</span>`).join('')}</div>` : '';
        $('.pc-choices').innerHTML = v.phase === 'choose' && isDrawer && v.choices ? `<div class="p-row">${v.choices.map((w, i) => `<button type="button" class="p-btn" data-i="${i}">${esc(w)}</button>`).join('')}</div>` : '';
        $('.pc-tools').classList.toggle('hidden', !(isDrawer && v.phase === 'draw'));
        $('.pc-stage').classList.toggle('live', isDrawer && v.phase === 'draw');
        const canGuess = !isDrawer && v.phase === 'draw' && !v.done && api.isSeated;
        $('.pc-guess').classList.toggle('hidden', !canGuess);
        $('.pc-guess input').placeholder = t('guessPh');
        $('.pc-guess button').textContent = t('send');
        let credit = $('.pc-credit');
        if (!credit) { credit = document.createElement('div'); credit.className = 'pc-credit'; $('.pc-stage').after(credit); }
        credit.innerHTML = v.loud && isDrawer && v.phase === 'draw'
            ? `<button type="button" class="text-link" data-peek="1">${esc(t(root._peek ? 'hideWord' : 'showWord'))}</button>
               <span class="p-label">${esc(t('whoFound'))}</span>
               <div class="ch-callers">${v.players.filter(id => id !== v.drawer).map(id => `<button type="button" class="p-btn" data-credit="${esc(id)}">${esc(nameOf(id))}</button>`).join('')}
               <button type="button" class="p-btn" data-credit="">${esc(t('nobody'))}</button></div>` : '';
        credit.onclick = e => {
            if (e.target.closest('[data-peek]')) { root._peek = !root._peek; this.render(root, v, api); return; }
            const b = e.target.closest('[data-credit]');
            if (b) send({ credit: b.dataset.credit || null });
        };
        $('.pc-chat').innerHTML = v.chat.slice(-12).reverse().map(m => m.ok
            ? `<li class="ok">${icon('check')} ${esc(t('gotIt', { name: nameOf(m.pid), n: m.pts }))}</li>`
            : `<li><b>${esc(nameOf(m.pid))}</b> ${esc(m.text)}</li>`).join('');
        root._drawing = isDrawer && v.phase === 'draw';
    },
};

/** Pointer drawing for the drawer: draw locally at once, send points in ~60 ms batches. */
function setupDrawing(root, api, isDrawer) {
    if (!isDrawer) return;
    const c = root.querySelector('.pc-canvas');
    c.style.touchAction = 'none';
    let current = null, buffer = [], timer = null, nextId = Date.now() % 100000;
    const point = e => {
        const r = c.getBoundingClientRect();
        return [Math.max(0, Math.min(1000, Math.round(((e.clientX - r.left) / r.width) * 1000))), Math.max(0, Math.min(1000, Math.round(((e.clientY - r.top) / r.height) * 1000)))];
    };
    const flush = () => {
        if (current && buffer.length) api.send({ seg: { id: current.id, c: current.c, w: current.w, pts: buffer } });
        buffer = [];
    };
    c.addEventListener('pointerdown', e => {
        if (!root._drawing) return;
        if (root._tool.mode === 'fill') {
            const fill = { id: ++nextId, c: root._tool.c, w: 0, pts: point(e) };
            strokes.push(fill);
            drawStroke(fill, 0);
            api.send({ seg: fill });
            return;
        }
        try { c.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already released pointer */ }
        current = { id: ++nextId, c: root._tool.c, w: root._tool.w, pts: [] };
        strokes.push(current);
        const p = point(e);
        current.pts.push(...p);
        buffer.push(...p);
        drawStroke(current, 0);
        clearInterval(timer);
        timer = setInterval(flush, 60);
    });
    c.addEventListener('pointermove', e => {
        if (!current) return;
        const p = point(e);
        const n = current.pts.length;
        if (n && Math.abs(current.pts[n - 2] - p[0]) + Math.abs(current.pts[n - 1] - p[1]) < 4) return;
        current.pts.push(...p);
        buffer.push(...p);
        drawStroke(current, n);
        if (buffer.length >= 380) flush();
    });
    const end = () => { if (!current) return; flush(); clearInterval(timer); current = null; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
}
