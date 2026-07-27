// Must run before anything touches Date/dayjs: hosts like Render run
// containers in UTC, not the shop's local time. Without this, "today" and
// "current time" drift from Brazil's clock and every availability check
// (past-time filtering, day-of-week schedule lookup) breaks in production
// while looking perfectly fine on a dev machine already set to Brazil time.
process.env.TZ = 'America/Sao_Paulo';

require('dotenv').config();
require('./database/database');

const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');

const Setting = require('./models/Setting');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// When UPLOADS_DIR points at a persistent disk (see config/upload.js), photos
// live outside public/ and need their own static route under the same /uploads
// URL prefix the app already generates in <img src>.
if (process.env.UPLOADS_DIR) {
  app.use('/uploads', express.static(process.env.UPLOADS_DIR));
}

// Sessao em memoria: simples e evita conflitos de lock de arquivo com
// sincronizacao de nuvem (OneDrive/Google Drive) na pasta do projeto.
// Sessoes sao perdidas ao reiniciar o servidor (aceitavel para uso local).
app.use(session({
  secret: process.env.SESSION_SECRET || 'jackson-barbearia-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },
}));
app.use(flash());

app.use((req, res, next) => {
  res.locals.settings = Setting.getAll();
  res.locals.currentUser = req.session.user || null;
  res.locals.successMsg = req.flash('success');
  res.locals.errorMsg = req.flash('error');
  res.locals.currentPath = req.path;
  next();
});

app.use('/', indexRoutes);
app.use('/admin', authRoutes);
app.use('/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Barbearia rodando em http://localhost:${PORT}`);
});
