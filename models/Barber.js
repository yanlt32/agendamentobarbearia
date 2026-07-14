const { db } = require('../database/database');

function all({ onlyActive = false } = {}) {
  const where = onlyActive ? "WHERE status = 'active'" : '';
  return db.prepare(`SELECT * FROM barbers ${where} ORDER BY name ASC`).all();
}

function find(id) {
  return db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);
}

function create(data) {
  const info = db.prepare(`
    INSERT INTO barbers (name, specialty, photo, status)
    VALUES (@name, @specialty, @photo, @status)
  `).run({ specialty: null, photo: null, status: 'active', ...data });
  return info.lastInsertRowid;
}

function update(id, data) {
  db.prepare(`
    UPDATE barbers SET name=@name, specialty=@specialty, photo=@photo, status=@status
    WHERE id=@id
  `).run({ specialty: null, photo: null, status: 'active', ...data, id });
}

function remove(id) {
  db.prepare('DELETE FROM barbers WHERE id = ?').run(id);
}

function getServices(barberId) {
  return db.prepare(`
    SELECT s.* FROM services s
    JOIN barber_services bs ON bs.service_id = s.id
    WHERE bs.barber_id = ?
    ORDER BY s.name
  `).all(barberId);
}

function setServices(barberId, serviceIds) {
  const del = db.prepare('DELETE FROM barber_services WHERE barber_id = ?');
  const ins = db.prepare('INSERT INTO barber_services (barber_id, service_id) VALUES (?, ?)');
  const tx = db.transaction((ids) => {
    del.run(barberId);
    ids.forEach((sid) => ins.run(barberId, sid));
  });
  tx(serviceIds);
}

function getSchedule(barberId) {
  return db.prepare('SELECT * FROM barber_schedules WHERE barber_id = ? ORDER BY weekday').all(barberId);
}

function setSchedule(barberId, schedules) {
  const del = db.prepare('DELETE FROM barber_schedules WHERE barber_id = ?');
  const ins = db.prepare(`
    INSERT INTO barber_schedules (barber_id, weekday, start_time, end_time, is_off)
    VALUES (?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((rows) => {
    del.run(barberId);
    rows.forEach((r) => ins.run(barberId, r.weekday, r.start_time, r.end_time, r.is_off ? 1 : 0));
  });
  tx(schedules);
}

function scheduleForDay(barberId, weekday) {
  return db.prepare('SELECT * FROM barber_schedules WHERE barber_id = ? AND weekday = ?').get(barberId, weekday);
}

function topServices(limit = 5) {
  return db.prepare(`
    SELECT b.name, COUNT(a.id) as total
    FROM appointments a JOIN barbers b ON b.id = a.barber_id
    WHERE a.status != 'cancelled'
    GROUP BY a.barber_id ORDER BY total DESC LIMIT ?
  `).all(limit);
}

module.exports = { all, find, create, update, remove, getServices, setServices, getSchedule, setSchedule, scheduleForDay, topServices };
