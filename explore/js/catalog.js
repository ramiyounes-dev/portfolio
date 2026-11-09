/* ============================
   EXPLORE: flip-through catalog
   Builds a book from the #catalog list: an open two-page spread on desktop,
   one page at a time on phones. Pages turn by drag/swipe (the sheet follows the pointer),
   tap on a page edge, arrow keys, the prev/next buttons, the dots, or the contents page.
   ============================ */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spreadQuery = window.matchMedia('(min-width: 900px)');
  const FLIP_MS = reduceMotion ? 0 : 950;

  /* ---------- Theme (shared key with the main page) ---------- */
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeMeta) themeMeta.content = theme === 'dark' ? '#0D0B08' : '#F5F0E8';
  }
  applyTheme(root.getAttribute('data-theme') || 'dark');
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
  });

  /* ---------- Data: read from the list, so the HTML stays the single source ---------- */
  const allGames = [...document.querySelectorAll('#catalog .entry')].map((li, i) => ({
    n: i + 1,
    min: Number(li.dataset.min), max: Number(li.dataset.max),
    badge: li.querySelector('.pbadge').outerHTML,          // our own markup, like the icon
    href: li.querySelector('.entry-link').getAttribute('href'),
    icon: li.querySelector('.entry-icon').innerHTML.trim(),   // inline SVG from our own markup
    title: li.querySelector('.entry-title').textContent.trim(),
    desc: li.querySelector('.entry-desc').textContent.trim(),
    tags: [...li.querySelectorAll('.entry-tags > span:not(.pbadge)')].map(s => s.textContent.trim()),
  }));
  if (!allGames.length) { root.classList.remove('js'); return; }
  let games = allGames;

  const book = document.getElementById('book');
  const prevBtn = document.getElementById('book-prev');
  const nextBtn = document.getElementById('book-next');
  const dotsEl = document.getElementById('book-dots');
  const countEl = document.getElementById('book-count');
  const liveEl = document.getElementById('book-live');

  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  let total = games.length;
  let views = [];          // label of each view: a spread on desktop, a page on phones
  let tocViews = 1;        // how many views the contents take before the first game

  /* ---------- Page templates ---------- */
  const tagList = g => `<div class="pg-tags">${g.badge}<ul class="tags">${g.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  const playLink = g => `<a class="play" href="${esc(g.href)}">Play <span class="play-arrow" aria-hidden="true">→</span></a>`;

  const tpl = {
    endpaper: () => `
      <div class="pg pg-endpaper">
        <span class="mono">ramiyounes.dev / explore</span>
        <span class="endpaper-mark" aria-hidden="true">RY<span class="logo-dot">.</span></span>
        <span class="mono">(E)</span>
      </div>`,
    contents: (folio, items, part, parts) => `
      <div class="pg pg-contents">
        <div class="pg-top"><span>(E)</span><span>${parts > 1 ? `${part} / ${parts}` : 'Explore'}</span></div>
        <h2 class="toc-title">Contents</h2>
        <ol class="toc">
          ${items.map(g => `
            <li><button type="button" data-go="${tocViews + g.n - 1}">
              <span class="toc-n">${pad(g.n)}</span>
              <span class="toc-name"><span>${esc(g.title)}</span></span>
              <span class="toc-p">${pad(tocViews + g.n)}</span>
            </button></li>`).join('')}
        </ol>
        <div class="pg-bottom"><span>${pad(total)} entries</span><span class="folio">${folio}</span></div>
      </div>`,
    notes: () => `
      <div class="pg pg-endpaper pg-notes">
        <span class="mono">Fig. ${pad(total)}</span>
        <span class="mono">Turn the page &rarr;</span>
      </div>`,
    plate: (g, folio) => `
      <div class="pg pg-plate">
        <div class="pg-top"><span>Fig. ${pad(g.n)}</span><span>${esc(g.title)}</span></div>
        <div class="plate-art" aria-hidden="true">
          <span class="plate-num">${pad(g.n)}</span>
          <span class="plate-icon">${g.icon}</span>
        </div>
        <div class="pg-bottom">${tagList(g)}<span class="folio">${folio}</span></div>
      </div>`,
    text: (g, folio) => `
      <div class="pg pg-text">
        <div class="pg-top"><span>${pad(g.n)} / ${pad(total)}</span><span>Explore</span></div>
        <div class="text-main">
          <h2 class="pg-title">${esc(g.title)}</h2>
          <p class="pg-desc">${esc(g.desc)}</p>
        </div>
        <div class="pg-bottom">${playLink(g)}<span class="folio">${folio}</span></div>
      </div>`,
    single: (g, folio) => `
      <div class="pg pg-single">
        <div class="pg-top"><span>${pad(g.n)} / ${pad(total)}</span><span>Explore</span></div>
        <div class="plate-art" aria-hidden="true">
          <span class="plate-num">${pad(g.n)}</span>
          <span class="plate-icon">${g.icon}</span>
        </div>
        <h2 class="pg-title">${esc(g.title)}</h2>
        <p class="pg-desc">${esc(g.desc)}</p>
        ${tagList(g)}
        <div class="pg-bottom">${playLink(g)}<span class="folio">${folio}</span></div>
      </div>`,
    blank: () => `<div class="pg pg-blank"></div>`,
  };

  /* ---------- State ---------- */
  let mode = '';          // 'spread' | 'single'
  let leaves = [];        // { el, front, back }
  let baseL = null, baseR = null;
  let f = 0;              // flipped leaves = current view index
  let maxF = 0;

  function makePage(html, side) {
    const el = document.createElement('div');
    el.className = `page side-${side}`;
    el.innerHTML = html;
    return el;
  }

  function makeLeaf(frontHtml, backHtml) {
    const el = document.createElement('div');
    el.className = 'leaf';
    el.innerHTML = `<div class="face face-front side-r">${frontHtml}</div><div class="face face-back side-l">${backHtml}</div>`;
    el.addEventListener('transitionend', e => {
      if (e.target === el && e.propertyName === 'transform') endTurn(el);
    });
    return { el, front: el.children[0], back: el.children[1] };
  }

  /** Split the contents so each page holds as many rows as its height allows. */
  let tocPer = 0, tocShape = null;
  function rowsPerTocPage() {
    // Measured from the page on screen when there is one (rows and heading scale with the page), else estimated
    // Layout sizes (offset*), not on-screen boxes: pages turned in 3D would measure wrong
    const toc = book.querySelector('.toc'), li = toc && toc.querySelector('li'), pg = toc && toc.closest('.pg');
    const pageH = (pg && pg.clientHeight) || book.offsetHeight || 500;
    const rowH = li ? li.offsetHeight : 50;
    let head = 220;
    if (toc && pg) { head = 0; for (let e = toc; e && e !== pg; e = e.offsetParent) head += e.offsetTop; if (head <= 0 || head > pageH) head = 220; }
    // Heading and rows scale with the page: keep them as a share of its height for when no contents page is built yet
    if (toc && pg && li) tocShape = { head: head / pageH, row: rowH / pageH };
    else if (tocShape) return Math.max(2, Math.min(12, Math.floor((1 - tocShape.head - 64 / pageH) / tocShape.row)));
    return Math.max(2, Math.min(12, Math.floor((pageH - head - 64) / Math.max(30, rowH))));
  }
  function tocChunks() {
    const per = tocPer = rowsPerTocPage();
    const chunks = [];
    for (let i = 0; i < games.length; i += per) chunks.push(games.slice(i, i + per));
    return chunks;
  }

  function build(view) {
    // Keep the reader on the same entry when the layout changes (desktop spread <-> phone page)
    const onGame = view >= tocViews ? view - tocViews : -1;
    mode = spreadQuery.matches ? 'spread' : 'single';
    const chunks = tocChunks();     // measured on the pages still on screen, before they are cleared
    book.textContent = '';
    leaves = [];
    baseL = baseR = null;

    if (mode === 'spread') {
      // Pages in reading order: [endpaper, contents..., (notes), plate 1, text 1, plate 2, text 2, ...]
      const leadCount = 1 + chunks.length + ((1 + chunks.length) % 2);
      tocViews = leadCount / 2;
      const P = [tpl.endpaper(), ...chunks.map((c, i) => tpl.contents(['i', 'ii', 'iii', 'iv'][i] || 'i', c, i + 1, chunks.length))];
      if (P.length % 2) P.push(tpl.notes());
      games.forEach((g, i) => P.push(tpl.plate(g, pad(2 * i + 1)), tpl.text(g, pad(2 * i + 2))));
      baseL = makePage(P[0], 'l');
      baseR = makePage(P[P.length - 1], 'r');
      for (let i = 0; i < P.length / 2 - 1; i++) leaves.push(makeLeaf(P[2 * i + 1], P[2 * i + 2]));
      book.append(baseL, baseR);
    } else {
      tocViews = chunks.length;
      const P = [...chunks.map((c, i) => tpl.contents(['i', 'ii', 'iii', 'iv', 'v'][i] || 'i', c, i + 1, chunks.length)), ...games.map((g, i) => tpl.single(g, pad(i + 1)))];
      baseR = makePage(P[P.length - 1], 'r');
      for (let i = 0; i < P.length - 1; i++) leaves.push(makeLeaf(P[i], tpl.blank()));
      book.append(baseR);
    }
    leaves.forEach(l => book.appendChild(l.el));

    maxF = leaves.length;
    views = [...Array(tocViews)].map((_, i) => (tocViews > 1 ? `Contents ${i + 1}` : 'Contents')).concat(games.map(g => g.title));
    buildDots();
    f = Math.max(0, Math.min(onGame >= 0 ? tocViews + onGame : Math.min(view, tocViews - 1), maxF));
    // Place the sheets without animating
    leaves.forEach((l, i) => {
      l.el.style.transition = 'none';
      l.el.classList.toggle('is-flipped', i < f);
    });
    void book.offsetWidth;
    leaves.forEach(l => { l.el.style.transition = ''; });
    update();
  }

  /* ---------- Rendering state ---------- */
  function visibleFaces() {
    if (mode === 'spread') {
      return [f === 0 ? baseL : leaves[f - 1].back, f === maxF ? baseR : leaves[f].front];
    }
    return [f === maxF ? baseR : leaves[f].front];
  }

  function applyZ() {
    leaves.forEach((l, i) => {
      if (l.el.classList.contains('is-turning') || l.el.classList.contains('is-dragging')) return;
      // Flipped sheets: latest on top of the left stack. Unflipped: first on top of the right stack.
      l.el.style.zIndex = i < f ? i + 1 : maxF - i + 1;
    });
  }

  function update() {
    applyZ();

    const shown = visibleFaces();
    const all = [baseL, baseR, ...leaves.flatMap(l => [l.front, l.back])].filter(Boolean);
    all.forEach(el => {
      const on = shown.includes(el);
      el.inert = !on;
      el.setAttribute('aria-hidden', String(!on));
      el.classList.toggle('is-current', on);
    });

    leaves.forEach((l, i) => {
      l.el.classList.toggle('is-next', i === f);
      l.el.classList.toggle('is-prev', i === f - 1);
      // Sheets buried in a stack are hidden: phones struggle with dozens of 3D layers at once
      l.el.classList.toggle('is-far', i < f - 2 || i > f + 1);
    });

    prevBtn.disabled = f === 0;
    nextBtn.disabled = f === maxF;
    countEl.textContent = `${pad(f + 1)} / ${pad(maxF + 1)}`;
    [...dotsEl.children].forEach((d, i) => d.setAttribute('aria-current', String(i === f)));
    liveEl.textContent = `Page ${f + 1} of ${maxF + 1}: ${views[f]}`;
  }

  /* ---------- Turning ---------- */
  function startTurn(leaf, z) {
    leaf.el.classList.add('is-turning');
    leaf.el.style.zIndex = z;
    // transitionend is the normal path; this covers "no transition" (reduced motion,
    // or a drag released exactly at its resting angle)
    clearTimeout(leaf.timer);
    leaf.timer = setTimeout(() => endTurn(leaf.el), FLIP_MS + 80);
  }

  function endTurn(el) {
    el.classList.remove('is-turning');
    applyZ();
  }

  // Turns to a view. A jump of several pages (contents, dots, counter) does not riffle through every sheet:
  // the sheets in between are moved at once, out of sight, and only the last one turns.
  function turnTo(target) {
    target = Math.max(0, Math.min(target, maxF));
    if (target === f) return;
    const step = target > f ? 1 : -1;
    if (Math.abs(target - f) > 1) {
      const near = target - step;
      leaves.forEach((l, i) => {
        const between = step > 0 ? i >= f && i < near : i >= near && i < f;
        if (!between) return;
        clearTimeout(l.timer);
        l.el.classList.remove('is-turning', 'is-peek');
        l.el.style.transition = 'none';
        l.el.classList.toggle('is-flipped', step > 0);
      });
      f = near;
      applyZ();
      void book.offsetWidth;                       // commit the instant moves before turning the last sheet
      leaves.forEach(l => { l.el.style.transition = ''; });
    }
    const leaf = step > 0 ? leaves[f] : leaves[f - 1];
    f += step;
    startTurn(leaf, 100);
    leaf.el.classList.toggle('is-flipped', step > 0);
    update();
  }

  /* ---------- Dots ---------- */
  /** One dot per view; with many entries the dots are hidden and the counter jumps to the contents. */
  function buildDots() {
    dotsEl.textContent = '';
    dotsEl.hidden = views.length > 10;
    if (dotsEl.hidden) return;
    views.forEach((label, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Go to page ${i + 1}: ${label}`);
      b.addEventListener('click', () => turnTo(i));
      dotsEl.appendChild(b);
    });
  }
  countEl.addEventListener('click', () => turnTo(0));

  prevBtn.addEventListener('click', () => turnTo(f - 1));
  nextBtn.addEventListener('click', () => turnTo(f + 1));

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { turnTo(f + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { turnTo(f - 1); e.preventDefault(); }
  });

  /* ---------- Drag / swipe: the sheet follows the pointer ---------- */
  let drag = null;
  let suppressClick = false;

  book.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, active: false, dir: 0, leaf: null, angle: 0, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  });

  book.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;

    if (!drag.active) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      const dir = dx < 0 ? 1 : -1;
      const leaf = dir > 0 ? leaves[f] : leaves[f - 1];
      if (!leaf || leaf.el.classList.contains('is-turning')) { drag = null; return; }
      Object.assign(drag, { active: true, dir, leaf });
      leaf.el.classList.remove('is-peek');
      leaf.el.classList.add('is-dragging');
      leaf.el.style.zIndex = 200;
      try { book.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }

    const width = book.getBoundingClientRect().width * (mode === 'spread' ? 1 : 1.2);
    const frac = dx / width;
    drag.angle = drag.dir > 0
      ? Math.max(-180, Math.min(0, frac * 180))
      : Math.max(-180, Math.min(0, -180 + frac * 180));
    drag.leaf.el.style.transform = `rotateY(${drag.angle}deg)`;
    drag.leaf.el.style.setProperty('--p', String(-drag.angle / 180));

    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.v = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
  });

  function finishDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;

    if (!d.active) {
      // A tap: turn by page side, unless it landed on a link or button
      if (cancelled || e.target.closest('a, button')) return;
      const r = book.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (x > 0.5) turnTo(f + 1); else turnTo(f - 1);
      return;
    }

    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);

    const done = !cancelled && (d.dir > 0
      ? (d.angle < -70 || d.v < -0.45)
      : (d.angle > -110 || d.v > 0.45));

    const el = d.leaf.el;
    el.classList.remove('is-dragging');
    startTurn(d.leaf, 150);
    el.style.transform = '';
    el.style.removeProperty('--p');
    if (done) {
      f += d.dir;
      el.classList.toggle('is-flipped', d.dir > 0);
      update();
    }
  }

  book.addEventListener('pointerup', e => finishDrag(e, false));
  book.addEventListener('pointercancel', e => finishDrag(e, true));
  book.addEventListener('click', e => {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    const go = e.target.closest('[data-go]');
    if (go) turnTo(Number(go.dataset.go));
  }, true);
  // Images and text should never start a native drag inside the book
  book.addEventListener('dragstart', e => e.preventDefault());

  /* ---------- Layout mode follows the viewport ---------- */
  spreadQuery.addEventListener('change', () => build(f));
  // Rotation or a resized window changes the page height: re-split the contents when a different number of rows fits
  let fitTimer = null;
  const refit = () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => { if (rowsPerTocPage() !== tocPer) build(f); }, 160); };
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', refit);

  /* ---------- Filter: duels (exactly 2 players) or games for 3 and more ---------- */
  const filterEl = document.getElementById('players-filter');
  filterEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-f]');
    if (!b) return;
    filterEl.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const k = b.dataset.f;
    games = allGames.filter(g => k === 'all' || (k === 'duel' ? g.max === 2 : g.max > 2)).map((g, i) => ({ ...g, n: i + 1 }));
    total = games.length;
    build(0);
  });

  build(0);
  if (rowsPerTocPage() !== tocPer) build(0);   // first split was an estimate: redo it with the real row height

  // Hint that the corner lifts
  if (!reduceMotion && leaves[0]) {
    setTimeout(() => {
      if (f !== 0 || drag) return;
      leaves[0].el.classList.add('is-peek');
      setTimeout(() => leaves[0] && leaves[0].el.classList.remove('is-peek'), 700);
    }, 900);
  }
})();
