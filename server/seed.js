// Demo catalog. Every price, brand pairing and part number here is SAMPLE DATA
// for showing the product to merchants — replace it with real merchant data.
import { db } from './db.js';
import { pathToFileURL } from 'node:url';

const MAKES = [
  { name: 'شيفروليه', en: 'Chevrolet', oem: 'GM', models: [
    { name: 'لانوس', years: [2009, 2018], engines: ['1.5 لتر'] },
    { name: 'أوبترا', years: [2009, 2019], engines: ['1.6 لتر', '1.8 لتر'] },
    { name: 'أفيو', years: [2009, 2016], engines: ['1.5 لتر', '1.6 لتر'] },
  ]},
  { name: 'هيونداي', en: 'Hyundai', oem: 'Hyundai Mobis', models: [
    { name: 'فيرنا', years: [2009, 2021], engines: ['1.6 لتر'] },
    { name: 'إلنترا', years: [2010, 2020], engines: ['1.6 لتر'] },
    { name: 'أكسنت', years: [2009, 2014], engines: ['1.3 لتر', '1.6 لتر'] },
  ]},
  { name: 'نيسان', en: 'Nissan', oem: 'Nissan Genuine', models: [
    { name: 'صني', years: [2012, 2024], engines: ['1.5 لتر'] },
  ]},
  { name: 'تويوتا', en: 'Toyota', oem: 'Toyota Genuine', models: [
    { name: 'كورولا', years: [2010, 2024], engines: ['1.6 لتر'] },
  ]},
  { name: 'كيا', en: 'Kia', oem: 'Kia Mobis', models: [
    { name: 'سيراتو', years: [2010, 2020], engines: ['1.6 لتر'] },
  ]},
  { name: 'رينو', en: 'Renault', oem: 'Renault Genuine', models: [
    { name: 'لوجان', years: [2010, 2021], engines: ['1.6 لتر'] },
  ]},
  { name: 'سكودا', en: 'Skoda', oem: 'Skoda Genuine', models: [
    { name: 'أوكتافيا', years: [2010, 2020], engines: ['1.6 لتر'] },
  ]},
];

const CATEGORIES = [
  { slug: 'filters', name: 'زيوت وفلاتر', sub: 'فلتر زيت، فلتر هوا، زيت موتور' },
  { slug: 'brakes', name: 'فرامل', sub: 'تيل، طنابير' },
  { slug: 'suspension', name: 'عفشة', sub: 'مساعدين' },
  { slug: 'engine', name: 'موتور', sub: 'سيور، بوجيهات، طرمبة مية' },
  { slug: 'electrical', name: 'كهرباء', sub: 'بطاريات' },
  { slug: 'cooling', name: 'تبريد', sub: 'ردياتير' },
  { slug: 'lighting', name: 'كشافات', sub: 'كشافات أمامي' },
];

// [name, category, image, base price EGP, premium brand, economy brand, warranty]
const PART_TYPES = [
  ['فلتر زيت', 'filters', 'oil-filter', 250, 'MANN-FILTER', 'Sakura', '—'],
  ['فلتر هوا', 'filters', 'air-filter', 300, 'MANN-FILTER', 'Sakura', '—'],
  ['زيت موتور 5W-30 · 4 لتر', 'filters', 'motor-oil', 1400, 'Mobil 1', 'Total', '—'],
  ['تيل فرامل أمامي', 'brakes', 'brake-pads', 900, 'Bosch', 'Kavo Parts', '6 شهور'],
  ['طنبورة فرامل أمامي', 'brakes', 'brake-disc', 1500, 'Brembo', 'Kavo Parts', '6 شهور'],
  ['مساعد أمامي', 'suspension', 'shock', 2200, 'Sachs', 'KYB Excel-G', 'سنة'],
  ['طقم سير كاتينة', 'engine', 'belt', 2500, 'Gates', 'Dayco', 'سنة'],
  ['طقم بوجيهات', 'engine', 'spark-plug', 600, 'NGK', 'Denso', '—'],
  ['طرمبة مية', 'engine', 'water-pump', 1800, 'Valeo', 'Airtex', '6 شهور'],
  ['بطارية 60 أمبير', 'electrical', 'battery', 4500, 'Varta', 'Chloride', 'سنة'],
  ['ردياتير مية', 'cooling', 'radiator', 4000, 'Valeo', 'Nissens', '6 شهور'],
  ['كشاف أمامي يمين', 'lighting', 'headlight', 3500, 'Depo', 'TYC', '3 شهور'],
];

const TIERS = [
  { tier: 'oem', mult: 1.6, stock: '24h' },
  { tier: 'premium', mult: 1.0, stock: 'in' },
  { tier: 'economy', mult: 0.6, stock: 'in' },
];

export function seed({ reset = false } = {}) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM makes').get().n;
  if (count > 0 && !reset) return false;

  const run = db.transaction(() => {
    if (reset) {
      db.exec('DELETE FROM order_items; DELETE FROM orders; DELETE FROM part_fitments; DELETE FROM parts; DELETE FROM vehicles; DELETE FROM models; DELETE FROM makes; DELETE FROM categories;');
    }
    const insCat = db.prepare('INSERT INTO categories (slug, name, sub, sort) VALUES (?, ?, ?, ?)');
    const catId = {};
    CATEGORIES.forEach((c, i) => { catId[c.slug] = insCat.run(c.slug, c.name, c.sub, i).lastInsertRowid; });

    const insMake = db.prepare('INSERT INTO makes (name, name_en) VALUES (?, ?)');
    const insModel = db.prepare('INSERT INTO models (make_id, name) VALUES (?, ?)');
    const insVeh = db.prepare('INSERT INTO vehicles (model_id, year, engine) VALUES (?, ?, ?)');
    const insPart = db.prepare(`INSERT INTO parts (category_id, name, brand, part_number, tier, price, stock, warranty, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const setPn = db.prepare('UPDATE parts SET part_number = ? WHERE id = ?');
    const insFit = db.prepare('INSERT INTO part_fitments (part_id, vehicle_id) VALUES (?, ?)');

    for (const mk of MAKES) {
      const makeId = insMake.run(mk.name, mk.en).lastInsertRowid;
      for (const md of mk.models) {
        const modelId = insModel.run(makeId, md.name).lastInsertRowid;
        const vehIds = [];
        for (let y = md.years[0]; y <= md.years[1]; y++) {
          for (const e of md.engines) vehIds.push(insVeh.run(modelId, y, e).lastInsertRowid);
        }
        PART_TYPES.forEach(([name, cat, img, base, prem, eco, warranty], ti) => {
          // Not every part type comes in all three tiers — vary it a little.
          const tiers = ti % 3 === 2 ? TIERS.slice(0, 2) : TIERS;
          for (const t of tiers) {
            const brand = t.tier === 'oem' ? mk.oem : t.tier === 'premium' ? prem : eco;
            const price = Math.round((base * t.mult) / 5) * 5;
            const id = insPart.run(catId[cat], name, brand, '', t.tier, price, t.stock,
              t.tier === 'economy' && warranty !== '—' ? '3 شهور' : warranty, `/parts/${img}.svg`).lastInsertRowid;
            setPn.run(`DEMO-${String(id).padStart(5, '0')}`, id);
            for (const v of vehIds) insFit.run(id, v);
          }
        });
      }
    }
  });
  run();
  return true;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed({ reset: process.argv.includes('--reset') });
  const n = db.prepare('SELECT (SELECT COUNT(*) FROM parts) p, (SELECT COUNT(*) FROM vehicles) v').get();
  console.log(`Seeded: ${n.p} parts, ${n.v} vehicles`);
}
