import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { login, requireAdmin } from './auth.js';

// Built React site (created by `npm run build` at the repo root).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const str = (v, max) => String(v ?? '').trim().slice(0, max);

// ---------- Public ----------
app.get('/api/authors', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, title, practice_area, summary, email, photo_url, created_at FROM authors ORDER BY name'
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
      `SELECT a.id, a.title, a.summary, a.created_at, a.author_id, l.name AS author_name
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
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// ---------- Admin ----------
app.post('/api/admin/login', login);

app.post('/api/admin/authors', requireAdmin, async (req, res, next) => {
  try {
    const name = str(req.body.name, 150);
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const [r] = await pool.query(
      'INSERT INTO authors (name, title, practice_area, summary, description, email, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, str(req.body.title, 150), str(req.body.practice_area, 150),
       str(req.body.summary, 500), str(req.body.description, 10000), str(req.body.email, 190), str(req.body.photo_url, 500)]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

app.post('/api/admin/articles', requireAdmin, async (req, res, next) => {
  try {
    const title = str(req.body.title, 255);
    const content = String(req.body.content ?? '').trim();
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });
    const authorId = req.body.author_id ? Number(req.body.author_id) : null;
    const [r] = await pool.query(
      'INSERT INTO articles (title, summary, content, author_id) VALUES (?, ?, ?, ?)',
      [title, str(req.body.summary, 500), content, Number.isInteger(authorId) ? authorId : null]
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

app.delete('/api/admin/articles/:id', requireAdmin, async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Article not found.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Serve the React site in production, with client-side routes falling back to index.html.
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
