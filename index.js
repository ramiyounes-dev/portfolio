/* ============================
   STATE
   ============================ */
let currentLang = localStorage.getItem('lang') || 'en';
let typewriterTimer = null;

/* ============================
   HELPERS
   ============================ */
function get(id) { return document.getElementById(id); }

function getVal(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function applyStaticTranslations(data) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = getVal(data, el.getAttribute('data-i18n'));
    if (val !== undefined) el.textContent = val;
  });
}

/* ============================
   RENDER: EDUCATION
   ============================ */
function renderEducation(data) {
  const container = get('education-container');
  if (!container) return;
  container.innerHTML = data.about.education.map(item => `
    <div class="card reveal">
      <i class="${item.icon}"></i>
      <strong>${item.title}</strong> — ${item.org || ''}<br>
      <span style="color:#aaa;font-size:0.92rem">${item.desc}</span>
      ${item.certLink ? `
        <a href="${item.certLink}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px">
          <img src="./assets/AnA/certificate.png" alt="${item.certAlt}" class="icon-size" />
        </a>` : ''}
    </div>
  `).join('');
}

/* ============================
   RENDER: SKILLS
   ============================ */
function renderSkills(data) {
  const container = get('skills-container');
  if (!container) return;
  const cats = data.about.skills.categories.map(cat => `
    <div class="tech-stack">
      <h4 class="category">${cat.label}</h4>
      <ul>
        ${cat.items.map(it => `
          <li>${it.icon ? `<i class="${it.icon}"></i>` : ''}${it.text}</li>
        `).join('')}
      </ul>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="card skills-card reveal">
      <p class="skills-heading">${data.about.skills.heading}</p>
      <div class="skills-grid">${cats}</div>
    </div>
  `;
}

/* ============================
   RENDER: CV
   ============================ */
function renderCV(data) {
  const container = get('cv-container');
  if (!container) return;
  const links = data.about.cv.items.map(item => `
    <div class="cv-container">
      <a href="${item.href}" target="_blank" rel="noopener">
        <i class="fas fa-file-pdf"></i> ${item.label}
      </a>
    </div>
  `).join('');
  container.innerHTML = `<div class="cv-preview reveal">${links}</div>`;
}

/* ============================
   RENDER: EXPERIENCE
   ============================ */
function renderExperience(data) {
  const container = get('experience-container');
  if (!container) return;
  const { jobs, techLabel, softLabel, coursesLabel, publicationsLabel } = data.experience;

  container.innerHTML = jobs.map(job => {
    const techBlock = job.tech ? `
      <p class="section-label">${techLabel}</p>
      <div class="tech-stack">
        <ul>${job.tech.map((t, i) => `
          <li><i class="${job.techIcons?.[i] || 'fas fa-code'}"></i>${t}</li>
        `).join('')}</ul>
      </div>` : '';

    const coursesBlock = job.courses ? `
      <div class="courses">
        <p class="section-label">${coursesLabel}</p>
        <ul>${job.courses.map(c => `
          <li><i class="fas fa-book"></i>${c}</li>
        `).join('')}</ul>
      </div>` : '';

    const softBlock = job.soft ? `
      <p class="section-label">${softLabel}</p>
      <div class="soft-skills">
        <ul>${job.soft.map(s => `<li>${s}</li>`).join('')}</ul>
      </div>` : '';

    const publicationsBlock = job.publications ? `
      <div class="publications">
        <p class="section-label">${publicationsLabel}</p>
        <ul>${job.publications.map(p => `
          <li>
            <a href="${p.url}" target="_blank" rel="noopener">
              <i class="fas fa-file-alt"></i>
              <span><span class="pub-source">${p.source}</span> — ${p.title}</span>
              <i class="fas fa-external-link-alt pub-ext"></i>
            </a>
          </li>
        `).join('')}</ul>
      </div>` : '';

    const descBlock = job.description ? `
      <p class="description">
        <span class="role-label">${job.roleLabel}</span><br>${job.description}
      </p>` : '';

    return `
      <div class="card reveal">
        <h3 class="position">${job.title}</h3>
        <h4 class="company">${job.company}</h4>
        <p class="details">
          <span><i class="fas fa-calendar-alt"></i>${job.date}</span>
          <span><i class="fas fa-map-marker-alt"></i>${job.location}</span>
        </p>
        ${descBlock}${techBlock}${coursesBlock}${softBlock}${publicationsBlock}
      </div>
    `;
  }).join('');
}

/* ============================
   RENDER: PROJECTS
   ============================ */
function renderProjects(data) {
  const container = get('projects-container');
  if (!container) return;
  container.innerHTML = `
    <div class="card coming-soon-card reveal">
      <h3>${data.projects.comingSoon}</h3>
      <p>${data.projects.stayTuned}</p>
    </div>
  `;
}

/* ============================
   RENDER ALL
   ============================ */
function renderAll(lang) {
  const data = SITE_DATA[lang];
  if (!data) return;

  // Direction + lang
  document.documentElement.setAttribute('dir', data.dir);
  document.documentElement.setAttribute('lang', data.lang);

  applyStaticTranslations(data);
  renderEducation(data);
  renderSkills(data);
  renderCV(data);
  renderExperience(data);
  renderProjects(data);

  initReveal();
}

/* ============================
   LANGUAGE TOGGLE
   ============================ */
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  renderAll(lang);
  restartTypewriter(lang);
}

document.getElementById('lang-toggle').addEventListener('click', e => {
  const btn = e.target.closest('.lang-btn');
  if (btn && btn.dataset.lang !== currentLang) setLang(btn.dataset.lang);
});

/* ============================
   TYPEWRITER FONT FITTER
   Measures the longest sentence and shrinks the font size
   until it fits the container width — never clips, never wraps.
   ============================ */
function fitTypewriterFont(sentences) {
  const container = document.querySelector('.typewriter-container');
  if (!container) return;

  const MAX_PX = 24.8; // ~1.55rem cap
  const MIN_PX = 17;   // floor so it stays readable

  // Find the longest sentence (by character count as a proxy)
  const longest = sentences.reduce((a, b) => a.length > b.length ? a : b, '');

  // Measure using an off-screen clone at max size
  const probe = document.createElement('span');
  probe.style.cssText = [
    'position:absolute', 'visibility:hidden', 'white-space:nowrap',
    "font-family:'Courier New',monospace", `font-size:${MAX_PX}px`,
    'pointer-events:none'
  ].join(';');
  probe.textContent = longest + '|'; // include cursor char
  document.body.appendChild(probe);

  const available = container.offsetWidth;
  let size = MAX_PX;

  if (probe.offsetWidth > available) {
    // Scale down proportionally, then clamp to floor
    size = Math.max(MIN_PX, MAX_PX * (available / probe.offsetWidth));
  }

  document.body.removeChild(probe);
  container.style.fontSize = size + 'px';
}

/* ============================
   TYPEWRITER
   ============================ */
function startTypewriter(sentences) {
  const el = get('typewriter-text');
  if (!el) return;

  if (typewriterTimer) clearTimeout(typewriterTimer);
  el.textContent = '';

  let si = 0, ci = 0, typing = true;

  function loop() {
    const sentence = sentences[si];
    if (typing) {
      if (ci < sentence.length) {
        el.textContent += sentence[ci++];
        typewriterTimer = setTimeout(loop, 75);
      } else {
        typing = false;
        typewriterTimer = setTimeout(loop, 1600);
      }
    } else {
      if (ci > 0) {
        el.textContent = sentence.slice(0, --ci);
        typewriterTimer = setTimeout(loop, 38);
      } else {
        typing = true;
        si = (si + 1) % sentences.length;
        typewriterTimer = setTimeout(loop, 500);
      }
    }
  }
  loop();
}

function restartTypewriter(lang) {
  const sentences = SITE_DATA[lang].hero.sentences;
  fitTypewriterFont(sentences);
  startTypewriter(sentences);
}

/* ============================
   SCROLL REVEAL
   ============================ */
let revealObserver = null;

function initReveal() {
  if (revealObserver) revealObserver.disconnect();

  revealObserver = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 70);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.remove('visible');
    revealObserver.observe(el);
  });
}

/* ============================
   ACTIVE NAV ON SCROLL
   ============================ */
const navLinks = document.querySelectorAll('.nav-links li a');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('section, header').forEach(s => sectionObserver.observe(s));

/* ============================
   HAMBURGER MENU
   ============================ */
const hamburger = get('hamburger');
const navLinksList = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinksList.classList.toggle('open');
});

navLinksList.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinksList.classList.remove('open');
  });
});

/* ============================
   SCROLL: PROGRESS + SCROLL-TOP
   ============================ */
const scrollTopBtn = get('scroll-top');
// const progressBar  = get('progress-bar');

window.addEventListener('scroll', () => {
  const scrolled  = window.scrollY;
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  // progressBar.style.width = (scrolled / maxScroll * 100) + '%';
  scrollTopBtn.classList.toggle('visible', scrolled > 400);
}, { passive: true });

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============================
   CURSOR GLOW (desktop — header & footer only)
   ============================ */
const cursorGlow = get('cursor-glow');
if (cursorGlow) {
  const glowZones = () => [
    document.getElementById('home'),
    document.querySelector('.site-footer')
  ].filter(Boolean);

  document.addEventListener('mousemove', e => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top  = e.clientY + 'px';

    // const inZone = glowZones().some(el => {
    //   const r = el.getBoundingClientRect();
    //   return e.clientY >= r.top && e.clientY <= r.bottom
    //       && e.clientX >= r.left && e.clientX <= r.right;
    // });

    // cursorGlow.style.opacity = inZone ? '1' : '0';
    cursorGlow.style.opacity = '1';
  }, { passive: true });
}

/* ============================
   INIT
   ============================ */
renderAll(currentLang);

// Set the correct lang button as active on load
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.classList.toggle('active', btn.dataset.lang === currentLang);
});

// Fit font then start — defer slightly so layout is fully painted
requestAnimationFrame(() => {
  restartTypewriter(currentLang);
});

// Re-fit on resize (debounced)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const sentences = SITE_DATA[currentLang].hero.sentences;
    fitTypewriterFont(sentences);
  }, 120);
}, { passive: true });
