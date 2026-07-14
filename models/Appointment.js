const { db } = require('../database/database');

const BASE_SELECT = `
  SELECT a.*, c.name AS client_name, c.phone AS client_phone,
         b.name AS barber_name, s.name AS service_name, s.duration_minutes
  FROM appointments a
  JOIN clients c ON c.id = a.client_id
  JOIN barbers b ON b.id = a.barber_id
  JOIN services s ON s.id = a.service_id
`;

function find(id) {
  return db.prepare(`${BASE_SELECT} WHERE a.id = ?`).get(id);
}

function list({ range, barberId, status, search, page = 1, perPage = 20, dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  const today = require('dayjs')();

  if (dateFrom && dateTo) {
    where.push('a.date BETWEEN ? AND ?');
    params.push(dateFrom, dateTo);
  } else if (range === 'today') {
    where.push('a.date = ?');
    params.push(today.format('YYYY-MM-DD'));
  } else if (range === 'tomorrow') {
    where.push('a.date = ?');
    params.push(today.add(1, 'day').format('YYYY-MM-DD'));
  } else if (range === 'week') {
    where.push('a.date BETWEEN ? AND ?');
    params.push(today.startOf('week').format('YYYY-MM-DD'), today.endOf('week').format('YYYY-MM-DD'));
  } else if (range === 'month') {
    where.push('a.date BETWEEN ? AND ?');
    params.push(today.startOf('month').format('YYYY-MM-DD'), today.endOf('month').format('YYYY-MM-DD'));
  }

  if (barberId) {
    where.push('a.barber_id = ?');
    params.push(barberId);
  }
  if (status) {
    where.push('a.status = ?');
    params.push(status);
  }
  if (search) {
    where.push('(c.name LIKE ? OR c.phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM appointments a JOIN clients c ON c.id=a.client_id ${whereSql}`).get(...params).c;
  const offset = (page - 1) * perPage;
  const rows = db.prepare(`${BASE_SELECT} ${whereSql} ORDER BY a.date DESC, a.time DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, offset);

  return { rows, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

function bookedTimesForBarberDate(barberId, date) {
  return db.prepare(`
    SELECT time, s.duration_minutes FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.barber_id = ? AND a.date = ? AND a.status != 'cancelled'
  `).all(barberId, date);
}

function create(data) {
  const info = db.prepare(`
    INSERT INTO appointments (client_id, barber_id, service_id, date, time, status, notes, price)
    VALUES (@client_id, @barber_id, @service_id, @date, @time, @status, @notes, @price)
  `).run({ status: 'pending', notes: null, ...data });
  return info.lastInsertRowid;
}

function update(id, data) {
  db.prepare(`
    UPDATE appointments SET client_id=@client_id, barber_id=@barber_id, service_id=@service_id,
      date=@date, time=@time, status=@status, notes=@notes, price=@price
    WHERE id=@id
  `).run({ ...data, id });
}

function updateStatus(id, status) {
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
}

function remove(id) {
  db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
}

// --- Dashboard / financial aggregates ---

function countByDate(date) {
  return db.prepare("SELECT COUNT(*) AS c FROM appointments WHERE date = ? AND status != 'cancelled'").get(date).c;
}

function countBetween(start, end) {
  return db.prepare("SELECT COUNT(*) AS c FROM appointments WHERE date BETWEEN ? AND ? AND status != 'cancelled'").get(start, end).c;
}

function revenueByDate(date) {
  return db.prepare("SELECT COALESCE(SUM(price),0) AS total FROM appointments WHERE date = ? AND status = 'completed'").get(date).total;
}

function revenueBetween(start, end) {
  return db.prepare("SELECT COALESCE(SUM(price),0) AS total FROM appointments WHERE date BETWEEN ? AND ? AND status = 'completed'").get(start, end).total;
}

function upcoming(limit = 8) {
  const today = require('dayjs')().format('YYYY-MM-DD');
  const now = require('dayjs')().format('HH:mm');
  return db.prepare(`
    ${BASE_SELECT}
    WHERE a.status IN ('pending','confirmed')
      AND (a.date > ? OR (a.date = ? AND a.time >= ?))
    ORDER BY a.date ASC, a.time ASC LIMIT ?
  `).all(today, today, now, limit);
}

function revenueSeries(start, end) {
  return db.prepare(`
    SELECT date, COALESCE(SUM(price),0) AS total
    FROM appointments WHERE date BETWEEN ? AND ? AND status = 'completed'
    GROUP BY date ORDER BY date ASC
  `).all(start, end);
}

function appointmentsByMonthSeries(months) {
  return db.prepare(`
    SELECT strftime('%Y-%m', date) AS ym, COUNT(*) AS total
    FROM appointments WHERE status != 'cancelled' AND date >= ?
    GROUP BY ym ORDER BY ym ASC
  `).all(months);
}

function averageTicket(start, end) {
  const row = db.prepare(`
    SELECT COALESCE(AVG(price),0) AS avg FROM appointments
    WHERE date BETWEEN ? AND ? AND status = 'completed'
  `).get(start, end);
  return row.avg;
}

module.exports = {
  find, list, bookedTimesForBarberDate, create, update, updateStatus, remove,
  countByDate, countBetween, revenueByDate, revenueBetween, upcoming,
  revenueSeries, appointmentsByMonthSeries, averageTicket,
};
