import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// On Railway, mount a Volume and set DATA_DIR to its mount path (e.g. /data)
// so the database and uploaded images survive redeploys.
export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
try {
  fs.accessSync(DATA_DIR, fs.constants.W_OK);
} catch {
  console.error(`[db] DATA_DIR is not writable: ${DATA_DIR}`);
  process.exit(1);
}

export const db = new Database(path.join(DATA_DIR, 'partsmasr.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS makes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY,
  make_id INTEGER NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  engine TEXT NOT NULL,
  UNIQUE(model_id, year, engine)
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sub TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  part_number TEXT NOT NULL DEFAULT '',
  tier TEXT NOT NULL CHECK (tier IN ('oem','premium','economy')),
  price INTEGER NOT NULL,
  stock TEXT NOT NULL DEFAULT 'in' CHECK (stock IN ('in','24h','out')),
  warranty TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS part_fitments (
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  PRIMARY KEY (part_id, vehicle_id)
);
CREATE INDEX IF NOT EXISTS idx_fit_vehicle ON part_fitments(vehicle_id);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  governorate TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  chassis TEXT NOT NULL DEFAULT '',
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  part_id INTEGER REFERENCES parts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price INTEGER NOT NULL
);
`);
