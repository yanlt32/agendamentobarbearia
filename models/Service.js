const { db } = require('../database/database');

function all({ onlyActive = false } = {}) {
  const where = onlyActive ? 'WHERE active = 1' : '';
  return db.prepare(`SELECT * FROM services ${where} ORDER BY category, name`).all();
}

function find(id) {
  return db.prepare('SELECT * FROM services WHERE id = ?').get(id);
}

function create(data) {
  const info = db.prepare(`
    INSERT INTO services (name, description, price, duration_minutes, category, active)
    VALUES (@name, @description, @price, @duration_minutes, @category, @active)
  `).run({ description: null, category: null, active: 1, ...data });
  return info.lastInsertRowid;
}

function update(id, data) {
  db.prepare(`
    UPDATE services SET name=@name, description=@description, price=@price,
      duration_minutes=@duration_minutes, category=@category, active=@active
    WHERE id=@id
  `).run({ description: null, category: null, active: 1, ...data, id });
}

function remove(id) {
  db.prepare('DELETE FROM services WHERE id = ?').run(id);
}

function updatePrice(id, price) {
  db.prepare('UPDATE services SET price = ? WHERE id = ?').run(price, id);
}

function topSold(start, end, limit = 5) {
  return db.prepare(`
    SELECT s.name, COUNT(a.id) AS total, SUM(a.price) AS revenue
    FROM appointments a JOIN services s ON s.id = a.service_id
    WHERE a.status = 'completed' AND a.date BETWEEN ? AND ?
    GROUP BY a.service_id ORDER BY total DESC LIMIT ?
  `).all(start, end, limit);
}

module.exports = { all, find, create, update, remove, updatePrice, topSold };
