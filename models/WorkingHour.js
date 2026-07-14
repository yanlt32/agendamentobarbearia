const { db } = require('../database/database');

function all() {
  return db.prepare('SELECT * FROM working_hours ORDER BY weekday').all();
}

function forWeekday(weekday) {
  return db.prepare('SELECT * FROM working_hours WHERE weekday = ?').get(weekday);
}

function update(weekday, data) {
  db.prepare(`
    UPDATE working_hours SET open_time=@open_time, close_time=@close_time, is_open=@is_open
    WHERE weekday=@weekday
  `).run({ ...data, weekday });
}

module.exports = { all, forWeekday, update };
