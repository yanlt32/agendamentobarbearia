const { db } = require('../database/database');

function create(appointmentId, amount, method = 'dinheiro') {
  const info = db.prepare('INSERT INTO payments (appointment_id, amount, method) VALUES (?, ?, ?)')
    .run(appointmentId, amount, method);
  return info.lastInsertRowid;
}

function forAppointment(appointmentId) {
  return db.prepare('SELECT * FROM payments WHERE appointment_id = ?').all(appointmentId);
}

function methodBreakdown(start, end) {
  return db.prepare(`
    SELECT method, COUNT(*) AS total, SUM(amount) AS revenue
    FROM payments WHERE date(paid_at) BETWEEN ? AND ?
    GROUP BY method
  `).all(start, end);
}

module.exports = { create, forAppointment, methodBreakdown };
