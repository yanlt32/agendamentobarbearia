const { db } = require('../database/database');

function findByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

module.exports = { findByUsername, findById };
