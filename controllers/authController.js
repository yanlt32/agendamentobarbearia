const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Log = require('../models/Log');

function showLogin(req, res) {
  res.render('auth/login', { title: 'Login Administrativo' });
}

function login(req, res) {
  const { username, password } = req.body;
  const user = User.findByUsername(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    req.flash('error', 'Usuario ou senha invalidos.');
    return res.redirect('/admin/login');
  }

  req.session.user = { id: user.id, name: user.name, username: user.username, role: user.role };
  Log.record(user.id, 'login', `Usuario ${user.username} autenticado.`);
  req.flash('success', `Bem-vindo, ${user.name}!`);
  res.redirect('/admin/dashboard');
}

function logout(req, res) {
  const user = req.session.user;
  if (user) Log.record(user.id, 'logout', `Usuario ${user.username} saiu.`);
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
}

module.exports = { showLogin, login, logout };
