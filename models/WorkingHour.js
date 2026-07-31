const { db } = require('../database/database');

function all() {
  return db.prepare('SELECT * FROM working_hours ORDER BY weekday').all();
}

function forWeekday(weekday) {
  return db.prepare('SELECT * FROM working_hours WHERE weekday = ?').get(weekday);
}

function update(weekday, data) {
  db.prepare(`
    UPDATE working_hours SET open_time=@open_time, close_time=@close_time, is_open=@is_open,
      break_start=@break_start, break_end=@break_end
    WHERE weekday=@weekday
  `).run({ break_start: null, break_end: null, ...data, weekday });
}

module.exports = { all, forWeekday, update };
