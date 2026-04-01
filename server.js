// Load .env locally; on Vercel env vars are injected directly into process.env
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '.env') });
}
const express  = require('express');
const path     = require('path');
const multer   = require('multer');
const { createClient } = require('@supabase/supabase-js');

// ── Supabase client (server-side only, uses service key) ──────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Multer — memory storage for Supabase uploads ──────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only'));
  },
});

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth     = req.headers['authorization'];
  const password = process.env.ADMIN_PASSWORD || 'admin';
  if (auth === `Bearer ${password}`) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── Defaults (shown on public site when fields are empty) ─────────────────────
const DEFAULTS = {
  owner: {
    name: 'Jordan Lee',
    tagline: 'Photographer & Visual Storyteller',
    bio: 'I capture the moments people forget to notice — the light just before it fades, the laugh between the posed shots, the quiet in a busy place. Based in Los Angeles, available worldwide.',
    availability: 'Available for bookings',
    specialization: 'Portrait & Commercial Photography',
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop',
    email: 'hello@yourname.com',
  },
  projects: [
    { id: 1, category: 'Portrait', company: '', title: 'GOLDEN', subtitle: 'HOUR', location: '', description: 'A series of intimate portraits shot during the final moments of daylight.', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop', link: '#', ctaLabel: 'View Gallery', gallery: [] },
    { id: 2, category: 'Commercial', company: '', title: 'BRAND', subtitle: 'STORIES', location: '', description: 'Product and brand photography for forward-thinking businesses.', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop', link: '#', ctaLabel: 'View Gallery', gallery: [] },
  ],
  reviews: [
    { id: 1, name: 'Sarah Mitchell', role: 'Bride', text: 'Jordan captured every emotion of our wedding day perfectly.', rating: 5 },
    { id: 2, name: 'Marcus Webb', role: 'Creative Director', text: 'Working with Jordan on our brand campaign was a game changer.', rating: 5 },
  ],
};

// ── Helper: read portfolio from Supabase ──────────────────────────────────────
async function readPortfolio() {
  const [ownerRes, projectsRes, reviewsRes] = await Promise.all([
    supabase.from('portfolio_owner').select('*').eq('id', 1).single(),
    supabase.from('projects').select('*').order('sort_order'),
    supabase.from('reviews').select('*').order('sort_order'),
  ]);

  const ownerRow = ownerRes.data || {};
  const owner = {
    name:          ownerRow.name          || '',
    tagline:       ownerRow.tagline       || '',
    bio:           ownerRow.bio           || '',
    availability:  ownerRow.availability  || '',
    specialization:ownerRow.specialization|| '',
    profilePhoto:  ownerRow.profile_photo || '',
    email:         ownerRow.email         || '',
    website:       ownerRow.website       || '',
    instagram:     ownerRow.instagram     || '',
    linkedin:      ownerRow.linkedin      || '',
    twitter:       ownerRow.twitter       || '',
  };
  const settings = { primaryColor: ownerRow.primary_color || '#ecad29' };

  const projects = (projectsRes.data || []).map(p => ({
    id:          p.id,
    category:    p.category   || '',
    company:     p.company    || '',
    title:       p.title      || '',
    subtitle:    p.subtitle   || '',
    location:    p.location   || '',
    description: p.description|| '',
    image:       p.image      || '',
    link:        p.link       || '#',
    ctaLabel:    p.cta_label  || 'View Gallery',
    gallery:     p.gallery    || [],
  }));

  const reviews = (reviewsRes.data || []).map(r => ({
    id:     r.id,
    name:   r.name   || '',
    role:   r.role   || '',
    text:   r.text   || '',
    rating: r.rating || 5,
  }));

  return { owner, settings, projects, reviews };
}

// ── GET /api/portfolio ────────────────────────────────────────────────────────
app.get('/api/portfolio', async (req, res) => {
  try {
    const data = await readPortfolio();
    if (req.query.raw === '1') return res.json(data);

    // Public: merge defaults for empty fields
    const owner = { ...data.owner };
    Object.keys(DEFAULTS.owner).forEach(key => {
      if (!owner[key]) owner[key] = DEFAULTS.owner[key];
    });
    const projects = data.projects.length > 0 ? data.projects : DEFAULTS.projects;
    const reviews  = data.reviews.length  > 0 ? data.reviews  : DEFAULTS.reviews;
    res.json({ ...data, owner, projects, reviews });
  } catch (err) {
    console.error('GET /api/portfolio error:', err);
    res.status(500).json({ error: 'Could not read portfolio data' });
  }
});

// ── PUT /api/portfolio ────────────────────────────────────────────────────────
app.put('/api/portfolio', requireAuth, async (req, res) => {
  try {
    const { owner = {}, settings = {}, projects = [], reviews = [] } = req.body;

    // Upsert owner row
    await supabase.from('portfolio_owner').upsert({
      id:             1,
      name:           owner.name           || '',
      tagline:        owner.tagline        || '',
      bio:            owner.bio            || '',
      availability:   owner.availability   || '',
      specialization: owner.specialization || '',
      profile_photo:  owner.profilePhoto   || '',
      email:          owner.email          || '',
      website:        owner.website        || '',
      instagram:      owner.instagram      || '',
      linkedin:       owner.linkedin       || '',
      twitter:        owner.twitter        || '',
      primary_color:  settings.primaryColor|| '#ecad29',
    });

    // Replace all projects
    await supabase.from('projects').delete().neq('id', 0);
    if (projects.length > 0) {
      await supabase.from('projects').insert(
        projects.map((p, i) => ({
          id:          p.id,
          category:    p.category    || '',
          company:     p.company     || '',
          title:       p.title       || '',
          subtitle:    p.subtitle    || '',
          location:    p.location    || '',
          description: p.description || '',
          image:       p.image       || '',
          link:        p.link        || '#',
          cta_label:   p.ctaLabel    || 'View Gallery',
          sort_order:  i,
          gallery:     p.gallery     || [],
        }))
      );
    }

    // Replace all reviews
    await supabase.from('reviews').delete().neq('id', 0);
    if (reviews.length > 0) {
      await supabase.from('reviews').insert(
        reviews.map((r, i) => ({
          id:         r.id,
          name:       r.name   || '',
          role:       r.role   || '',
          text:       r.text   || '',
          rating:     r.rating || 5,
          sort_order: i,
        }))
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/portfolio error:', err);
    res.status(500).json({ error: 'Could not save portfolio data' });
  }
});

// ── POST /api/auth ────────────────────────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { password }    = req.body;
  const adminPassword   = process.env.ADMIN_PASSWORD || 'admin';
  if (password === adminPassword) {
    res.json({ success: true, token: adminPassword });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// ── POST /api/contact ─────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'All fields required' });
  try {
    await supabase.from('messages').insert({
      id:      Date.now(),
      name,
      email,
      message,
      read:    false,
      date:    new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/contact error:', err);
    res.status(500).json({ error: 'Could not save message' });
  }
});

// ── GET /api/messages ─────────────────────────────────────────────────────────
app.get('/api/messages', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase.from('messages').select('*').order('date', { ascending: false });
    res.json(data || []);
  } catch (err) {
    console.error('GET /api/messages error:', err);
    res.status(500).json({ error: 'Could not load messages' });
  }
});

// ── PATCH /api/messages/:id ───────────────────────────────────────────────────
app.patch('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    await supabase.from('messages').update({ read: true }).eq('id', parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/messages error:', err);
    res.status(500).json({ error: 'Could not update message' });
  }
});

// ── POST /api/upload ──────────────────────────────────────────────────────────
app.post('/api/upload', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const ext      = path.extname(req.file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const { error } = await supabase.storage
      .from('uploads')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype });
    if (error) throw error;
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/uploads/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 15 MB)' });
  if (err.message === 'Images only')  return res.status(415).json({ error: 'Images only (JPG, PNG, GIF, WebP)' });
  next(err);
});

// ── Admin route ───────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Local dev only — Vercel uses module.exports
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Sidearm running at http://localhost:${PORT}`);
    console.log(`Admin panel at http://localhost:${PORT}/admin`);
  });
}

module.exports = app;
