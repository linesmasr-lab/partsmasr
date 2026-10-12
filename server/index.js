import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, UPLOADS_DIR } from './db.js';
import { seed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const WHATSAPP = process.env.WHATSAPP_NUMBER || ''; // international format, e.g. 2010xxxxxxxx
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (IS_PROD ? '' : 'admin123');
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

if (seed()) console.log('[seed] demo catalog created');
if (!ADMIN_PASSWORD) console.warn('[admin] ADMIN_PASSWORD not set — admin panel is disabled');

const app = express();
app.use(express.json({ limit: '200kb' }));

const TIER_ORDER = { oem: 0, premium: 1, economy: 2 };
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const int = (v) => (Number.isInteger(Number(v)) ? Number(v) : NaN);

// ---------- public API ----------
app.get('/api/config', (_req, res) => res.json({ whatsapp: WHATSAPP, demo: true }));

app.get('/api/tree', (_req, res) => {
  const makes = db.prepare('SELECT id, name, name_en FROM makes ORDER BY name').all();
  const models = db.prepare('SELECT id, make_id, name FROM models ORDER BY name').all();
  const vehicles = db.prepare('SELECT id, model_id, year, engine FROM vehicles ORDER BY year DESC, engine').all();
  const byModel = {};
  for (const v of vehicles) (byModel[v.model_id] ||= []).push({ id: v.id, year: v.year, engine: v.engine });
  res.json(makes.map((m) => ({
    ...m,
    models: models.filter((x) => x.make_id === m.id).map((x) => ({ id: x.id, name: x.name, vehicles: byModel[x.id] || [] })),
  })));
});

app.get('/api/categories', (_req, res) => {
  res.json(db.prepare('SELECT id, slug, name, sub FROM categories ORDER BY sort').all());
});

const vehicleStmt = db.prepare(`SELECT v.id, v.year, v.engine, mo.id AS model_id, mo.name AS model, ma.id AS make_id, ma.name AS make
  FROM vehicles v JOIN models mo ON mo.id = v.model_id JOIN makes ma ON ma.id = mo.make_id WHERE v.id = ?`);

app.get('/api/vehicles/:id', (req, res) => {
  const v = vehicleStmt.get(int(req.params.id));
  return v ? res.json(v) : bad(res, 'not found', 404);
});

function groupParts(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.category_id}|${r.name}`;
    if (!groups.has(key)) groups.set(key, { title: r.name, category: r.category_slug, parts: [] });
    groups.get(key).parts.push(r);
  }
  for (const g of groups.values()) g.parts.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
  return [...groups.values()];
}

const PART_COLS = `p.id, p.name, p.brand, p.part_number, p.tier, p.price, p.stock, p.warranty, p.image, p.category_id, c.slug AS category_slug`;

app.get('/api/vehicles/:id/parts', (req, res) => {
  const vid = int(req.params.id);
  const cat = String(req.query.cat || '');
  const rows = db.prepare(`SELECT ${PART_COLS} FROM parts p
    JOIN part_fitments f ON f.part_id = p.id JOIN categories c ON c.id = p.category_id
    WHERE f.vehicle_id = ? ${cat ? 'AND c.slug = ?' : ''} ORDER BY c.sort, p.name`).all(...(cat ? [vid, cat] : [vid]));
  res.json(groupParts(rows));
});

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  const vid = int(req.query.vehicle);
  if (!q) return res.json([]);
  const like = `%${q}%`;
  const params = [like, like, like];
  let sql = `SELECT DISTINCT ${PART_COLS} FROM parts p JOIN categories c ON c.id = p.category_id`;
  if (vid) { sql += ' JOIN part_fitments f ON f.part_id = p.id AND f.vehicle_id = ?'; params.unshift(vid); }
  sql += ' WHERE (p.name LIKE ? OR p.brand LIKE ? OR p.part_number LIKE ?) ORDER BY p.name LIMIT 60';
  res.json(groupParts(db.prepare(sql).all(...params)));
});

app.post('/api/orders', (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const phone = String(b.phone || '').replace(/[^\d+]/g, '');
  const governorate = String(b.governorate || '').trim();
  const address = String(b.address || '').trim();
  if (!name || !governorate || !address) return bad(res, 'missing_fields');
  if (!/^(\+?20)?0?1[0125]\d{8}$/.test(phone)) return bad(res, 'invalid_phone');
  const items = Array.isArray(b.items) ? b.items.slice(0, 50) : [];
  if (!items.length) return bad(res, 'empty_cart');

  const getPart = db.prepare('SELECT id, name, brand, price, stock FROM parts WHERE id = ?');
  const lines = [];
  for (const it of items) {
    const p = getPart.get(int(it.id));
    const qty = Math.min(Math.max(int(it.qty) || 1, 1), 20);
    if (!p || p.stock === 'out') return bad(res, 'item_unavailable');
    lines.push({ ...p, qty });
  }
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const vehicleId = vehicleStmt.get(int(b.vehicleId)) ? int(b.vehicleId) : null;

  const create = db.transaction(() => {
    const id = db.prepare(`INSERT INTO orders (name, phone, governorate, address, notes, vehicle_id, chassis, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(name.slice(0, 100), phone, governorate.slice(0, 50), address.slice(0, 300),
      String(b.notes || '').slice(0, 500), vehicleId, String(b.chassis || '').trim().slice(0, 30), total).lastInsertRowid;
    const ins = db.prepare('INSERT INTO order_items (order_id, part_id, name, brand, qty, price) VALUES (?, ?, ?, ?, ?, ?)');
    for (const l of lines) ins.run(id, l.id, l.name, l.brand, l.qty, l.price);
    return id;
  });
  res.status(201).json({ id: create(), total });
});

// ---------- admin ----------
function sign(exp) { return crypto.createHmac('sha256', SECRET).update(`admin:${exp}`).digest('hex'); }
function requireAdmin(req, res, next) {
  const [exp, sig] = String(req.get('authorization') || '').replace(/^Bearer /, '').split('.');
  if (!ADMIN_PASSWORD || !exp || !sig || Number(exp) < Date.now()) return bad(res, 'unauthorized', 401);
  const good = sign(exp);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return bad(res, 'unauthorized', 401);
  next();
}

app.post('/api/admin/login', (req, res) => {
  const pw = String(req.body?.password || '');
  if (!ADMIN_PASSWORD) return bad(res, 'admin_disabled', 503);
  const a = crypto.createHash('sha256').update(pw).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) return bad(res, 'wrong_password', 401);
  const exp = Date.now() + 1000 * 60 * 60 * 12;
  res.json({ token: `${exp}.${sign(exp)}` });
});

app.get('/api/admin/parts', requireAdmin, (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  res.json(db.prepare(`SELECT ${PART_COLS}, c.name AS category_name,
      (SELECT COUNT(*) FROM part_fitments f WHERE f.part_id = p.id) AS fit_count
    FROM parts p JOIN categories c ON c.id = p.category_id
    WHERE p.name LIKE ? OR p.brand LIKE ? OR p.part_number LIKE ? ORDER BY p.id DESC LIMIT 200`).all(q, q, q));
});

// Fitment is edited as ranges: { model_id, from, to, engine | '' (all engines) }
function fitmentRanges(partId) {
  const rows = db.prepare(`SELECT v.model_id, v.year, v.engine FROM part_fitments f JOIN vehicles v ON v.id = f.vehicle_id
    WHERE f.part_id = ? ORDER BY v.model_id, v.engine, v.year`).all(partId);
  const byKey = new Map();
  for (const r of rows) {
    const k = `${r.model_id}|${r.engine}`;
    const g = byKey.get(k) || { model_id: r.model_id, engine: r.engine, from: r.year, to: r.year };
    g.from = Math.min(g.from, r.year); g.to = Math.max(g.to, r.year);
    byKey.set(k, g);
  }
  return [...byKey.values()];
}

app.get('/api/admin/parts/:id', requireAdmin, (req, res) => {
  const p = db.prepare('SELECT * FROM parts WHERE id = ?').get(int(req.params.id));
  if (!p) return bad(res, 'not found', 404);
  res.json({ ...p, fitments: fitmentRanges(p.id) });
});

function savePart(id, b) {
  const fields = {
    category_id: int(b.category_id), name: String(b.name || '').trim(), brand: String(b.brand || '').trim(),
    part_number: String(b.part_number || '').trim(), tier: b.tier, price: int(b.price),
    stock: b.stock, warranty: String(b.warranty || '').trim(), image: String(b.image || '').trim(),
  };
  if (!fields.name || !fields.brand || !(fields.price >= 0) || !TIER_ORDER.hasOwnProperty(fields.tier)
    || !['in', '24h', 'out'].includes(fields.stock) || !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(fields.category_id)) {
    throw new Error('invalid_part');
  }
  const tx = db.transaction(() => {
    if (id) {
      db.prepare(`UPDATE parts SET category_id=@category_id, name=@name, brand=@brand, part_number=@part_number, tier=@tier,
        price=@price, stock=@stock, warranty=@warranty, image=@image WHERE id=@id`).run({ ...fields, id });
      db.prepare('DELETE FROM part_fitments WHERE part_id = ?').run(id);
    } else {
      id = db.prepare(`INSERT INTO parts (category_id, name, brand, part_number, tier, price, stock, warranty, image)
        VALUES (@category_id, @name, @brand, @part_number, @tier, @price, @stock, @warranty, @image)`).run(fields).lastInsertRowid;
    }
    const ins = db.prepare('INSERT OR IGNORE INTO part_fitments (part_id, vehicle_id) VALUES (?, ?)');
    for (const f of Array.isArray(b.fitments) ? b.fitments : []) {
      const vs = db.prepare(`SELECT id FROM vehicles WHERE model_id = ? AND year BETWEEN ? AND ? ${f.engine ? 'AND engine = ?' : ''}`)
        .all(...[int(f.model_id), int(f.from), int(f.to), ...(f.engine ? [String(f.engine)] : [])]);
      for (const v of vs) ins.run(id, v.id);
    }
    return id;
  });
  return tx();
}

app.post('/api/admin/parts', requireAdmin, (req, res) => {
  try { res.status(201).json({ id: savePart(null, req.body || {}) }); } catch (e) { bad(res, e.message); }
});
app.put('/api/admin/parts/:id', requireAdmin, (req, res) => {
  const id = int(req.params.id);
  if (!db.prepare('SELECT 1 FROM parts WHERE id = ?').get(id)) return bad(res, 'not found', 404);
  try { res.json({ id: savePart(id, req.body || {}) }); } catch (e) { bad(res, e.message); }
});
app.delete('/api/admin/parts/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM parts WHERE id = ?').run(int(req.params.id));
  res.json({ ok: true });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});
app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return bad(res, 'invalid_image');
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const orders = db.prepare(`SELECT o.*, ma.name || ' ' || mo.name || ' ' || v.year || ' · ' || v.engine AS vehicle
    FROM orders o LEFT JOIN vehicles v ON v.id = o.vehicle_id LEFT JOIN models mo ON mo.id = v.model_id
    LEFT JOIN makes ma ON ma.id = mo.make_id ORDER BY o.id DESC LIMIT 200`).all();
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  res.json(orders.map((o) => ({ ...o, items: items.all(o.id) })));
});
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const status = String(req.body?.status || '');
  if (!['new', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) return bad(res, 'invalid_status');
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, int(req.params.id));
  res.json({ ok: true });
});

app.use('/api', (_req, res) => bad(res, 'not found', 404));

// ---------- static ----------
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
const DIST = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(DIST, 'index.html')) : next()));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => console.log(`PartsMasr running on http://localhost:${PORT}`));
