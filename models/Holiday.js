const { db } = require('../database/database');

function all() {
  return db.prepare('SELECT * FROM holidays ORDER BY date').all();
}

function find(id) {
  return db.prepare('SELECT * FROM holidays WHERE id = ?').get(id);
}

function findByDate(date) {
  return db.prepare('SELECT * FROM holidays WHERE date = ?').get(date);
}

function create(data) {
  const info = db.prepare('INSERT INTO holidays (date, description) VALUES (@date, @description)').run(data);
  return info.lastInsertRowid;
}

function remove(id) {
  db.prepare('DELETE FROM holidays WHERE id = ?').run(id);
}

module.exports = { all, find, findByDate, create, remove };
