/* ============================
   STATE
   ============================ */
let currentLang = readStore('lang') || 'en';
let typewriterTimer = null;

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
const motion = !reduceMotion && hasGsap;

// Libraries failed to load or the user asked for less motion: show everything as-is
if (!motion) root.classList.remove('motion');
if (hasGsap) gsap.registerPlugin(ScrollTrigger);

/* ============================
   HELPERS
   ============================ */
function get(id) { return document.getElementById(id); }

function getVal(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function readStore(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStore(key, val) {
  try { localStorage.setItem(key, val); } catch { /* private mode */ }
}

function pad(n, len = 2) { return String(n).padStart(len, '0'); }

function applyStaticTranslations(data) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = getVal(data, el.getAttribute('data-i18n'));
    if (val !== undefined) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const val = getVal(data, el.getAttribute('data-i18n-aria'));
    if (val !== undefined) el.setAttribute('aria-label', val);
  });
}

/* Wraps every character in .ch > .ch-i so letters can be wiped in one by one.
   Words stay unbreakable so headlines only wrap between words. */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  text.split(/(\s+)/).forEach(part => {
    if (!part) return;
    if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
    const word = document.createElement('span');
    word.className = 'word';
    word.style.whiteSpace = 'nowrap';
    word.style.display = 'inline-block';
    [...part].forEach(c => {
      const ch = document.createElement('span');
      ch.className = 'ch';
      ch.innerHTML = `<span class="ch-i">${c}</span>`;
      word.appendChild(ch);
    });
    el.appendChild(word);
  });
  // .ch:last-child should mean the last letter of the whole line
  const all = el.querySelectorAll('.ch');
  all.forEach(c => c.classList.remove('is-last'));
  if (all.length) all[all.length - 1].classList.add('is-last');
}

/* Decodes text through random glyphs before settling — the "signal" motif */
function scramble(el, finalText, duration = 700, glyphs = '0123456789') {
  if (!motion) { el.textContent = finalText; return; }
  const start = performance.now();
  function frame(now) {
    const p = Math.min(1, (now - start) / duration);
    const settled = Math.floor(p * finalText.length);
    let out = '';
    for (let i = 0; i < finalText.length; i++) {
      const c = finalText[i];
      out += i < settled || c === ' ' ? c : glyphs[Math.floor(Math.random() * glyphs.length)];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ============================
   RENDER: EDUCATION
   ============================ */
function renderEducation(data) {
  const container = get('education-container');
  if (!container) return;
  const rows = data.about.education.map((item, i) => `
    <li class="edu-row" data-reveal>
      <span class="edu-idx">${pad(i + 1)}</span>
      <span class="edu-org">${item.org || ''}</span>
      <div class="edu-main">
        <h4 class="edu-title">${item.title}</h4>
        <p class="edu-desc">${item.desc}</p>
        ${item.certLink ? `
          <p class="edu-cert">
            <a href="${item.certLink}" target="_blank" rel="noopener" class="link-arrow">${item.certAlt}</a>
          </p>` : ''}
      </div>
    </li>
  `).join('');
  container.innerHTML = `
    <div class="sub-head">
      <span class="mono">(${pad(data.about.education.length)})</span>
      <h3 data-reveal>${data.about.educationHeading}</h3>
    </div>
    <ol class="edu-list">${rows}</ol>
  `;
}

/* ============================
   RENDER: SKILLS
   ============================ */
function renderSkills(data) {
  const container = get('skills-container');
  if (!container) return;
  const cats = data.about.skills.categories.map(cat => `
    <div class="skill-cat" data-reveal>
      <h4 class="skill-label"><span>${cat.label}</span><span>${pad(cat.items.length)}</span></h4>
      <ul class="skill-items">
        ${cat.items.map(it => `<li>${it.text}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="sub-head">
      <span class="mono">(${pad(data.about.skills.categories.length)})</span>
      <h3 data-reveal>${data.about.skills.heading}</h3>
    </div>
    <div class="skills-grid">${cats}</div>
  `;
}

/* ============================
   RENDER: CV
   ============================ */
function renderCV(data) {
  const container = get('cv-container');
  if (!container) return;
  container.innerHTML = data.about.cv.items.map(item => `
    <a href="${item.href}" target="_blank" rel="noopener" class="link-arrow cv-link" data-reveal>${item.label}</a>
  `).join('');
}

/* ============================
   RENDER: EXPERIENCE
   ============================ */
function renderExperience(data) {
  const container = get('experience-container');
  if (!container) return;
  const { jobs, techLabel, softLabel, coursesLabel, publicationsLabel } = data.experience;

  container.innerHTML = jobs.map((job, i) => {
    const techBlock = job.tech ? `
      <div>
        <dt>${techLabel}</dt>
        <dd><ul class="inline-list">${job.tech.map(t => `<li>${t}</li>`).join('')}</ul></dd>
      </div>` : '';

    const coursesBlock = job.courses ? `
      <div class="spec-wide">
        <dt>${coursesLabel}</dt>
        <dd><ol class="course-list">${job.courses.map(c => `<li>${c}</li>`).join('')}</ol></dd>
      </div>` : '';

    const softBlock = job.soft ? `
      <div>
        <dt>${softLabel}</dt>
        <dd><ul class="dot-list">${job.soft.map(s => `<li>${s}</li>`).join('')}</ul></dd>
      </div>` : '';

    const publicationsBlock = job.publications ? `
      <div class="spec-wide">
        <dt>${publicationsLabel}</dt>
        <dd><ul class="pub-list">${job.publications.map(p => `
          <li>
            <a href="${p.url}" target="_blank" rel="noopener">
              <span class="pub-source">${p.source}</span>
              <span class="pub-title">${p.title}</span>
              <span class="pub-arrow" aria-hidden="true">↗</span>
            </a>
          </li>
        `).join('')}</ul></dd>
      </div>` : '';

    const descBlock = job.description ? `
      <p class="job-role">${job.roleLabel}</p>
      <p class="job-desc">${job.description}</p>` : '';

    return `
      <article class="job" data-reveal>
        <div class="job-meta">
          <span class="job-n" aria-hidden="true">${pad(i + 1)}</span>
          <span class="job-date">${job.date}</span>
          <span class="job-loc">${job.location}</span>
        </div>
        <div class="job-body">
          <h3 class="job-title">${job.title}</h3>
          <p class="job-company">${job.company}</p>
          ${descBlock}
          <dl class="job-specs">${techBlock}${softBlock}${coursesBlock}${publicationsBlock}</dl>
        </div>
      </article>
    `;
  }).join('');
}

/* ============================
   RENDER: PROJECTS
   ============================ */
function renderProjects(data) {
  const container = get('projects-container');
  if (!container) return;

  const { items, githubLabel } = data.projects;
  const total = pad(items.length);

  container.innerHTML = items.map((proj, i) => {
    const primary = proj.link || proj.github;
    const external = !proj.link;
    return `
      <article class="project">
        <div class="project-num" aria-hidden="true">${pad(i + 1)}</div>
        <div class="project-body">
          <p class="project-meta"><span>${pad(i + 1)} / ${total}</span><span>${proj.tech[0].text}</span></p>
          <h3 class="project-title">
            <a href="${primary}"${external ? ' target="_blank" rel="noopener"' : ''}>${proj.title}</a>
          </h3>
          <p class="project-desc">${proj.description}</p>
          <p class="project-stack">${proj.tech.map(t => `<span>${t.text}</span>`).join('<span class="sep" aria-hidden="true">·</span>')}</p>
          <div class="project-links">
            ${proj.link ? `<a href="${proj.link}" class="link-arrow">${proj.linkLabel}</a>` : ''}
            ${proj.github ? `<a href="${proj.github}" target="_blank" rel="noopener" class="link-arrow">${githubLabel}</a>` : ''}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/* ============================
   HERO: NAME FIT + ROTATOR
   ============================ */
// Sizes the name so YOUNES spans the full column exactly, at any width
function fitHeroName() {
  const name = document.querySelector('.hero-name');
  const last = document.querySelector('.hero-line--last');
  const stage = document.querySelector('.hero-stage');
  if (!name || !last || !stage) return;
  const current = parseFloat(getComputedStyle(name).fontSize);
  const width = last.getBoundingClientRect().width;
  if (!width) return;
  const size = current * stage.clientWidth / width;
  name.style.fontSize = size + 'px';
  stage.style.setProperty('--name-size', size + 'px');
}

// Shrinks a split headline only when its widest word would overflow (long FR words)
function fitHeadline(el) {
  el.style.fontSize = '';
  const words = el.querySelectorAll('.word');
  const widest = Math.max(0, ...[...words].map(w => w.getBoundingClientRect().width));
  const avail = el.clientWidth;
  if (widest > avail) {
    const current = parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = (current * avail / widest * 0.98) + 'px';
  }
}

// Same idea for plain headings: only kicks in when one word is wider than the column (320px phones)
function fitOverflow(el) {
  el.style.fontSize = '';
  if (el.scrollWidth > el.clientWidth + 1) {
    const current = parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = (current * el.clientWidth / el.scrollWidth * 0.98) + 'px';
  }
}

function fitAll() {
  fitHeroName();
  fitTypewriter();
  document.querySelectorAll('[data-split-text]').forEach(fitHeadline);
  document.querySelectorAll('.section-title, .job-title, .project-title, .edu-title').forEach(fitOverflow);
}

/* ============================
   TYPEWRITER
   Sized from the longest sentence so it always stays on one line,
   and given that sentence's width up front so typing never shifts the layout.
   ============================ */
const TYPER_MAX_PX = 48;

function fitTypewriter() {
  const typer = document.querySelector('.typer');
  const statement = document.querySelector('.hero-statement');
  if (!typer || !statement) return;

  const sentences = SITE_DATA[currentLang].hero.sentences;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;'
    + `font-family:${getComputedStyle(typer).fontFamily}`;
  document.body.appendChild(probe);
  // longest rendered width, plus room for the block cursor
  const widest = Math.max(...sentences.map(s => { probe.textContent = s; return probe.getBoundingClientRect().width; })) + 62;
  probe.remove();

  const size = Math.min(TYPER_MAX_PX, statement.clientWidth / widest * 100);
  typer.style.fontSize = size + 'px';
  typer.style.width = Math.ceil(widest * size / 100) + 'px';
}

function startTypewriter(lang) {
  const el = get('hero-typed');
  const typer = document.querySelector('.typer');
  const sr = get('hero-rotator-sr');
  if (!el) return;
  clearTimeout(typewriterTimer);

  const sentences = SITE_DATA[lang].hero.sentences;
  if (sr) sr.textContent = sentences.join(' — ');
  el.textContent = '';

  // Reduced motion: whole sentences swap in place, no per-letter animation
  if (!motion) {
    let i = 0;
    el.textContent = sentences[0];
    const swap = () => {
      i = (i + 1) % sentences.length;
      el.textContent = sentences[i];
      typewriterTimer = setTimeout(swap, 3200);
    };
    typewriterTimer = setTimeout(swap, 3200);
    return;
  }

  let si = 0, ci = 0, typing = true;
  function loop() {
    const sentence = sentences[si];
    typer.classList.toggle('is-typing', typing && ci < sentence.length);
    if (typing) {
      if (ci < sentence.length) {
        el.textContent += sentence[ci++];
        typewriterTimer = setTimeout(loop, 75);
      } else {
        typing = false;
        typewriterTimer = setTimeout(loop, 1600);
      }
    } else if (ci > 0) {
      el.textContent = sentence.slice(0, --ci);
      typewriterTimer = setTimeout(loop, 38);
    } else {
      typing = true;
      si = (si + 1) % sentences.length;
      typewriterTimer = setTimeout(loop, 500);
    }
  }
  // Begin once the intro curtain has lifted
  typewriterTimer = setTimeout(loop, document.querySelector('.loader') ? 1500 : 300);
}

/* ============================
   RENDER ALL
   ============================ */
function renderAll(lang) {
  const data = SITE_DATA[lang];
  if (!data) return;

  root.setAttribute('dir', data.dir);
  root.setAttribute('lang', data.lang);

  applyStaticTranslations(data);
  renderEducation(data);
  renderSkills(data);
  renderCV(data);
  renderExperience(data);
  renderProjects(data);

  document.querySelectorAll('[data-split-text]').forEach(el => { splitChars(el); fitHeadline(el); });
  updateMenuLabel();
}

/* ============================
   LANGUAGE TOGGLE
   ============================ */
function setLang(lang) {
  currentLang = lang;
  writeStore('lang', lang);
  syncLangButtons();
  renderAll(lang);
  fitAll();
  startTypewriter(lang);
  buildScrollAnimations();
}

function syncLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const on = btn.dataset.lang === currentLang;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on);
  });
}

get('lang-toggle').addEventListener('click', e => {
  const btn = e.target.closest('.lang-btn');
  if (btn && btn.dataset.lang !== currentLang) setLang(btn.dataset.lang);
});

/* ============================
   THEME TOGGLE (initial theme is set inline in <head>)
   ============================ */
const themeMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  if (themeMeta) themeMeta.content = theme === 'dark' ? '#0D0B08' : '#F5F0E8';
}

applyTheme(root.getAttribute('data-theme') || 'dark');

get('theme-toggle').addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  writeStore('theme', next);
});

/* ============================
   PORTRAIT — tap stands in for the desktop hover (tone off / on)
   ============================ */
document.querySelector('.hero-portrait').addEventListener('click', e => {
  e.currentTarget.classList.toggle('is-revealed');
});

/* ============================
   SMOOTH SCROLL (Lenis)
   ============================ */
let lenis = null;

if (motion && typeof window.Lenis !== 'undefined') {
  lenis = new Lenis({ anchors: true, lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ============================
   MENU (phone)
   ============================ */
const hamburger = get('hamburger');
const navLinksList = get('nav-links');

function updateMenuLabel() {
  const label = hamburger.querySelector('.menu-label');
  const open = hamburger.getAttribute('aria-expanded') === 'true';
  label.textContent = SITE_DATA[currentLang].nav[open ? 'close' : 'menu'];
}

function setMenu(open) {
  navLinksList.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
  if (lenis) open ? lenis.stop() : lenis.start();
  updateMenuLabel();
}

hamburger.addEventListener('click', () => {
  setMenu(hamburger.getAttribute('aria-expanded') !== 'true');
});

navLinksList.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navLinksList.classList.contains('open')) {
    setMenu(false);
    hamburger.focus();
  }
});

/* ============================
   NAV: SCROLLED / HIDE ON SCROLL DOWN / PROGRESS / ACTIVE LINK
   ============================ */
const navbar = get('navbar');
const progressBar = get('progress-bar');
let lastY = 0;

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  navbar.classList.toggle('scrolled', y > 40);
  const menuOpen = navLinksList.classList.contains('open');
  navbar.classList.toggle('hidden', !menuOpen && y > lastY && y > window.innerHeight * 0.6);
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });

const navAnchors = document.querySelectorAll('.nav-links a');
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;
    navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('header#home, main section').forEach(s => sectionObserver.observe(s));

/* ============================
   MOTION: INTRO
   ============================ */
function playIntro() {
  const loader = document.querySelector('.loader');
  const count = document.querySelector('.loader-count');
  const chars = document.querySelectorAll('.hero-name .ch-i');

  if (!motion) {
    if (loader) loader.remove();
    return;
  }

  const counter = { v: 0 };
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  tl.to(counter, {
      v: 100, duration: 0.55, ease: 'power2.inOut',
      onUpdate() { count.textContent = pad(Math.round(counter.v), 3); }
    })
    .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.6, ease: 'expo.inOut' }, '+=0.05')
    .set(loader, { display: 'none' })
    .to(chars, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1, stagger: 0.04 }, 0.75)
    .from('.plate', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' }, 0.7)
    .from('.hero-portrait figcaption, .hero-index li, .hero-foot > *', {
      y: 16, opacity: 0, duration: 0.8, stagger: 0.06
    }, 1.05)
    .add(() => {
      document.querySelectorAll('.hero-index-n').forEach((n, i) => scramble(n, `(${pad(i + 1)})`, 500));
    }, 1.05);
}

/* ============================
   MOTION: SCROLL
   Static elements are animated once; rendered content (rebuilt on language
   switch) gets its triggers killed and recreated with each render.
   ============================ */
let dynamicAnims = [];

function track(anim) {
  [].concat(anim).forEach(a => a && dynamicAnims.push(a));
}

function buildStaticAnimations() {
  if (!motion) return;

  // Headings rise out of an invisible clip
  document.querySelectorAll('.section-title').forEach(title => {
    gsap.fromTo(title,
      { clipPath: 'inset(0% 0% 100% 0%)', yPercent: 30 },
      { clipPath: 'inset(0% 0% -20% 0%)', yPercent: 0, duration: 1.1, ease: 'expo.out', clearProps: 'clipPath',
        scrollTrigger: { trigger: title, start: 'top 88%', once: true } });
  });

  // Section numbers decode 000 → 00n
  document.querySelectorAll('.section-num').forEach(num => {
    const final = pad(num.dataset.num, 3);
    num.textContent = '000';
    ScrollTrigger.create({
      trigger: num, start: 'top 90%', once: true,
      onEnter: () => scramble(num, final, 650)
    });
  });

  gsap.fromTo('.about-intro',
    { y: 50, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: '.about-intro', start: 'top 85%', once: true } });
}

function buildScrollAnimations() {
  if (!hasGsap) return;
  dynamicAnims.forEach(a => a.kill());
  dynamicAnims = [];

  // Active row highlight works with or without motion: it stands in for hover on touch screens
  document.querySelectorAll('.job, .project, .edu-row').forEach(el => {
    track(ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'bottom 40%', toggleClass: 'is-active' }));
  });

  if (!motion) return;

  // Rows: staggered rise, batched so siblings entering together cascade
  gsap.set('[data-reveal]', { opacity: 0 });
  track(ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: batch => gsap.fromTo(batch,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true })
  }));

  // Projects slide in from their own side on desktop; on phones everything stays on the centre axis and rises
  const sideways = window.matchMedia('(min-width: 769px)').matches;
  document.querySelectorAll('.project').forEach((proj, i) => {
    const dir = i % 2 === 0 ? -1 : 1;
    const tl = gsap.timeline({ scrollTrigger: { trigger: proj, start: 'top 82%', once: true } });
    tl.fromTo(proj.querySelector('.project-num'),
        sideways ? { xPercent: 18 * dir, clipPath: 'inset(0% 100% 0% 0%)' } : { yPercent: 25, clipPath: 'inset(100% 0% 0% 0%)' },
        { xPercent: 0, yPercent: 0, clipPath: 'inset(0% -10% 0% 0%)', duration: 1.2, ease: 'expo.out', clearProps: 'clipPath' })
      .fromTo(proj.querySelector('.project-body'),
        sideways ? { x: -40 * dir, opacity: 0 } : { y: 40, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }, 0.1);
    track(tl);
  });

  // Footer headline: the letter wipe comes back for the sign-off
  track(gsap.to('.footer-headline .ch-i', {
    clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1, ease: 'expo.out', stagger: 0.035,
    scrollTrigger: { trigger: '.footer-headline', start: 'top 85%', once: true }
  }));

  ScrollTrigger.refresh();
}

/* ============================
   INIT
   ============================ */
syncLangButtons();
renderAll(currentLang);
document.querySelectorAll('.hero-name [data-split]').forEach(splitChars);
startTypewriter(currentLang);
onScroll();

// The typer starts empty, so VT323 would never be requested on its own; ask for it before measuring
const fontsReady = document.fonts
  ? Promise.all([document.fonts.load('48px VT323').catch(() => {}), document.fonts.ready])
  : Promise.resolve();
fontsReady.then(() => {
  fitAll();
  buildStaticAnimations();
  buildScrollAnimations();
});
playIntro();

let resizeTimer;
function onViewportChange() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    fitAll();
    if (hasGsap) ScrollTrigger.refresh();
  }, 120);
}
window.addEventListener('resize', onViewportChange, { passive: true });
window.addEventListener('orientationchange', onViewportChange, { passive: true });
