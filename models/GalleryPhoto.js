const { db } = require('../database/database');

function all() {
  return db.prepare('SELECT * FROM gallery_photos ORDER BY sort_order ASC, id DESC').all();
}

function find(id) {
  return db.prepare('SELECT * FROM gallery_photos WHERE id = ?').get(id);
}

function create({ path, caption }) {
  const info = db.prepare('INSERT INTO gallery_photos (path, caption) VALUES (?, ?)').run(path, caption || null);
  return info.lastInsertRowid;
}

function remove(id) {
  db.prepare('DELETE FROM gallery_photos WHERE id = ?').run(id);
}

module.exports = { all, find, create, remove };
