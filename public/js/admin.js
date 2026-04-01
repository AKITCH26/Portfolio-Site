let token = sessionStorage.getItem('sidearm_token');
let portfolioData = { owner: {}, settings: { primaryColor: '#ecad29' }, projects: [], reviews: [] };
let editingId = null;
let currentGallery = [];
let editingReviewId = null;
let currentRating = 5;

const $ = (id) => document.getElementById(id);

// ── Auth ──────────────────────────────────────────────

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = $('password-input').value;
  $('login-error').classList.add('hidden');

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const { token: t } = await res.json();
      token = t;
      sessionStorage.setItem('sidearm_token', t);
      await loadPortfolio();
      showDashboard();
    } else {
      $('login-error').classList.remove('hidden');
    }
  } catch {
    $('login-error').classList.remove('hidden');
  }
});

$('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('sidearm_token');
  token = null;
  $('dashboard').classList.add('hidden');
  $('login-screen').classList.remove('hidden');
});

// ── Boot ──────────────────────────────────────────────

async function boot() {
  if (token) {
    const valid = await loadPortfolio();
    if (valid) { showDashboard(); return; }
    sessionStorage.removeItem('sidearm_token');
    token = null;
  }
  $('login-screen').classList.remove('hidden');
}

async function loadPortfolio() {
  try {
    const res = await fetch('/api/portfolio?raw=1');
    if (!res.ok) return false;
    portfolioData = await res.json();
    return true;
  } catch {
    return false;
  }
}

// Save only the portfolio data (projects/reviews/settings/owner) to server
async function savePortfolio(silent = false) {
  try {
    const res = await fetch('/api/portfolio', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(portfolioData),
    });
    if (res.ok) { if (!silent) showToast('save-toast'); }
    else showToast('error-toast');
  } catch { showToast('error-toast'); }
}

function showDashboard() {
  $('login-screen').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
  populateProfile();
  populateSettings();
  renderProjects();
}

// ── Navigation ───────────────────────────────────────

const sectionMeta = {
  profile:    { title: 'Profile',     desc: 'Your personal info shown across the portfolio' },
  projects:   { title: 'Projects',    desc: 'Manage the work showcased in the slider' },
  settings:   { title: 'Appearance',  desc: 'Customize the look and feel of your portfolio' },
  reviews:    { title: 'Reviews',     desc: 'Client testimonials shown on the About page' },
  messages:   { title: 'Messages',    desc: 'Inquiries sent through the contact form' },
};

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    $(`section-${section}`).classList.remove('hidden');
    $('section-title').textContent = sectionMeta[section].title;
    $('section-desc').textContent = sectionMeta[section].desc;
    if (section === 'messages') loadMessages();
    if (section === 'reviews') renderReviews();
  });
});

// ── Profile ───────────────────────────────────────────

function populateProfile() {
  const { owner } = portfolioData;
  $('owner-name').value          = owner.name          || '';
  $('owner-tagline').value       = owner.tagline       || '';
  $('owner-bio').value           = owner.bio           || '';
  $('owner-availability').value  = owner.availability  || '';
  $('owner-specialization').value= owner.specialization|| '';
  $('owner-profile-photo').value = owner.profilePhoto  || '';
  updateProfilePhotoPreview(owner.profilePhoto || '');
  $('owner-email').value         = owner.email         || '';
  $('owner-website').value       = owner.website       || '';
  $('owner-instagram').value     = owner.instagram     || '';
  $('owner-linkedin').value      = owner.linkedin      || '';
  $('owner-twitter').value       = owner.twitter       || '';
}

function updateProfilePhotoPreview(url) {
  const img = $('profile-photo-img');
  const placeholder = $('profile-photo-placeholder');
  if (url) {
    img.src = url;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    img.style.display = 'none';
    placeholder.style.display = 'block';
  }
}

// Profile photo URL input → live preview
$('owner-profile-photo').addEventListener('input', (e) => {
  updateProfilePhotoPreview(e.target.value.trim());
});

// Profile photo file upload
$('profile-photo-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) throw new Error('Upload failed');
    const { url } = await res.json();
    $('owner-profile-photo').value = url;
    updateProfilePhotoPreview(url);
    collectProfile();
    collectSettings();
    await savePortfolio(true);
  } catch (err) {
    alert('Photo upload failed. Please try again.');
  }
  e.target.value = '';
});

function collectProfile() {
  portfolioData.owner = {
    name:           $('owner-name').value.trim(),
    tagline:        $('owner-tagline').value.trim(),
    bio:            $('owner-bio').value.trim(),
    availability:   $('owner-availability').value.trim(),
    specialization: $('owner-specialization').value.trim(),
    profilePhoto:   $('owner-profile-photo').value.trim(),
    email:          $('owner-email').value.trim(),
    website:        $('owner-website').value.trim(),
    instagram:      $('owner-instagram').value.trim(),
    linkedin:       $('owner-linkedin').value.trim(),
    twitter:        $('owner-twitter').value.trim(),
  };
}

// ── Settings ──────────────────────────────────────────

function populateSettings() {
  const color = (portfolioData.settings && portfolioData.settings.primaryColor) || '#ecad29';
  applyColorInputs(color);
}

function applyColorInputs(color) {
  $('settings-color').value      = color;
  $('settings-color-text').value = color;
  $('color-preview').style.background = color;
}

function collectSettings() {
  portfolioData.settings = {
    primaryColor: $('settings-color').value,
  };
}

$('settings-color').addEventListener('input', () => {
  const color = $('settings-color').value;
  $('settings-color-text').value = color;
  $('color-preview').style.background = color;
});

$('settings-color-text').addEventListener('input', () => {
  const val = $('settings-color-text').value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    $('settings-color').value = val;
    $('color-preview').style.background = val;
  }
});

document.querySelectorAll('.color-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    applyColorInputs(btn.dataset.color);
  });
});

// ── Projects ──────────────────────────────────────────

function renderProjects() {
  const list = $('projects-list');
  if (portfolioData.projects.length === 0) {
    list.innerHTML = `<div class="empty-state-msg">
      <p>No projects yet — visitors see sample work until you add your own.</p>
      <button class="btn-secondary load-samples-btn" data-type="projects">Load sample projects to edit</button>
    </div>`;
    list.querySelector('.load-samples-btn').addEventListener('click', loadSampleProjects);
    return;
  }
  list.innerHTML = portfolioData.projects.map(p => `
    <div class="project-card" data-id="${p.id}">
      <img class="project-thumb" src="${p.image || ''}" alt="" onerror="this.style.display='none'" />
      <div class="project-info">
        <div class="proj-category">${escHtml(p.category || '')}</div>
        <div class="proj-name">${escHtml(p.title || '')} ${escHtml(p.subtitle || '')}</div>
        <div class="proj-desc">${escHtml(p.description || '')}</div>
      </div>
      <div class="project-actions">
        <button class="btn-icon edit-btn" data-id="${p.id}" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
        <button class="btn-icon danger delete-btn" data-id="${p.id}" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.id)));
  });
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteProject(parseInt(btn.dataset.id)));
  });
}

function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  portfolioData.projects = portfolioData.projects.filter(p => p.id !== id);
  renderProjects();
  savePortfolio(true);
}

// ── Modal ─────────────────────────────────────────────

$('add-project-btn').addEventListener('click', () => openModal(null));
$('modal-close').addEventListener('click', closeModal);
$('modal-cancel').addEventListener('click', closeModal);

// ── Image input: URL field ────────────────────────────
$('project-image').addEventListener('input', () => {
  const url = $('project-image').value.trim();
  if (url) {
    showImagePreview(url);
  } else {
    clearImagePreview();
  }
});

// ── Image input: file picker ──────────────────────────
$('project-image-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) uploadFile(file);
  e.target.value = '';
});

// ── Image input: drag and drop ────────────────────────
const dropZone = $('image-drop-zone');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  $('image-placeholder').classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  $('image-placeholder').classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  $('image-placeholder').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) uploadFile(file);
});

// ── Image remove button ───────────────────────────────
$('image-remove-btn').addEventListener('click', () => {
  $('project-image').value = '';
  clearImagePreview();
});

// ── Upload helpers ────────────────────────────────────
async function uploadFile(file) {
  $('image-placeholder').classList.add('hidden');
  $('image-preview').classList.add('hidden');
  $('upload-progress').classList.remove('hidden');
  $('upload-status-text').textContent = 'Uploading…';

  try {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }

    const { url } = await res.json();
    $('project-image').value = url;
    $('upload-progress').classList.add('hidden');
    showImagePreview(url);
  } catch (err) {
    $('upload-progress').classList.add('hidden');
    $('image-placeholder').classList.remove('hidden');
    $('upload-status-text').textContent = err.message;
    showToast('error-toast');
  }
}

function showImagePreview(url) {
  $('image-placeholder').classList.add('hidden');
  $('upload-progress').classList.add('hidden');
  $('preview-img').src = url;
  $('image-preview').classList.remove('hidden');
}

function clearImagePreview() {
  $('image-preview').classList.add('hidden');
  $('upload-progress').classList.add('hidden');
  $('image-placeholder').classList.remove('hidden');
  $('preview-img').src = '';
}

// ── Gallery ───────────────────────────────────────────

function normalizeGalleryItem(item) {
  if (typeof item === 'string') return { url: item, company: '', location: '' };
  return { url: item.url || '', company: item.company || '', location: item.location || '' };
}

function renderGalleryThumbs() {
  const container = $('gallery-thumbs');
  if (currentGallery.length === 0) {
    container.innerHTML = '<p class="gallery-empty">No photos yet.</p>';
    return;
  }
  container.innerHTML = currentGallery.map((item, i) => {
    const { url, company, location } = normalizeGalleryItem(item);
    return `
    <div class="gallery-thumb-item" data-index="${i}">
      <img src="${url}" alt="Gallery photo ${i + 1}" />
      <div class="gallery-thumb-meta">
        <input type="text" class="thumb-company" data-index="${i}" placeholder="Company / Client" value="${escHtml(company)}" />
        <input type="text" class="thumb-location" data-index="${i}" placeholder="Location" value="${escHtml(location)}" />
      </div>
      <button type="button" class="gallery-thumb-remove" data-index="${i}" title="Remove">×</button>
    </div>`;
  }).join('');

  container.querySelectorAll('.thumb-company').forEach(input => {
    input.addEventListener('input', () => {
      currentGallery[parseInt(input.dataset.index)].company = input.value;
    });
  });
  container.querySelectorAll('.thumb-location').forEach(input => {
    input.addEventListener('input', () => {
      currentGallery[parseInt(input.dataset.index)].location = input.value;
    });
  });
  container.querySelectorAll('.gallery-thumb-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      currentGallery.splice(parseInt(btn.dataset.index), 1);
      renderGalleryThumbs();
    });
  });
}

async function uploadGalleryFile(file) {
  const status = $('gallery-upload-status');
  status.textContent = `Uploading ${file.name}…`;
  status.classList.remove('hidden');
  try {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const { url } = await res.json();
    currentGallery.push({ url, company: '', location: '' });
    renderGalleryThumbs();
  } catch (err) {
    showToast('error-toast');
  } finally {
    status.classList.add('hidden');
  }
}

$('gallery-file-input').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) await uploadGalleryFile(file);
  e.target.value = '';
});

$('gallery-url-add').addEventListener('click', () => {
  const input = $('gallery-url-input');
  const url = input.value.trim();
  if (!url) return;
  currentGallery.push({ url, company: '', location: '' });
  input.value = '';
  renderGalleryThumbs();
});

$('gallery-url-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('gallery-url-add').click(); }
});

function openModal(id) {
  editingId = id;
  $('modal-title').textContent = id === null ? 'Add Project' : 'Edit Project';
  clearImagePreview();
  currentGallery = [];

  if (id !== null) {
    const p = portfolioData.projects.find(x => x.id === id);
    if (!p) return;
    $('project-id').value          = p.id;
    $('project-category').value    = p.category    || '';
    $('project-company').value     = p.company     || '';
    $('project-title').value       = p.title       || '';
    $('project-subtitle').value    = p.subtitle    || '';
    $('project-location').value    = p.location    || '';
    $('project-description').value = p.description || '';
    $('project-image').value       = p.image       || '';
    $('project-link').value        = p.link        || '';
    $('project-cta-label').value   = p.ctaLabel    || '';
    currentGallery = Array.isArray(p.gallery) ? p.gallery.map(normalizeGalleryItem) : [];
    if (p.image) showImagePreview(p.image);
  } else {
    ['project-category','project-company','project-title','project-subtitle','project-location',
     'project-description','project-image','project-link','project-cta-label'].forEach(f => { $(f).value = ''; });
  }
  renderGalleryThumbs();

  $('project-modal').classList.remove('hidden');
}

function closeModal() {
  $('project-modal').classList.add('hidden');
  editingId = null;
  clearImagePreview();
}

$('modal-save').addEventListener('click', () => {
  const project = {
    id:          editingId !== null ? editingId : Date.now(),
    category:    $('project-category').value.trim(),
    company:     $('project-company').value.trim(),
    title:       $('project-title').value.trim(),
    subtitle:    $('project-subtitle').value.trim(),
    location:    $('project-location').value.trim(),
    description: $('project-description').value.trim(),
    image:       $('project-image').value.trim(),
    link:        $('project-link').value.trim() || '#',
    ctaLabel:    $('project-cta-label').value.trim() || 'View Gallery',
    gallery:     [...currentGallery],
  };

  if (editingId !== null) {
    const idx = portfolioData.projects.findIndex(p => p.id === editingId);
    if (idx !== -1) portfolioData.projects[idx] = project;
  } else {
    portfolioData.projects.push(project);
  }

  renderProjects();
  closeModal();
  savePortfolio();
});

// Close modal on overlay click
$('project-modal').addEventListener('click', (e) => {
  if (e.target === $('project-modal')) closeModal();
});

// ── Save ──────────────────────────────────────────────

$('save-btn').addEventListener('click', saveAll);

async function saveAll() {
  collectProfile();
  collectSettings();
  await savePortfolio();
}

function showToast(id) {
  const el = $(id);
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2800);
}

// ── Messages ──────────────────────────────────────────

async function loadMessages() {
  const list = $('messages-list');
  list.innerHTML = '<p style="color:#6b7280;font-size:14px;padding:8px 0;">Loading…</p>';
  try {
    const res = await fetch('/api/messages', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    const messages = await res.json();

    // Update unread badge
    const unread = messages.filter(m => !m.read).length;
    const badge = $('unread-badge');
    if (unread > 0) {
      badge.textContent = unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    if (messages.length === 0) {
      list.innerHTML = '<p style="color:#6b7280;font-size:14px;padding:8px 0;">No messages yet.</p>';
      return;
    }

    list.innerHTML = messages.map(m => `
      <div class="message-card ${m.read ? '' : 'unread'}" data-id="${m.id}">
        <div class="message-header">
          <div>
            <span class="message-name">${escHtml(m.name)}</span>
            <span class="message-email">&lt;${escHtml(m.email)}&gt;</span>
          </div>
          <div class="message-meta">
            <span class="message-date">${new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            ${!m.read ? `<button class="mark-read-btn" data-id="${m.id}">Mark read</button>` : '<span class="read-label">Read</span>'}
          </div>
        </div>
        <p class="message-body">${escHtml(m.message)}</p>
      </div>
    `).join('');

    list.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await fetch(`/api/messages/${id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        loadMessages();
      });
    });
  } catch {
    list.innerHTML = '<p style="color:#f87171;font-size:14px;padding:8px 0;">Failed to load messages.</p>';
  }
}

// ── Reviews ───────────────────────────────────────────

function renderReviews() {
  const list = $('reviews-list');
  const reviews = portfolioData.reviews || [];
  if (reviews.length === 0) {
    list.innerHTML = `<div class="empty-state-msg">
      <p>No reviews yet — visitors see sample reviews until you add your own.</p>
      <button class="btn-secondary load-samples-btn">Load sample reviews to edit</button>
    </div>`;
    list.querySelector('.load-samples-btn').addEventListener('click', loadSampleReviews);
    return;
  }
  list.innerHTML = reviews.map(r => `
    <div class="project-card" data-id="${r.id}">
      <div class="project-info">
        <div class="proj-category">${'★'.repeat(r.rating || 5)}</div>
        <div class="proj-name">${escHtml(r.name)} <span style="font-weight:400;color:#6b7280">— ${escHtml(r.role || '')}</span></div>
        <div class="proj-desc">${escHtml(r.text || '')}</div>
      </div>
      <div class="project-actions">
        <button class="btn-icon edit-review-btn" data-id="${r.id}" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
        <button class="btn-icon danger delete-review-btn" data-id="${r.id}" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.edit-review-btn').forEach(btn => {
    btn.addEventListener('click', () => openReviewModal(parseInt(btn.dataset.id)));
  });
  list.querySelectorAll('.delete-review-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this review?')) return;
      portfolioData.reviews = (portfolioData.reviews || []).filter(r => r.id !== parseInt(btn.dataset.id));
      renderReviews();
      savePortfolio(true);
    });
  });
}

function setStarPicker(val) {
  currentRating = val;
  $('review-rating').value = val;
  document.querySelectorAll('.star-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.val) <= val);
  });
}

document.querySelectorAll('.star-btn').forEach(btn => {
  btn.addEventListener('click', () => setStarPicker(parseInt(btn.dataset.val)));
});

function openReviewModal(id) {
  editingReviewId = id;
  $('review-modal-title').textContent = id === null ? 'Add Review' : 'Edit Review';
  if (id !== null) {
    const r = (portfolioData.reviews || []).find(x => x.id === id);
    if (!r) return;
    $('review-id').value   = r.id;
    $('review-name').value = r.name  || '';
    $('review-role').value = r.role  || '';
    $('review-text').value = r.text  || '';
    setStarPicker(r.rating || 5);
  } else {
    ['review-name','review-role','review-text'].forEach(f => { $(f).value = ''; });
    setStarPicker(5);
  }
  $('review-modal').classList.remove('hidden');
}

function closeReviewModal() {
  $('review-modal').classList.add('hidden');
  editingReviewId = null;
}

$('add-review-btn').addEventListener('click', () => openReviewModal(null));
$('review-modal-close').addEventListener('click', closeReviewModal);
$('review-modal-cancel').addEventListener('click', closeReviewModal);
$('review-modal').addEventListener('click', (e) => { if (e.target === $('review-modal')) closeReviewModal(); });

$('review-modal-save').addEventListener('click', () => {
  const review = {
    id:     editingReviewId !== null ? editingReviewId : Date.now(),
    name:   $('review-name').value.trim(),
    role:   $('review-role').value.trim(),
    text:   $('review-text').value.trim(),
    rating: currentRating,
  };
  if (!portfolioData.reviews) portfolioData.reviews = [];
  if (editingReviewId !== null) {
    const idx = portfolioData.reviews.findIndex(r => r.id === editingReviewId);
    if (idx !== -1) portfolioData.reviews[idx] = review;
  } else {
    portfolioData.reviews.push(review);
  }
  renderReviews();
  closeReviewModal();
  savePortfolio();
});

// ── Sample data ───────────────────────────────────────

const SAMPLE_PROJECTS = [
  { id: Date.now() + 1, category: 'Portrait', title: 'GOLDEN', subtitle: 'HOUR', description: 'A series of intimate portraits shot during the final moments of daylight. Natural light, raw emotion, and quiet details that last forever.', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop', link: '#', ctaLabel: 'View Gallery', gallery: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&auto=format&fit=crop'] },
  { id: Date.now() + 2, category: 'Commercial', title: 'BRAND', subtitle: 'STORIES', description: 'Product and brand photography for forward-thinking businesses. Clean compositions, bold lighting, and visuals that make people stop scrolling.', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop', link: '#', ctaLabel: 'View Gallery', gallery: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=1200&auto=format&fit=crop'] },
  { id: Date.now() + 3, category: 'Wedding', title: 'FOREVER', subtitle: 'MOMENTS', description: 'Wedding photography that tells your whole story — from the quiet morning light to the last song of the night. Every detail, every glance, every laugh.', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop', link: '#', ctaLabel: 'View Gallery', gallery: ['https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&auto=format&fit=crop'] },
  { id: Date.now() + 4, category: 'Landscape', title: 'OPEN', subtitle: 'WORLD', description: 'Nature and travel photography from the road less taken. Mountains, coasts, and skies that remind you how big everything really is.', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop', link: '#', ctaLabel: 'View Gallery', gallery: ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&auto=format&fit=crop'] },
];

const SAMPLE_REVIEWS = [
  { id: Date.now() + 10, name: 'Sarah Mitchell', role: 'Bride', text: 'Every emotion from our wedding day captured perfectly. The photos are absolutely breathtaking — we relive the entire day every time we look at them.', rating: 5 },
  { id: Date.now() + 11, name: 'Marcus Webb', role: 'Creative Director', text: 'Working together on our brand campaign was a game changer. The shots had exactly the mood we were going for, delivered fast and with zero stress.', rating: 5 },
  { id: Date.now() + 12, name: 'Priya Nair', role: 'Portrait Client', text: 'I was so nervous in front of the camera but felt completely at ease. The final photos look like they belong in a magazine.', rating: 5 },
];

function loadSampleProjects() {
  if (!confirm('Load 4 sample projects? You can edit or delete them after.')) return;
  portfolioData.projects = SAMPLE_PROJECTS.map((p, i) => ({ ...p, id: Date.now() + i }));
  renderProjects();
  savePortfolio();
}

function loadSampleReviews() {
  if (!confirm('Load 3 sample reviews? You can edit or delete them after.')) return;
  portfolioData.reviews = SAMPLE_REVIEWS.map((r, i) => ({ ...r, id: Date.now() + i }));
  renderReviews();
  savePortfolio();
}

// ── Utils ─────────────────────────────────────────────

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Start ─────────────────────────────────────────────

boot();
