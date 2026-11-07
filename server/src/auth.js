import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function login(req, res) {
  const { password } = req.body || {};
  if (!process.env.ADMIN_PASSWORD || !secret) {
    return res.status(500).json({ error: 'Server is missing ADMIN_PASSWORD or JWT_SECRET.' });
  }
  if (!password || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  res.json({ token: jwt.sign({ role: 'admin' }, secret, { expiresIn: '8h' }) });
}

export function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'Admin login required.' });
  }
}
