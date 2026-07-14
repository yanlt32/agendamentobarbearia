const { db } = require('../database/database');

function record(userId, action, details = '') {
  db.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').run(userId, action, details);
}

function recent(limit = 50) {
  return db.prepare(`
    SELECT l.*, u.name AS user_name FROM logs l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.id DESC LIMIT ?
  `).all(limit);
}

module.exports = { record, recent };
