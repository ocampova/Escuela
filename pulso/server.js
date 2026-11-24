// Pulso: servidor HTTP sin dependencias externas (Node 22.5+).
// Autenticación con contraseña (scrypt), sesiones en SQLite, datos separados por usuario,
// control de versiones para evitar sobrescrituras entre ventanas.
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateMeasurement, validateProfile, validatePlan, applyPlanOp, newPlan, measurementsCsv,
  validateBackup, BACKUP_FORMAT, BACKUP_VERSION, MEASUREMENT_TYPES,
} from './public/js/logic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const MAX_BODY = 2 * 1024 * 1024;
const SESSION_DAYS = 30;

export function createApp({ dbPath = process.env.PULSO_DB || path.join(__dirname, 'data', 'pulso.db'), secureCookies = process.env.PULSO_SECURE_COOKIES === '1' } = {}) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pass TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS docs (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      data TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, kind)
    );
    CREATE TABLE IF NOT EXISTS measurements (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      measured_at TEXT NOT NULL,
      data TEXT NOT NULL,
      version INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_m_user ON measurements(user_id, type, measured_at);
  `);

  const q = {
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    insertUser: db.prepare('INSERT INTO users (email, pass, created_at) VALUES (?, ?, ?)'),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
    session: db.prepare('SELECT s.user_id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    purgeSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
    getDoc: db.prepare('SELECT data, version, updated_at FROM docs WHERE user_id = ? AND kind = ?'),
    insertDoc: db.prepare('INSERT INTO docs (user_id, kind, data, version, updated_at) VALUES (?, ?, ?, 1, ?)'),
    updateDoc: db.prepare('UPDATE docs SET data = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND kind = ? AND version = ?'),
    upsertDoc: db.prepare('INSERT INTO docs (user_id, kind, data, version, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(user_id, kind) DO UPDATE SET data = excluded.data, version = docs.version + 1, updated_at = excluded.updated_at'),
    listM: db.prepare('SELECT id, type, measured_at, data, version, updated_at FROM measurements WHERE user_id = ? ORDER BY measured_at DESC'),
    getM: db.prepare('SELECT id, type, measured_at, data, version, updated_at FROM measurements WHERE id = ? AND user_id = ?'),
    insertM: db.prepare('INSERT INTO measurements (id, user_id, type, measured_at, data, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'),
    updateM: db.prepare('UPDATE measurements SET measured_at = ?, data = ?, version = version + 1, updated_at = ? WHERE id = ? AND user_id = ? AND version = ?'),
    deleteM: db.prepare('DELETE FROM measurements WHERE id = ? AND user_id = ? AND version = ?'),
    deleteAllM: db.prepare('DELETE FROM measurements WHERE user_id = ?'),
    habitOnDate: db.prepare("SELECT id FROM measurements WHERE user_id = ? AND type = 'habit' AND substr(measured_at, 1, 10) = ? AND id <> ?"),
    deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
  };

  const loginAttempts = new Map(); // clave -> { count, until }

  const now = () => new Date().toISOString();
  const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

  function hashPassword(pw) {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
    return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
  }
  function verifyPassword(pw, stored) {
    const [, s, k] = stored.split('$');
    const key = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(k, 'base64');
    return expected.length === key.length && crypto.timingSafeEqual(expected, key);
  }
  const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

  function startSession(res, userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expires = Date.now() + SESSION_DAYS * 86400 * 1000;
    q.insertSession.run(hashToken(token), userId, expires);
    q.purgeSessions.run(Date.now());
    setCookie(res, token, SESSION_DAYS * 86400);
  }
  function setCookie(res, value, maxAge) {
    res.setHeader('Set-Cookie', `pulso_sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`);
  }
  function getToken(req) {
    const m = /(?:^|;\s*)pulso_sid=([A-Za-z0-9_-]+)/.exec(req.headers.cookie || '');
    return m ? m[1] : null;
  }
  function currentUser(req) {
    const t = getToken(req);
    if (!t) return null;
    const row = q.session.get(hashToken(t), Date.now());
    return row ? { id: row.user_id, email: row.email } : null;
  }

  const readDoc = (uid, kind) => {
    const r = q.getDoc.get(uid, kind);
    return r ? { data: JSON.parse(r.data), version: r.version, updated_at: r.updated_at } : null;
  };
  const rowToM = (r) => ({ id: r.id, type: r.type, measured_at: r.measured_at, data: JSON.parse(r.data), version: r.version, updated_at: r.updated_at });

  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
  }

  // ---------- Rutas API ----------
  async function api(req, res, url) {
    const method = req.method;
    const p = url.pathname;

    // Protección CSRF: toda escritura exige un encabezado propio y un Origin coincidente.
    if (method !== 'GET' && method !== 'HEAD') {
      if (req.headers['x-pulso'] !== '1') return send(res, 403, { error: 'Solicitud rechazada.' });
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'Origen no permitido.' });
    }

    if (p === '/api/auth/register' && method === 'POST') {
      const b = await body(req);
      const email = String(b.email || '').trim().toLowerCase();
      const pw = String(b.password || '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return send(res, 400, { error: 'Escribí un correo válido.', field: 'email' });
      if (pw.length < 8 || pw.length > 200) return send(res, 400, { error: 'La contraseña debe tener al menos 8 caracteres.', field: 'password' });
      if (q.userByEmail.get(email)) return send(res, 409, { error: 'Ya existe una cuenta con ese correo. Iniciá sesión.', field: 'email' });
      const r = q.insertUser.run(email, hashPassword(pw), now());
      startSession(res, Number(r.lastInsertRowid));
      return send(res, 201, { ok: true });
    }
    if (p === '/api/auth/login' && method === 'POST') {
      const b = await body(req);
      const email = String(b.email || '').trim().toLowerCase();
      const key = `${req.socket.remoteAddress}|${email}`;
      const att = loginAttempts.get(key);
      if (att && att.count >= 8 && att.until > Date.now()) {
        return send(res, 429, { error: 'Demasiados intentos. Esperá 15 minutos e intentá de nuevo.' });
      }
      const u = q.userByEmail.get(email);
      const ok = verifyPassword(String(b.password || ''), u ? u.pass : DUMMY_HASH) && !!u;
      if (!ok) {
        const n = att && att.until > Date.now() ? att.count + 1 : 1;
        loginAttempts.set(key, { count: n, until: Date.now() + 15 * 60 * 1000 });
        return send(res, 401, { error: 'Correo o contraseña incorrectos.' });
      }
      loginAttempts.delete(key);
      startSession(res, u.id);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/auth/logout' && method === 'POST') {
      const t = getToken(req);
      if (t) q.deleteSession.run(hashToken(t));
      setCookie(res, '', 0);
      return send(res, 200, { ok: true });
    }

    const user = currentUser(req);
    if (!user) return send(res, 401, { error: 'Tu sesión terminó. Iniciá sesión de nuevo.' });

    if (p === '/api/me' && method === 'GET') {
      return send(res, 200, { user: { email: user.email }, profile: readDoc(user.id, 'profile'), plan: readDoc(user.id, 'plan') });
    }

    if (p === '/api/profile' && method === 'PUT') {
      const b = await body(req);
      const v = validateProfile(b.data);
      if (!v.ok) return send(res, 400, { error: 'Revisá los datos marcados.', errors: v.errors });
      const json = JSON.stringify(v.value);
      const cur = readDoc(user.id, 'profile');
      if (!cur) {
        q.insertDoc.run(user.id, 'profile', json, now());
        // Primer perfil: crear el plan semanal con las alergias declaradas.
        if (!readDoc(user.id, 'plan')) q.insertDoc.run(user.id, 'plan', JSON.stringify(newPlan(v.value.allergies)), now());
      } else {
        const r = q.updateDoc.run(json, now(), user.id, 'profile', Number(b.version));
        if (r.changes === 0) return send(res, 409, { error: 'El perfil cambió en otra ventana o dispositivo.', current: cur });
      }
      return send(res, 200, { profile: readDoc(user.id, 'profile'), plan: readDoc(user.id, 'plan') });
    }

    if (p === '/api/plan' && method === 'PATCH') {
      const b = await body(req);
      const ops = Array.isArray(b.ops) ? b.ops.slice(0, 50) : [];
      const result = tx(() => {
        const cur = readDoc(user.id, 'plan');
        let plan = cur ? cur.data : newPlan(readDoc(user.id, 'profile')?.data?.allergies || []);
        for (const op of ops) plan = applyPlanOp(plan, op);
        q.upsertDoc.run(user.id, 'plan', JSON.stringify(plan), now());
        return readDoc(user.id, 'plan');
      });
      return send(res, 200, { plan: result });
    }

    if (p === '/api/measurements' && method === 'GET') {
      return send(res, 200, { measurements: q.listM.all(user.id).map(rowToM) });
    }
    if (p === '/api/measurements' && method === 'POST') {
      const b = await body(req);
      const v = validateMeasurement(b.type, b.measured_at, b.data);
      if (!v.ok) return send(res, 400, { error: 'Revisá los datos marcados.', errors: v.errors });
      if (b.type === 'habit') {
        const dup = q.habitOnDate.get(user.id, b.measured_at.slice(0, 10), '');
        if (dup) return send(res, 409, { error: 'Ya registraste hábitos para ese día. Editá el registro existente.', id: dup.id });
      }
      const id = crypto.randomUUID();
      q.insertM.run(id, user.id, b.type, b.measured_at, JSON.stringify(v.value), now(), now());
      return send(res, 201, { measurement: rowToM(q.getM.get(id, user.id)) });
    }
    const mm = /^\/api\/measurements\/([0-9a-f-]{36})$/.exec(p);
    if (mm) {
      const id = mm[1];
      const cur = q.getM.get(id, user.id);
      if (!cur) return send(res, 404, { error: 'Ese registro no existe o fue eliminado.' });
      if (method === 'PUT') {
        const b = await body(req);
        const v = validateMeasurement(cur.type, b.measured_at, b.data);
        if (!v.ok) return send(res, 400, { error: 'Revisá los datos marcados.', errors: v.errors });
        if (cur.type === 'habit' && q.habitOnDate.get(user.id, b.measured_at.slice(0, 10), id)) return send(res, 409, { error: 'Ya hay un registro de hábitos para ese día.' });
        const r = q.updateM.run(b.measured_at, JSON.stringify(v.value), now(), id, user.id, Number(b.version));
        if (r.changes === 0) return send(res, 409, { error: 'Este registro cambió en otra ventana o dispositivo.', current: rowToM(cur) });
        return send(res, 200, { measurement: rowToM(q.getM.get(id, user.id)) });
      }
      if (method === 'DELETE') {
        const r = q.deleteM.run(id, user.id, Number(url.searchParams.get('version')));
        if (r.changes === 0) return send(res, 409, { error: 'Este registro cambió en otra ventana. Revisalo antes de eliminarlo.', current: rowToM(cur) });
        return send(res, 200, { ok: true });
      }
    }

    if (p === '/api/export/csv' && method === 'GET') {
      const csv = measurementsCsv(q.listM.all(user.id).map(rowToM));
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pulso-mediciones-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      });
      return res.end(csv);
    }
    if (p === '/api/export/backup' && method === 'GET') {
      const backup = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exported_at: now(),
        profile: readDoc(user.id, 'profile')?.data ?? null,
        plan: readDoc(user.id, 'plan')?.data ?? null,
        measurements: q.listM.all(user.id).map(rowToM).map(({ type, measured_at, data }) => ({ type, measured_at, data })),
      };
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="pulso-respaldo-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      });
      return res.end(JSON.stringify(backup, null, 2));
    }
    if (p === '/api/import' && method === 'POST') {
      const b = await body(req);
      const v = validateBackup(b.backup);
      if (!v.ok) return send(res, 400, { error: 'El respaldo no se puede restaurar.', errors: v.errors, totalErrors: v.totalErrors });
      if (b.dryRun) return send(res, 200, { preview: { profile: !!v.value.profile, plan: !!v.value.plan, measurements: v.value.measurements.length } });
      tx(() => {
        if (v.value.profile) q.upsertDoc.run(user.id, 'profile', JSON.stringify(v.value.profile), now());
        if (v.value.plan) q.upsertDoc.run(user.id, 'plan', JSON.stringify(v.value.plan), now());
        q.deleteAllM.run(user.id);
        const t = now();
        for (const m of v.value.measurements) q.insertM.run(crypto.randomUUID(), user.id, m.type, m.measured_at, JSON.stringify(m.data), t, t);
      });
      return send(res, 200, { ok: true, restored: v.value.measurements.length });
    }

    if (p === '/api/account' && method === 'DELETE') {
      const b = await body(req);
      const u = q.userByEmail.get(user.email);
      if (!verifyPassword(String(b.password || ''), u.pass)) return send(res, 401, { error: 'La contraseña no es correcta.', field: 'password' });
      q.deleteUser.run(user.id);
      setCookie(res, '', 0);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'Ruta no encontrada.' });
  }

  // ---------- Archivos estáticos ----------
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon' };
  function serveStatic(req, res, url) {
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || !path.extname(rel)) rel = '/index.html';
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'Prohibido.' });
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
      const ext = path.extname(file);
      res.writeHead(200, {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
      res.end(buf);
    });
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { return send(res, 400, { error: 'URL no válida.' }); }
    try {
      if (url.pathname.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store');
        return await api(req, res, url);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Método no permitido.' });
      return serveStatic(req, res, url);
    } catch (e) {
      if (e.status) return send(res, e.status, { error: e.message });
      if (e.message && /no válid|desconocid|debe|no reconocida/i.test(e.message)) return send(res, 400, { error: e.message });
      console.error(e);
      return send(res, 500, { error: 'Ocurrió un error en el servidor. Tus datos anteriores siguen guardados.' });
    }
  });

  return { server, db };
}

function send(res, status, obj) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('El archivo o los datos superan 2 MB.'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(v && typeof v === 'object' ? v : {});
      } catch { reject(Object.assign(new Error('Los datos enviados no son JSON válido.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const { server } = createApp();
  server.listen(port, () => console.log(`Pulso escuchando en http://localhost:${port}`));
}
