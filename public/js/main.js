const _ = (id) => document.getElementById(id);
const set = gsap.set;
const ease = "sine.inOut";

let data = [];
let order = [];
let detailsEven = true;
let offsetTop = 200;
let offsetLeft = 700;
const cardWidth = 200;
const cardHeight = 300;
const gap = 40;
const numberSize = 50;
let currentPage = 'work';

function getCard(index) { return `#card${index}`; }
function getCardContent(index) { return `#card-content-${index}`; }
function getSliderItem(index) { return `#slide-item-${index}`; }

function animate(target, duration, properties) {
  return new Promise((resolve) => {
    gsap.to(target, { ...properties, duration, onComplete: resolve });
  });
}

// ── Navigation ────────────────────────────────────────

function setActivePage(page) {
  currentPage = page;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  const aboutEl   = _('about-panel');
  const contactEl = _('contact-panel');

  // Always close the project panel when switching pages
  const projectEl = _('project-panel');
  if (projectEl && projectEl.style.visibility !== 'hidden') {
    closeProjectPage();
  }

  if (page === 'work') {
    gsap.to(aboutEl,   { x: '100%', duration: 0.6, ease, onComplete: () => { aboutEl.style.visibility   = 'hidden'; } });
    gsap.to(contactEl, { x: '100%', duration: 0.6, ease, onComplete: () => { contactEl.style.visibility = 'hidden'; } });
  } else if (page === 'about') {
    aboutEl.style.visibility   = 'visible';
    contactEl.style.visibility = 'hidden';
    gsap.to(aboutEl,   { x: '0%', duration: 0.6, ease });
    gsap.to(contactEl, { x: '100%', duration: 0.6, ease });
  } else if (page === 'contact') {
    contactEl.style.visibility = 'visible';
    aboutEl.style.visibility   = 'hidden';
    gsap.to(contactEl, { x: '0%', duration: 0.6, ease });
    gsap.to(aboutEl,   { x: '100%', duration: 0.6, ease });
  }
}

function initNav() {
  const navLinks = _('nav-links');

  // Hamburger open/close
  _('nav-hamburger').addEventListener('click', () => navLinks.classList.add('open'));
  _('nav-close').addEventListener('click', () => navLinks.classList.remove('open'));

  document.querySelectorAll('.nav-item, .nav-book, .panel-cta[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      navLinks.classList.remove('open');
      setActivePage(btn.dataset.page);
    });
  });
  document.querySelector('.nav-brand').addEventListener('click', () => {
    navLinks.classList.remove('open');
    setActivePage('work');
  });
}

function setFieldError(id, msg) {
  const el = _(id);
  el.classList.toggle('input-error', !!msg);
  const existing = el.parentElement.querySelector('.field-error-msg');
  if (existing) existing.remove();
  if (msg) {
    const p = document.createElement('p');
    p.className = 'field-error-msg';
    p.textContent = msg;
    el.parentElement.appendChild(p);
  }
}

function initInquiryForm() {
  const form      = _('inquiry-form');
  const successEl = _('form-success');
  const errorEl   = _('form-error');

  // Clear error on input
  ['inq-name', 'inq-email', 'inq-message'].forEach(id => {
    _(id).addEventListener('input', () => setFieldError(id, ''));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name    = _('inq-name').value.trim();
    const email   = _('inq-email').value.trim();
    const message = _('inq-message').value.trim();

    // Validate
    let valid = true;
    if (!name)    { setFieldError('inq-name', 'Please enter your name'); valid = false; }
    if (!email)   { setFieldError('inq-email', 'Please enter your email'); valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('inq-email', 'Please enter a valid email'); valid = false; }
    if (!message) { setFieldError('inq-message', 'Please enter a message'); valid = false; }
    if (!valid) return;

    const btn = form.querySelector('.form-submit');
    btn.disabled = true;
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        form.reset();
        successEl.classList.remove('hidden');
      } else {
        errorEl.classList.remove('hidden');
      }
    } catch {
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });
}

// ── Panels ────────────────────────────────────────────

function buildStars(n) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="review-star${i < n ? ' filled' : ''}">★</span>`
  ).join('');
}

const FALLBACK_REVIEWS = [
  { name: 'Sarah Mitchell', role: 'Bride', text: 'Every emotion from our wedding day captured perfectly. The photos are absolutely breathtaking — we relive the entire day every time we look at them.', rating: 5 },
  { name: 'Marcus Webb', role: 'Creative Director', text: 'Working together on our brand campaign was a game changer. The shots had exactly the mood we were going for, delivered fast and with zero stress.', rating: 5 },
  { name: 'Priya Nair', role: 'Portrait Client', text: 'I was nervous in front of the camera but felt completely at ease. The portraits came out better than I ever imagined — truly captured who I am.', rating: 5 },
];

function initReviews(reviews) {
  const section  = _('reviews-section');
  const track    = _('reviews-track');
  const dotsEl   = _('reviews-dots');
  if (!reviews || reviews.length === 0) reviews = FALLBACK_REVIEWS;
  section.classList.remove('hidden');

  track.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-stars">${buildStars(r.rating || 5)}</div>
      <p class="review-text">"${r.text}"</p>
      <div class="review-author">
        <span class="review-name">${r.name}</span>
        <span class="review-role">${r.role}</span>
      </div>
    </div>
  `).join('');

  dotsEl.innerHTML = reviews.map((_, i) =>
    `<button class="review-dot${i === 0 ? ' active' : ''}" data-i="${i}"></button>`
  ).join('');

  let current = 0;
  const cards = track.querySelectorAll('.review-card');
  const dots  = dotsEl.querySelectorAll('.review-dot');

  function goTo(idx) {
    cards[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + cards.length) % cards.length;
    cards[current].classList.add('active');
    dots[current].classList.add('active');
  }

  cards[0].classList.add('active');
  dots.forEach(d => d.addEventListener('click', () => goTo(parseInt(d.dataset.i))));

  let timer = setInterval(() => goTo(current + 1), 5000);
  section.addEventListener('mouseenter', () => clearInterval(timer));
  section.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(current + 1), 5000); });
}

function populatePanels(owner, reviews) {
  // About
  _('about-name').textContent    = owner.name    || '';
  _('about-tagline').textContent = owner.tagline || '';
  _('about-bio').textContent     = owner.bio     || '';

  // About — profile photo
  const photoSide = _('about-photo-wrap');
  const photoImg  = _('about-photo');
  if (owner.profilePhoto) {
    photoImg.src = owner.profilePhoto;
    photoImg.alt = owner.name || '';
    photoSide.classList.remove('hidden');
  } else {
    photoSide.classList.add('hidden');
  }

  // About — availability
  const availEl = _('about-availability');
  availEl.textContent = owner.availability || '';

  // About — reviews carousel
  initReviews(reviews);

  // Contact — email
  const emailEl = _('contact-email');
  if (owner.email) {
    emailEl.textContent = owner.email;
    emailEl.href = `mailto:${owner.email}`;
    emailEl.style.display = 'block';
  } else {
    emailEl.style.display = 'none';
  }

  // Contact — social links
  const linksEl = _('contact-links');
  const socialFields = [
    { key: 'website',   label: 'Website'   },
    { key: 'instagram', label: 'Instagram' },
    { key: 'linkedin',  label: 'LinkedIn'  },
    { key: 'twitter',   label: 'Twitter / X' },
  ];
  linksEl.innerHTML = socialFields
    .filter(s => owner[s.key])
    .map(s => `<a class="contact-link" href="${owner[s.key]}" target="_blank" rel="noopener">${s.label}</a>`)
    .join('');
}

// ── Slider ────────────────────────────────────────────

function buildDOM() {
  const cards = data.map((item, index) =>
    `<div class="card" id="card${index}" style="background-image:url(${item.image})"></div>`
  ).join('');

  const cardContents = data.map((item, index) =>
    `<div class="card-content" id="card-content-${index}">
      <div class="content-start"></div>
      <div class="content-place">${item.category}</div>
      <div class="content-title-1">${item.title}</div>
      <div class="content-title-2">${item.subtitle}</div>
    </div>`
  ).join('');

  const slideNumbers = data.map((_, index) =>
    `<div class="item" id="slide-item-${index}">${index + 1}</div>`
  ).join('');

  _('demo').innerHTML = cards + cardContents;
  _('slide-numbers').innerHTML = slideNumbers;
}

function updateDetailsContent(panelSelector, projectIndex) {
  const project = data[projectIndex];
  const placeText = [project.location, project.category].filter(Boolean).join(' · ');
  document.querySelector(`${panelSelector} .place-box .text`).textContent = placeText;
  document.querySelector(`${panelSelector} .title-1`).textContent = project.title;
  document.querySelector(`${panelSelector} .title-2`).textContent = project.subtitle;
  document.querySelector(`${panelSelector} .desc`).textContent = project.description;
  const discoverEl = document.querySelector(`${panelSelector} .discover`);
  discoverEl.textContent   = project.ctaLabel || 'View Gallery';
  discoverEl.dataset.index = projectIndex;
}

function openProjectPage(projectIndex, pushState = true) {
  const project = data[projectIndex];
  if (!project) return;

  // Update URL hash
  if (pushState) history.pushState({ project: projectIndex }, '', `#project/${projectIndex}`);

  // Header info
  const headerMeta = [project.category, project.company, project.location].filter(Boolean).join(' · ');
  _('project-panel-category').textContent = headerMeta;
  _('project-panel-title-1').textContent  = project.title    || '';
  _('project-panel-title-2').textContent  = project.subtitle || '';
  _('project-panel-desc').textContent     = project.description || '';
  const descBar = _('project-desc-bar');
  descBar.style.display = project.description ? 'block' : 'none';

  // External link button
  const linkEl = _('project-panel-link');
  if (project.link && project.link !== '#') {
    linkEl.href = project.link;
    linkEl.classList.remove('hidden');
  } else {
    linkEl.classList.add('hidden');
  }

  // Build gallery grid
  const galleryEl = _('project-gallery');
  // Normalize gallery items (support both string URLs and {url,company,location} objects)
  const normalize = item => typeof item === 'string' ? { url: item, company: '', location: '' } : item;
  const galleryItems = (project.gallery || []).map(normalize).filter(g => g.url && g.url !== project.image);
  // Prepend the cover image (no metadata)
  const allPhotos = project.image
    ? [{ url: project.image, company: '', location: '' }, ...galleryItems]
    : galleryItems;

  galleryEl.innerHTML = allPhotos.map((photo, i) => {
    const hasCompany  = Boolean(photo.company);
    const hasLocation = Boolean(photo.location);
    const overlay = (hasCompany || hasLocation) ? `<div class="gallery-item-meta">
      ${hasCompany  ? `<span class="caption-company">${photo.company}</span>`   : ''}
      ${hasLocation ? `<span class="caption-location">${photo.location}</span>` : ''}
    </div>` : '';
    return `<div class="gallery-item" data-src="${photo.url}">
       <img src="${photo.url}" alt="${project.title || ''} photo ${i + 1}" loading="lazy" />
       ${overlay}
     </div>`;
  }).join('');

  galleryEl.querySelectorAll('.gallery-item').forEach((item, i) => {
    const photo = allPhotos[i];
    item.addEventListener('click', () => openLightbox(photo.url, photo.company, photo.location));
  });

  const panel = _('project-panel');
  const scroll = panel.querySelector('.project-scroll');
  if (scroll) scroll.scrollTop = 0;
  panel.style.visibility = 'visible';
  gsap.fromTo(panel, { x: '100%' }, { x: '0%', duration: 0.65, ease });
}

function closeProjectPage(pushState = true) {
  if (pushState) history.pushState(null, '', window.location.pathname);
  const panel = _('project-panel');
  gsap.to(panel, {
    x: '100%', duration: 0.55, ease,
    onComplete: () => { panel.style.visibility = 'hidden'; },
  });
}

function openLightbox(src, company = '', location = '') {
  const lb      = _('lightbox');
  const img     = _('lightbox-img');
  const caption = _('lightbox-caption');
  img.src = src;
  caption.innerHTML = [
    company  ? `<span class="caption-company">${company}</span>`   : '',
    location ? `<span class="caption-location">${location}</span>` : '',
  ].join('');
  caption.style.display = (company || location) ? 'flex' : 'none';
  lb.style.display = 'flex';
  gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.25 });
}

function closeLightbox() {
  const lb = _('lightbox');
  gsap.to(lb, { opacity: 0, duration: 0.2, onComplete: () => { lb.style.display = 'none'; } });
}

function init() {
  order = data.map((_, i) => i);
  const [active, ...rest] = order;
  const detailsActive   = detailsEven ? "#details-even" : "#details-odd";
  const detailsInactive = detailsEven ? "#details-odd"  : "#details-even";
  const { innerHeight: height, innerWidth: width } = window;
  offsetTop  = height - 430;
  offsetLeft = width  - 830;

  updateDetailsContent(detailsActive, active);

  gsap.set("#pagination", { top: offsetTop + 330, left: offsetLeft, y: 200, opacity: 0, zIndex: 60 });
  gsap.set("nav", { y: -200, opacity: 0 });

  gsap.set(getCard(active), { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
  gsap.set(getCardContent(active), { x: 0, y: 0, opacity: 0 });
  gsap.set(detailsActive,   { opacity: 0, zIndex: 22, x: -200, top: offsetTop });
  gsap.set(detailsInactive, { opacity: 0, zIndex: 12, top: offsetTop });
  gsap.set(`${detailsInactive} .text`,    { y: 100 });
  gsap.set(`${detailsInactive} .title-1`, { y: 100 });
  gsap.set(`${detailsInactive} .title-2`, { y: 100 });
  gsap.set(`${detailsInactive} .desc`,    { y: 50 });
  gsap.set(`${detailsInactive} .cta`,     { y: 60 });

  gsap.set(".progress-sub-foreground", {
    width: 500 * (1 / order.length) * (active + 1),
  });

  rest.forEach((i, index) => {
    gsap.set(getCard(i), {
      x: offsetLeft + 400 + index * (cardWidth + gap),
      y: offsetTop, width: cardWidth, height: cardHeight, zIndex: 30, borderRadius: 10,
    });
    gsap.set(getCardContent(i), {
      x: offsetLeft + 400 + index * (cardWidth + gap),
      zIndex: 40, y: offsetTop + cardHeight - 100,
    });
    gsap.set(getSliderItem(i), { x: (index + 1) * numberSize });
  });

  gsap.set(".indicator", { x: -window.innerWidth });

  const startDelay = 0.6;

  gsap.to(".cover", {
    opacity: 0, duration: 0.6, delay: 0.5, ease,
    onComplete: () => {
      document.querySelector('.cover').style.display = 'none';
      if (data.length > 1) setTimeout(() => { loop(); }, 500);
    },
  });

  rest.forEach((i, index) => {
    gsap.to(getCard(i),        { x: offsetLeft + index * (cardWidth + gap), zIndex: 30, ease, delay: startDelay });
    gsap.to(getCardContent(i), { x: offsetLeft + index * (cardWidth + gap), zIndex: 40, ease, delay: startDelay });
  });

  gsap.to("#pagination",  { y: 0, opacity: 1, ease, delay: startDelay });
  gsap.to("nav",          { y: 0, opacity: 1, ease, delay: startDelay });
  gsap.to(detailsActive,  { opacity: 1, x: 0, ease, delay: startDelay });
}

let clicks = 0;

function step() {
  return new Promise((resolve) => {
    order.push(order.shift());
    detailsEven = !detailsEven;

    const detailsActive   = detailsEven ? "#details-even" : "#details-odd";
    const detailsInactive = detailsEven ? "#details-odd"  : "#details-even";

    updateDetailsContent(detailsActive, order[0]);

    gsap.set(detailsActive, { zIndex: 22 });
    gsap.to(detailsActive,                { opacity: 1, delay: 0.4, ease });
    gsap.to(`${detailsActive} .text`,     { y: 0, delay: 0.10, duration: 0.7, ease });
    gsap.to(`${detailsActive} .title-1`,  { y: 0, delay: 0.15, duration: 0.7, ease });
    gsap.to(`${detailsActive} .title-2`,  { y: 0, delay: 0.15, duration: 0.7, ease });
    gsap.to(`${detailsActive} .desc`,     { y: 0, delay: 0.30, duration: 0.4, ease });
    gsap.to(`${detailsActive} .cta`,      { y: 0, delay: 0.35, duration: 0.4, onComplete: resolve, ease });
    gsap.set(detailsInactive, { zIndex: 12 });

    const [active, ...rest] = order;
    const prv = rest[rest.length - 1];

    gsap.set(getCard(prv),    { zIndex: 10 });
    gsap.set(getCard(active), { zIndex: 20 });
    gsap.to(getCard(prv), { scale: 1.5, ease });

    gsap.to(getCardContent(active), { y: offsetTop + cardHeight - 10, opacity: 0, duration: 0.3, ease });
    gsap.to(getSliderItem(active),  { x: 0, ease });
    gsap.to(getSliderItem(prv),     { x: -numberSize, ease });
    gsap.to(".progress-sub-foreground", {
      width: 500 * (1 / order.length) * (active + 1), ease,
    });

    gsap.to(getCard(active), {
      x: 0, y: 0, ease,
      width: window.innerWidth, height: window.innerHeight, borderRadius: 0,
      onComplete: () => {
        const xNew = offsetLeft + (rest.length - 1) * (cardWidth + gap);
        gsap.set(getCard(prv), { x: xNew, y: offsetTop, width: cardWidth, height: cardHeight, zIndex: 30, borderRadius: 10, scale: 1 });
        gsap.set(getCardContent(prv), { x: xNew, y: offsetTop + cardHeight - 100, opacity: 1, zIndex: 40 });
        gsap.set(getSliderItem(prv), { x: rest.length * numberSize });
        gsap.set(detailsInactive, { opacity: 0 });
        gsap.set(`${detailsInactive} .text`,    { y: 100 });
        gsap.set(`${detailsInactive} .title-1`, { y: 100 });
        gsap.set(`${detailsInactive} .title-2`, { y: 100 });
        gsap.set(`${detailsInactive} .desc`,    { y: 50 });
        gsap.set(`${detailsInactive} .cta`,     { y: 60 });
        clicks -= 1;
        if (clicks > 0) step();
      },
    });

    rest.forEach((i, index) => {
      if (i !== prv) {
        const xNew = offsetLeft + index * (cardWidth + gap);
        gsap.set(getCard(i), { zIndex: 30 });
        gsap.to(getCard(i),        { x: xNew, y: offsetTop, width: cardWidth, height: cardHeight, ease, delay: 0.1 * (index + 1) });
        gsap.to(getCardContent(i), { x: xNew, y: offsetTop + cardHeight - 100, opacity: 1, zIndex: 40, ease, delay: 0.1 * (index + 1) });
        gsap.to(getSliderItem(i),  { x: (index + 1) * numberSize, ease });
      }
    });
  });
}

function jumpToCard(targetIdx) {
  if (data.length <= 1 || clicks > 0) return;
  const pos = order.indexOf(targetIdx);
  if (pos <= 0) return; // already active or not found

  // Reorder: keep current at [0], put target at [1], rest follow
  const current   = order[0];
  const remaining = order.filter((_, i) => i !== 0 && i !== pos);
  order = [current, targetIdx, ...remaining];

  // Instantly snap non-active cards to their new visual positions
  const [, ...newRest] = order;
  newRest.forEach((i, index) => {
    const xNew = offsetLeft + index * (cardWidth + gap);
    gsap.set(getCard(i),        { x: xNew, y: offsetTop, width: cardWidth, height: cardHeight, zIndex: 30, borderRadius: 10 });
    gsap.set(getCardContent(i), { x: xNew, y: offsetTop + cardHeight - 100, zIndex: 40, opacity: 1 });
    gsap.set(getSliderItem(i),  { x: (index + 1) * numberSize });
  });

  clicks = 1;
  gsap.killTweensOf(".indicator");
  set(".indicator", { x: -window.innerWidth });
  step().then(() => loop());
}

async function loop() {
  await animate(".indicator", 4, { x: 0 });
  await animate(".indicator", 0.8, { x: window.innerWidth, delay: 1.2 });
  set(".indicator", { x: -window.innerWidth });
  await step();
  loop();
}

async function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

function showEmptyState() {
  gsap.to('nav',    { y: 0, opacity: 1, ease, delay: 0.4 });
  gsap.to('.cover', {
    opacity: 0, duration: 0.6, delay: 0.5, ease,
    onComplete: () => {
      document.querySelector('.cover').style.display = 'none';
      _('empty-state').style.display = 'flex';
    },
  });
}

async function start() {
  try {
    const res = await fetch('/api/portfolio');
    const portfolio = await res.json();

    // Apply accent color
    const color = portfolio.settings && portfolio.settings.primaryColor;
    if (color) {
      document.documentElement.style.setProperty('--primary', color);
    }

    const owner   = portfolio.owner   || {};
    const reviews = portfolio.reviews || [];
    data = portfolio.projects || [];

    // Nav name + page title
    if (owner.name) {
      _('nav-name').textContent = owner.name;
      document.title = `${owner.name} — Portfolio`;
    }

    // Panels: let GSAP own the transform from the start
    gsap.set('#about-panel',   { x: '100%' });
    gsap.set('#contact-panel', { x: '100%' });
    gsap.set('#project-panel', { x: '100%' });

    // Populate About + Contact panels
    populatePanels(owner, reviews);

    // Init nav routing + inquiry form
    initNav();
    initInquiryForm();

    _('project-back').addEventListener('click', () => history.back());
    _('lightbox').addEventListener('click', closeLightbox);
    _('lightbox-close').addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });

    // Browser back/forward
    window.addEventListener('popstate', () => {
      const match = window.location.hash.match(/^#project\/(\d+)$/);
      if (match) {
        openProjectPage(parseInt(match[1]), false);
      } else {
        closeProjectPage(false);
      }
    });

    if (data.length === 0) {
      showEmptyState();
      return;
    }

    buildDOM();
    // Preload cover images — 1.5s timeout so slow networks don't block forever
    await Promise.race([
      Promise.all(data.map(p => loadImage(p.image))),
      new Promise(r => setTimeout(r, 1500)),
    ]);
    init();

    // Handle direct URL entry e.g. #project/2
    const hashMatch = window.location.hash.match(/^#project\/(\d+)$/);
    if (hashMatch) {
      const idx = parseInt(hashMatch[1]);
      if (idx >= 0 && idx < data.length) openProjectPage(idx, false);
    }


    // "View Gallery" CTA — open project detail page
    document.querySelectorAll('.discover').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(btn.dataset.index ?? order[0], 10);
        openProjectPage(isNaN(idx) ? order[0] : idx, true);
      });
    });

    // Thumbnail card click — jump directly to that project
    _('demo').addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;
      const idx = parseInt(card.id.replace('card', ''), 10);
      if (idx === order[0]) return; // active card, do nothing
      jumpToCard(idx);
    });

    // Arrow right — advance (only meaningful with 2+ projects)
    document.querySelector('.arrow-right').addEventListener('click', () => {
      if (data.length > 1 && clicks === 0) {
        clicks = 1;
        gsap.killTweensOf(".indicator");
        set(".indicator", { x: -window.innerWidth });
        step().then(() => loop());
      }
    });

    // Arrow left — go back (only meaningful with 2+ projects)
    document.querySelector('.arrow-left').addEventListener('click', () => {
      if (data.length > 1 && clicks === 0) {
        order.unshift(order.pop()); // move last to front
        order.unshift(order.pop()); // adjust so step()'s shift lands correctly
        clicks = 1;
        gsap.killTweensOf(".indicator");
        set(".indicator", { x: -window.innerWidth });
        step().then(() => loop());
      }
    });

  } catch (err) {
    console.error('Failed to load portfolio data:', err);
  }
}

start();
