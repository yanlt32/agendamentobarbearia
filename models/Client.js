const { db } = require('../database/database');

function list({ search = '', page = 1, perPage = 15 } = {}) {
  const offset = (page - 1) * perPage;
  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) AS c FROM clients ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM clients ${where} ORDER BY name ASC LIMIT ? OFFSET ?`)
    .all(...params, perPage, offset);
  return { rows, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

function all() {
  return db.prepare('SELECT * FROM clients ORDER BY name ASC').all();
}

function find(id) {
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
}

function findByPhone(phone) {
  return db.prepare('SELECT * FROM clients WHERE phone = ?').get(phone);
}

function create(data) {
  const info = db.prepare(`
    INSERT INTO clients (name, phone, email, birth_date, notes)
    VALUES (@name, @phone, @email, @birth_date, @notes)
  `).run({ email: null, birth_date: null, notes: null, ...data });
  return info.lastInsertRowid;
}

function update(id, data) {
  db.prepare(`
    UPDATE clients SET name=@name, phone=@phone, email=@email, birth_date=@birth_date, notes=@notes
    WHERE id=@id
  `).run({ email: null, birth_date: null, notes: null, ...data, id });
}

function remove(id) {
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
}

function history(id) {
  return db.prepare(`
    SELECT a.*, s.name AS service_name, s.price AS service_price, b.name AS barber_name
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    JOIN barbers b ON b.id = a.barber_id
    WHERE a.client_id = ?
    ORDER BY a.date DESC, a.time DESC
  `).all(id);
}

function registerVisit(id, dateStr) {
  db.prepare('UPDATE clients SET visits_count = visits_count + 1, last_visit = ? WHERE id = ?').run(dateStr, id);
}

function count() {
  return db.prepare('SELECT COUNT(*) AS c FROM clients').get().c;
}

function newClientsBetween(start, end) {
  return db.prepare('SELECT COUNT(*) AS c FROM clients WHERE date(created_at) BETWEEN ? AND ?').get(start, end).c;
}

module.exports = { list, all, find, findByPhone, create, update, remove, history, registerVisit, count, newClientsBetween };
