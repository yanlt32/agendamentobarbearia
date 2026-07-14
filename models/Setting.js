const { db } = require('../database/database');

function getAll() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach((r) => { obj[r.key] = r.value; });
  return obj;
}

function get(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function set(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function setMany(obj) {
  const tx = db.transaction((entries) => entries.forEach(([k, v]) => set(k, v)));
  tx(Object.entries(obj));
}

module.exports = { getAll, get, set, setMany };
