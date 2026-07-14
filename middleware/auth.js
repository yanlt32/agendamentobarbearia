function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  req.flash('error', 'Faca login para continuar.');
  return res.redirect('/admin/login');
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) return res.redirect('/admin/dashboard');
  return next();
}

module.exports = { requireAuth, redirectIfAuthenticated };
