import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import crypto from 'node:crypto';
import multer from 'multer';
import { imageSize } from 'image-size';
import { login, requireAdmin } from './auth.js';
import { runMigrations } from './migrate.js';
import { cleanHtml, looksLikeHtml, isEmptyHtml } from './html.js';

// Built React site (created by `npm run build` at the repo root).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

await runMigrations();

const app = express();
app.set('trust proxy', 1); // behind Railway's proxy: use the real https host for absolute URLs
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------- Image uploads ----------
// Where uploaded images are stored. On Railway, attach a volume: its mount path is picked up automatically.
// Set UPLOAD_DIR to override. Without either, images go to server/uploads (not kept across deploys on Railway).
const uploadDir = path.resolve(
  process.env.UPLOAD_DIR
    || (process.env.RAILWAY_VOLUME_MOUNT_PATH && path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads'))
    || path.join(path.dirname(fileURLToPath(import.meta.url)), '../uploads')
);
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/api/uploads', express.static(uploadDir, { maxAge: 0, etag: true }));

const MB = 1024 * 1024;
export const IMAGE_RULES = {
  types: { jpg: 'jpg', jpeg: 'jpg', png: 'png', webp: 'webp' },
  author: { maxMB: 2, minW: 400, minH: 500, maxW: 4000, maxH: 4000 },
  // Top-of-article image, also the link-preview image (so at least 1200 x 630).
  article: { maxMB: 5, minW: 1200, minH: 630, maxW: 4000, maxH: 4000 },
  // Background of the article tile.
  tile: { maxMB: 5, minW: 800, minH: 450, maxW: 4000, maxH: 4000 },
};
// Multer's hard cap is the largest allowed size; each kind's own limit is checked below.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * MB, files: 1 } });

app.post('/api/admin/upload', requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    try {
      const rule = IMAGE_RULES[req.query.kind];
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
          ? `File is too large. The maximum size is ${rule ? rule.maxMB : 5} MB.` : 'Upload failed.';
        return res.status(400).json({ error: msg });
      }
      if (!rule) return res.status(400).json({ error: 'Unknown image kind.' });
      if (!req.file) return res.status(400).json({ error: 'No file received.' });
      if (req.file.size > rule.maxMB * MB) {
        return res.status(400).json({ error: `File is too large. The maximum size is ${rule.maxMB} MB.` });
      }
      let info;
      try { info = imageSize(req.file.buffer); } catch { info = null; }
      const ext = info && IMAGE_RULES.types[info.type];
      if (!ext) return res.status(400).json({ error: 'Only JPG, PNG or WebP images are allowed.' });
      if (info.width < rule.minW || info.height < rule.minH) {
        return res.status(400).json({ error: `Image is too small (${info.width}×${info.height}). Minimum is ${rule.minW}×${rule.minH} px.` });
      }
      if (info.width > rule.maxW || info.height > rule.maxH) {
        return res.status(400).json({ error: `Image is too large (${info.width}×${info.height}). Maximum is ${rule.maxW}×${rule.maxH} px.` });
      }
      const name = `${crypto.randomUUID()}.${ext}`;
      await fs.promises.writeFile(path.join(uploadDir, name), req.file.buffer);
      res.status(201).json({ url: `/api/uploads/${name}` });
    } catch (e) { next(e); }
  });
});

const str = (v, max) => String(v ?? '').trim().slice(0, max);

// ---------- Public ----------
app.get('/api/authors', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, title, practice_area, summary, email, photo_url, sort_order, created_at FROM authors ORDER BY sort_order, name'
    );
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/authors/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM authors WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Author not found.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.get('/api/articles', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.summary, a.image_url, a.tile_image_url, a.created_at, a.author_id, a.home_slot, l.name AS author_name
       FROM articles a LEFT JOIN authors l ON l.id = a.author_id
       ORDER BY a.created_at DESC, a.id DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/articles/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, l.name AS author_name
       FROM articles a LEFT JOIN authors l ON l.id = a.author_id WHERE a.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Article not found.' });
    const article = rows[0];
    if (looksLikeHtml(article.content)) article.content = cleanHtml(article.content);
    res.json(article);
  } catch (e) { next(e); }
});

// ---------- Admin ----------
app.post('/api/admin/login', login);

// Author fields shared by create and update. Returns { error } or { values } (in column order).
function authorValues(body) {
  const name = str(body.name, 150);
  if (!name) return { error: 'Name is required.' };
  return {
    values: [name, str(body.title, 150), str(body.practice_area, 150), str(body.summary, 700),
      str(body.description, 10000), str(body.email, 190), str(body.photo_url, 500)],
  };
}

app.post('/api/admin/authors', requireAdmin, async (req, res, next) => {
  try {
    const { error, values } = authorValues(req.body);
    if (error) return res.status(400).json({ error });
    // New authors go to the end of the About Us list.
    const [[{ next: sortOrder }]] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM authors');
    const [r] = await pool.query(
      'INSERT INTO authors (name, title, practice_area, summary, description, email, photo_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [...values, sortOrder]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

// Save the About Us order: body { ids: [authorId, ...] } in display order. (Defined before /:id on purpose.)
app.put('/api/admin/authors/order', requireAdmin, async (req, res, next) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : null;
  if (!ids || !ids.length || ids.some((n) => !Number.isInteger(n)) || new Set(ids).size !== ids.length) {
    return res.status(400).json({ error: 'ids must be a list of unique author ids.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < ids.length; i++) {
      await conn.query('UPDATE authors SET sort_order = ? WHERE id = ?', [i + 1, ids[i]]);
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

app.put('/api/admin/authors/:id', requireAdmin, async (req, res, next) => {
  try {
    const { error, values } = authorValues(req.body);
    if (error) return res.status(400).json({ error });
    const [r] = await pool.query(
      'UPDATE authors SET name = ?, title = ?, practice_area = ?, summary = ?, description = ?, email = ?, photo_url = ? WHERE id = ?',
      [...values, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Author not found.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.post('/api/admin/articles', requireAdmin, async (req, res, next) => {
  try {
    const title = str(req.body.title, 255);
    if (!title) return res.status(400).json({ error: 'Please enter a title.' });

    const authorId = Number(req.body.author_id);
    if (!Number.isInteger(authorId) || authorId < 1) return res.status(400).json({ error: 'Please choose an author.' });
    const [[author]] = await pool.query('SELECT id FROM authors WHERE id = ?', [authorId]);
    if (!author) return res.status(400).json({ error: 'That author no longer exists.' });

    const date = String(req.body.published_at || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      return res.status(400).json({ error: 'Please choose a publication date.' });
    }

    const imageUrl = str(req.body.image_url, 500);
    if (!imageUrl) return res.status(400).json({ error: 'Please choose the article image (top of the article).' });
    const tileImageUrl = str(req.body.tile_image_url, 500);
    if (!tileImageUrl) return res.status(400).json({ error: 'Please choose the article tile image (background of the article button).' });

    // The article is HTML from the button editor; keep only the safe tags.
    const content = cleanHtml(req.body.content);
    if (isEmptyHtml(content)) return res.status(400).json({ error: 'Please write the article.' });

    const [r] = await pool.query(
      'INSERT INTO articles (title, summary, image_url, tile_image_url, content, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, str(req.body.summary, 500), imageUrl, tileImageUrl, content, authorId, `${date} 12:00:00`]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

app.delete('/api/admin/authors/:id', requireAdmin, async (req, res, next) => {
  try {
    // Their articles are kept; the FK sets author_id to NULL.
    const [r] = await pool.query('DELETE FROM authors WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Author not found.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const HOME_SLOTS = ['featured', 'left1', 'left2', 'bottom1', 'bottom2', 'bottom3'];

// Pin an article to a home page slot (or unpin with slot: null). A slot holds one article.
app.put('/api/admin/articles/:id/slot', requireAdmin, async (req, res, next) => {
  const slot = req.body.slot || null;
  if (slot !== null && !HOME_SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[found]] = await conn.query('SELECT id FROM articles WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!found) { await conn.rollback(); return res.status(404).json({ error: 'Article not found.' }); }
    if (slot) await conn.query('UPDATE articles SET home_slot = NULL WHERE home_slot = ?', [slot]);
    await conn.query('UPDATE articles SET home_slot = ? WHERE id = ?', [slot, req.params.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

app.delete('/api/admin/articles/:id', requireAdmin, async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Article not found.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Serve the React site in production, with client-side routes falling back to index.html.
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  // Article pages get their own title and link-preview tags (Open Graph / Twitter). The preview image is the article's
  // top image. Social sites read these tags from the HTML, so they are added here on the server.
  const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  app.get('/articles/:id', async (req, res, next) => {
    try {
      let html = await fs.promises.readFile(path.join(clientDist, 'index.html'), 'utf8');
      const [rows] = await pool.query('SELECT title, summary, image_url FROM articles WHERE id = ?', [req.params.id]);
      if (rows.length) {
        const a = rows[0];
        const origin = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        const absolute = (u) => (u ? (/^https?:\/\//i.test(u) ? u : origin + u) : '');
        const title = `${a.title} | Lawyers Forum`;
        const description = a.summary || 'Legal insight from the people who practise it.';
        const tags = [
          ['og:type', 'article'], ['og:site_name', 'Lawyers Forum'], ['og:title', a.title], ['og:description', description],
          ['og:url', `${origin}/articles/${req.params.id}`], ['og:image', absolute(a.image_url)],
        ].filter(([, v]) => v).map(([k, v]) => `<meta property="${k}" content="${escapeHtml(v)}" />`);
        tags.push(`<meta name="twitter:card" content="${a.image_url ? 'summary_large_image' : 'summary'}" />`);
        tags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`).replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
      }
      res.type('html').send(html);
    } catch (e) { next(e); }
  });
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
