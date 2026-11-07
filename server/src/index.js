import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { login, requireAdmin } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const str = (v, max) => String(v ?? '').trim().slice(0, max);

// ---------- Public ----------
app.get('/api/lawyers', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lawyers ORDER BY name');
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/articles', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.summary, a.created_at, a.author_id, l.name AS author_name
       FROM articles a LEFT JOIN lawyers l ON l.id = a.author_id
       ORDER BY a.created_at DESC, a.id DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/articles/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, l.name AS author_name
       FROM articles a LEFT JOIN lawyers l ON l.id = a.author_id WHERE a.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Article not found.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// ---------- Admin ----------
app.post('/api/admin/login', login);

app.post('/api/admin/lawyers', requireAdmin, async (req, res, next) => {
  try {
    const name = str(req.body.name, 150);
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const [r] = await pool.query(
      'INSERT INTO lawyers (name, title, practice_area, bio, email, photo_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, str(req.body.title, 150), str(req.body.practice_area, 150),
       str(req.body.bio, 5000), str(req.body.email, 190), str(req.body.photo_url, 500)]
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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
