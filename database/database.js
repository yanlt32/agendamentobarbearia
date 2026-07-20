const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = __dirname;
const DB_PATH = path.join(DB_DIR, 'barbershop.db');
const BACKUP_DIR = path.join(DB_DIR, 'backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Polyfills so the rest of the codebase can keep using the familiar
// better-sqlite3-style transaction/backup helpers on top of node:sqlite.
db.transaction = function transaction(fn) {
  return function runTransaction(...args) {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
};

function backup(destPath) {
  return new Promise((resolve, reject) => {
    try {
      db.exec('PRAGMA wal_checkpoint(FULL);');
      fs.copyFileSync(DB_PATH, destPath);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      birth_date TEXT,
      notes TEXT,
      visits_count INTEGER NOT NULL DEFAULT 0,
      last_visit TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS barbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT,
      photo TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      category TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS barber_services (
      barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      PRIMARY KEY (barber_id, service_id)
    );

    CREATE TABLE IF NOT EXISTS barber_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
      weekday INTEGER NOT NULL, -- 0=domingo ... 6=sabado
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_off INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS working_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekday INTEGER NOT NULL UNIQUE, -- 0=domingo ... 6=sabado
      open_time TEXT,
      close_time TEXT,
      is_open INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, completed, cancelled
      notes TEXT,
      price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      method TEXT NOT NULL DEFAULT 'dinheiro',
      paid_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id, date);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
  `);
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
      .run('admin', hash, 'Administrador', 'admin');
  }

  const whCount = db.prepare('SELECT COUNT(*) AS c FROM working_hours').get().c;
  if (whCount === 0) {
    const insert = db.prepare('INSERT INTO working_hours (weekday, open_time, close_time, is_open) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
    insertMany([
      [0, null, null, 0], // domingo fechado
      [1, '09:00', '19:00', 1],
      [2, '09:00', '19:00', 1],
      [3, '09:00', '19:00', 1],
      [4, '09:00', '19:00', 1],
      [5, '09:00', '19:00', 1],
      [6, '09:00', '17:00', 1],
    ]);
  }

  const settingsDefaults = {
    shop_name: 'Jackson Barbearia',
    logo: '',
    phone: '(11) 99999-9999',
    whatsapp: '5511999999999',
    instagram: 'https://www.instagram.com/jackson_barbearia01/',
    facebook: 'https://facebook.com/',
    address: 'Lagoa das Flores',
    maps_embed: '',
    slot_interval_minutes: '30',
    theme: 'dark',
    about_text: 'Atendimento por ordem de chegada e atendimento personalizado. Tradicao e estilo em cada corte, unindo tecnica classica e tendencias modernas para entregar a melhor experiencia ao cliente.',
  };
  const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(settingsDefaults)) {
    if (!getSetting.get(key)) insertSetting.run(key, value);
  }

  const serviceCount = db.prepare('SELECT COUNT(*) AS c FROM services').get().c;
  if (serviceCount === 0) {
    const insert = db.prepare('INSERT INTO services (name, description, price, duration_minutes, category) VALUES (?, ?, ?, ?, ?)');
    const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
    insertMany([
      ['Corte Masculino', 'Corte tradicional ou moderno', 45, 30, 'Corte'],
      ['Barba', 'Aparar e desenhar barba com toalha quente', 35, 20, 'Barba'],
      ['Corte + Barba', 'Combo completo', 70, 50, 'Combo'],
      ['Pigmentacao', 'Pigmentacao de barba ou cabelo', 40, 30, 'Pigmentacao'],
      ['Sobrancelha', 'Design de sobrancelha na navalha', 15, 10, 'Sobrancelha'],
    ]);
  }

  const barberCount = db.prepare('SELECT COUNT(*) AS c FROM barbers').get().c;
  if (barberCount === 0) {
    const insert = db.prepare('INSERT INTO barbers (name, specialty, status) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
    insertMany([
      ['Jackson', 'Cortes classicos e navalha', 'active'],
      ['Rafael Souza', 'Degrade e barba desenhada', 'active'],
    ]);

    const barbers = db.prepare('SELECT id FROM barbers').all();
    const services = db.prepare('SELECT id FROM services').all();
    const link = db.prepare('INSERT OR IGNORE INTO barber_services (barber_id, service_id) VALUES (?, ?)');
    const linkAll = db.transaction(() => {
      barbers.forEach((b) => services.forEach((s) => link.run(b.id, s.id)));
    });
    linkAll();

    const schedule = db.prepare('INSERT INTO barber_schedules (barber_id, weekday, start_time, end_time, is_off) VALUES (?, ?, ?, ?, ?)');
    const scheduleAll = db.transaction(() => {
      barbers.forEach((b) => {
        for (let wd = 1; wd <= 6; wd++) {
          const end = wd === 6 ? '17:00' : '19:00';
          schedule.run(b.id, wd, '09:00', end, 0);
        }
      });
    });
    scheduleAll();
  }
}

function normalizeName(str) {
  // Strip combining diacritical marks (U+0300-U+036F) left behind by NFD
  // normalization, e.g. "Pigmentação" -> "pigmentacao", for accent-insensitive matching.
  return String(str)
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('')
    .toLowerCase()
    .trim();
}

// One-time import of the shop's real price table into the services catalog.
// Runs only once (guarded by a settings flag) and only fills in / creates
// rows -- after that, prices are entirely in the barber's hands via the
// "editar preco" control on /admin/services, and this migration won't
// overwrite whatever they change later.
function reconcileServicesOnce() {
  const marker = db.prepare("SELECT value FROM settings WHERE key = 'migration_price_table'").get();
  if (marker) return;

  const priceTable = [
    { matchNames: ['corte masculino', 'corte'], name: 'Corte', price: 30, duration_minutes: 30, category: 'Corte' },
    { matchNames: ['barba'], name: 'Barba', price: 20, duration_minutes: 20, category: 'Barba' },
    { matchNames: ['corte + barba'], name: 'Corte + Barba', price: 50, duration_minutes: 50, category: 'Combo' },
    { matchNames: ['corte + barba + sobrancelha'], name: 'Corte + Barba + Sobrancelha', price: 55, duration_minutes: 55, category: 'Combo' },
    { matchNames: ['pigmentacao'], name: 'Pigmentacao', price: 25, duration_minutes: 30, category: 'Pigmentacao' },
    { matchNames: ['sobrancelha', 'sombrancelha'], name: 'Sobrancelha', price: 7, duration_minutes: 10, category: 'Sobrancelha' },
    { matchNames: ['hidratacao'], name: 'Hidratacao', price: 20, duration_minutes: 30, category: 'Tratamento', description: 'Hidratacao capilar' },
    { matchNames: ['hidratacao barba'], name: 'Hidratacao Barba', price: 10, duration_minutes: 15, category: 'Tratamento', description: 'Hidratacao para a barba' },
    { matchNames: ['limpeza de pele'], name: 'Limpeza de Pele', price: 20, duration_minutes: 30, category: 'Tratamento' },
    { matchNames: ['selagem'], name: 'Selagem', price: 60, duration_minutes: 60, category: 'Tratamento' },
    { matchNames: ['luzes'], name: 'Luzes', price: 100, duration_minutes: 90, category: 'Coloracao' },
    { matchNames: ['platinado'], name: 'Platinado', price: 130, duration_minutes: 120, category: 'Coloracao' },
    { matchNames: ['pezinho'], name: 'Pezinho', price: 10, duration_minutes: 10, category: 'Corte' },
  ];

  const existing = db.prepare('SELECT id, name FROM services').all();
  const updateStmt = db.prepare(`
    UPDATE services SET name=@name, price=@price, duration_minutes=@duration_minutes,
      category=@category, description=COALESCE(description, @description)
    WHERE id=@id
  `);
  const insertStmt = db.prepare(`
    INSERT INTO services (name, description, price, duration_minutes, category, active)
    VALUES (@name, @description, @price, @duration_minutes, @category, 1)
  `);

  const tx = db.transaction(() => {
    priceTable.forEach((item) => {
      const match = existing.find((row) => item.matchNames.includes(normalizeName(row.name)));
      const payload = {
        name: item.name,
        price: item.price,
        duration_minutes: item.duration_minutes,
        category: item.category,
        description: item.description || null,
      };
      if (match) {
        updateStmt.run({ ...payload, id: match.id });
      } else {
        insertStmt.run(payload);
      }
    });
  });
  tx();

  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('migration_price_table', 'done');
}

// One-time cleanup: this shop currently has a single barber, but the demo
// seed used to create a second sample one. Soft-deactivate any extra
// seeded barber (keeps history, reversible from /admin/barbers) so the
// booking flow shows just one professional. Runs only once, guarded by a
// settings flag, so it never fights a barber added later through the admin panel.
function reconcileBarbersOnce() {
  const marker = db.prepare("SELECT value FROM settings WHERE key = 'migration_single_barber'").get();
  if (marker) return;

  const active = db.prepare("SELECT id, name FROM barbers WHERE status = 'active' ORDER BY id ASC").all();
  if (active.length > 1) {
    const deactivate = db.prepare("UPDATE barbers SET status = 'inactive' WHERE id = ?");
    active.slice(1).forEach((b) => deactivate.run(b.id));
  }

  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('migration_single_barber', 'done');
}

createSchema();
seed();
reconcileServicesOnce();
reconcileBarbersOnce();

module.exports = { db, DB_PATH, BACKUP_DIR, backup };
