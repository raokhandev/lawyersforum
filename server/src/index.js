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

// Article list columns, shared by the Articles list and the area-of-law pages.
const ARTICLE_LIST_SQL = `SELECT a.id, a.title, a.summary, a.image_url, a.tile_image_url, a.created_at, a.author_id, a.home_slot,
    l.name AS author_name
  FROM articles a LEFT JOIN authors l ON l.id = a.author_id`;

app.get('/api/articles', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`${ARTICLE_LIST_SQL} ORDER BY a.created_at DESC, a.id DESC`);
    res.json(rows);
  } catch (e) { next(e); }
});

// The ways articles are grouped: areas of law and jurisdictions. Each article can be in several of each; each group
// has a page and appears in the site menu. Keyed by the URL path. Table/column names are fixed here (never user input)
// and passed to queries as ?? identifiers.
const TAXONOMIES = {
  'practice-areas': {
    table: 'practice_areas', link: 'article_practice_areas', fk: 'practice_area_id', field: 'practice_area_ids',
    out: 'practice_areas', order: 'name', one: 'area of law', many: 'areas of law', Title: 'Area of law',
  },
  jurisdictions: {
    table: 'jurisdictions', link: 'article_jurisdictions', fk: 'jurisdiction_id', field: 'jurisdiction_ids',
    out: 'jurisdictions', order: 'sort_order', one: 'jurisdiction', many: 'jurisdictions', Title: 'Jurisdiction',
  },
};

for (const [route, t] of Object.entries(TAXONOMIES)) {
  // The full list, in menu order (the site menu and the article form use it).
  app.get(`/api/${route}`, async (_req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT id, name, slug FROM ?? ORDER BY ??, name', [t.table, t.order]);
      res.json(rows);
    } catch (e) { next(e); }
  });

  // One group and its articles, newest first.
  app.get(`/api/${route}/:slug`, async (req, res, next) => {
    try {
      const [[group]] = await pool.query('SELECT id, name, slug FROM ?? WHERE slug = ?', [t.table, req.params.slug]);
      if (!group) return res.status(404).json({ error: `${t.Title} not found.` });
      const [articles] = await pool.query(
        `${ARTICLE_LIST_SQL} JOIN ?? g ON g.article_id = a.id
         WHERE g.?? = ? ORDER BY a.created_at DESC, a.id DESC`, [t.link, t.fk, group.id]
      );
      res.json({ ...group, articles });
    } catch (e) { next(e); }
  });
}

app.get('/api/articles/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, DATE_FORMAT(a.created_at, '%Y-%m-%d') AS published_date, l.name AS author_name
       FROM articles a LEFT JOIN authors l ON l.id = a.author_id WHERE a.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Article not found.' });
    const article = rows[0];
    for (const t of Object.values(TAXONOMIES)) {
      const [groups] = await pool.query(
        'SELECT g.id, g.name, g.slug FROM ?? l JOIN ?? g ON g.id = l.?? WHERE l.article_id = ? ORDER BY g.??, g.name',
        [t.link, t.table, t.fk, article.id, t.order]
      );
      article[t.out] = groups;
    }
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

// Checks the article form fields shared by create and update. Returns { error } or { values }.
async function articleValues(body) {
  const title = str(body.title, 255);
  if (!title) return { error: 'Please enter a title.' };

  const authorId = Number(body.author_id);
  if (!Number.isInteger(authorId) || authorId < 1) return { error: 'Please choose an author.' };
  const [[author]] = await pool.query('SELECT id FROM authors WHERE id = ?', [authorId]);
  if (!author) return { error: 'That author no longer exists.' };

  // At least one area of law and one jurisdiction. groups = { practice_areas: [ids], jurisdictions: [ids] }.
  const groups = {};
  for (const t of Object.values(TAXONOMIES)) {
    const ids = [...new Set((Array.isArray(body[t.field]) ? body[t.field] : []).map(Number))];
    if (!ids.length) return { error: `Please choose at least one ${t.one}.` };
    if (ids.some((n) => !Number.isInteger(n) || n < 1)) return { error: `Invalid ${t.one}.` };
    const [found] = await pool.query('SELECT id FROM ?? WHERE id IN (?)', [t.table, ids]);
    if (found.length !== ids.length) return { error: `One of the chosen ${t.many} no longer exists.` };
    groups[t.out] = ids;
  }

  const date = String(body.published_at || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: 'Please choose a publication date.' };

  const imageUrl = str(body.image_url, 500);
  if (!imageUrl) return { error: 'Please choose the article image (top of the article).' };
  const tileImageUrl = str(body.tile_image_url, 500);
  if (!tileImageUrl) return { error: 'Please choose the article tile image (background of the article button).' };

  // The article is HTML from the button editor; keep only the safe tags.
  const content = cleanHtml(body.content);
  if (isEmptyHtml(content)) return { error: 'Please write the article.' };

  return { values: { title, summary: str(body.summary, 500), imageUrl, tileImageUrl, content, authorId, groups, date } };
}

// Replace an article's areas of law and jurisdictions (inside the caller's transaction).
async function setArticleGroups(conn, articleId, groups) {
  for (const t of Object.values(TAXONOMIES)) {
    await conn.query('DELETE FROM ?? WHERE article_id = ?', [t.link, articleId]);
    await conn.query('INSERT INTO ?? (article_id, ??) VALUES ?', [t.link, t.fk, groups[t.out].map((id) => [articleId, id])]);
  }
}

app.post('/api/admin/articles', requireAdmin, async (req, res, next) => {
  let conn;
  try {
    const { error, values: v } = await articleValues(req.body);
    if (error) return res.status(400).json({ error });
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO articles (title, summary, image_url, tile_image_url, content, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [v.title, v.summary, v.imageUrl, v.tileImageUrl, v.content, v.authorId, `${v.date} 12:00:00`]
    );
    await setArticleGroups(conn, r.insertId, v.groups);
    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (e) { if (conn) await conn.rollback(); next(e); } finally { if (conn) conn.release(); }
});

app.put('/api/admin/articles/:id', requireAdmin, async (req, res, next) => {
  let conn;
  try {
    const { error, values: v } = await articleValues(req.body);
    if (error) return res.status(400).json({ error });
    conn = await pool.getConnection();
    await conn.beginTransaction();
    // The publication time is only changed if the date was changed (so saving a fix keeps the article's position).
    const [r] = await conn.query(
      `UPDATE articles SET title = ?, summary = ?, image_url = ?, tile_image_url = ?, content = ?, author_id = ?,
         created_at = IF(DATE(created_at) = ?, created_at, CONCAT(?, ' 12:00:00'))
       WHERE id = ?`,
      [v.title, v.summary, v.imageUrl, v.tileImageUrl, v.content, v.authorId, v.date, v.date, req.params.id]
    );
    if (!r.affectedRows) { await conn.rollback(); return res.status(404).json({ error: 'Article not found.' }); }
    await setArticleGroups(conn, Number(req.params.id), v.groups);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { if (conn) await conn.rollback(); next(e); } finally { if (conn) conn.release(); }
});

// Add an area of law or jurisdiction: body { name }. Returns the new one (or the existing one if the name is already
// there). New jurisdictions get the default sort order, so they are listed alphabetically below the pinned ones.
for (const [route, t] of Object.entries(TAXONOMIES)) {
  app.post(`/api/admin/${route}`, requireAdmin, async (req, res, next) => {
    try {
      const name = str(req.body.name, 100).replace(/\s+/g, ' ');
      if (!name) return res.status(400).json({ error: `Please enter the name of the ${t.one}.` });
      const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
      if (!slug) return res.status(400).json({ error: 'The name needs at least one letter or number.' });
      // Names are compared case-insensitively (the column's collation), so "employment" matches "Employment".
      const [[existing]] = await pool.query('SELECT id, name, slug FROM ?? WHERE name = ? OR slug = ?', [t.table, name, slug]);
      if (existing) return res.json({ ...existing, existed: true });
      const [r] = await pool.query('INSERT INTO ?? (name, slug) VALUES (?, ?)', [t.table, name, slug]);
      res.status(201).json({ id: r.insertId, name, slug });
    } catch (e) { next(e); }
  });

  // Admin list, in menu order, with how many articles use each one (and how many use only that one, so would be
  // left with none if it were deleted).
  app.get(`/api/admin/${route}`, requireAdmin, async (_req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT g.id, g.name, g.slug,
           (SELECT COUNT(*) FROM ?? l WHERE l.?? = g.id) AS article_count,
           (SELECT COUNT(*) FROM ?? l WHERE l.?? = g.id
              AND (SELECT COUNT(*) FROM ?? o WHERE o.article_id = l.article_id) = 1) AS only_count
         FROM ?? g ORDER BY g.??, g.name`,
        [t.link, t.fk, t.link, t.fk, t.link, t.table, t.order]
      );
      res.json(rows);
    } catch (e) { next(e); }
  });

  // Delete one (e.g. added by mistake). Its articles are kept; they just stop being listed under it.
  app.delete(`/api/admin/${route}/:id`, requireAdmin, async (req, res, next) => {
    try {
      const [r] = await pool.query('DELETE FROM ?? WHERE id = ?', [t.table, req.params.id]);
      if (!r.affectedRows) return res.status(404).json({ error: `${t.Title} not found.` });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
}

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
