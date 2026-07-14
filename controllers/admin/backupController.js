const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { DB_PATH, BACKUP_DIR, backup } = require('../../database/database');
const Log = require('../../models/Log');

function index(req, res) {
  const files = fs.existsSync(BACKUP_DIR)
    ? fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: stat.size, date: stat.mtime };
      })
      .sort((a, b) => b.date - a.date)
    : [];
  res.render('admin/backup/index', { title: 'Backup do Banco de Dados', files });
}

function createBackup(req, res) {
  const filename = `backup_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.db`;
  backup(path.join(BACKUP_DIR, filename))
    .then(() => {
      Log.record(req.session.user.id, 'backup_create', `Backup ${filename} gerado.`);
      req.flash('success', `Backup "${filename}" gerado com sucesso.`);
      res.redirect('/admin/backup');
    })
    .catch((err) => {
      console.error(err);
      req.flash('error', 'Falha ao gerar backup.');
      res.redirect('/admin/backup');
    });
}

function downloadBackup(req, res) {
  const file = path.join(BACKUP_DIR, req.params.filename);
  if (!file.startsWith(BACKUP_DIR) || !fs.existsSync(file)) {
    req.flash('error', 'Arquivo nao encontrado.');
    return res.redirect('/admin/backup');
  }
  res.download(file);
}

function removeBackup(req, res) {
  const file = path.join(BACKUP_DIR, req.params.filename);
  if (file.startsWith(BACKUP_DIR) && fs.existsSync(file)) {
    fs.unlinkSync(file);
    Log.record(req.session.user.id, 'backup_delete', `Backup ${req.params.filename} removido.`);
  }
  req.flash('success', 'Backup removido.');
  res.redirect('/admin/backup');
}

function restoreBackup(req, res) {
  if (!req.file) {
    req.flash('error', 'Selecione um arquivo .db para restaurar.');
    return res.redirect('/admin/backup');
  }
  const safetyFile = path.join(BACKUP_DIR, `pre-restore_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.db`);
  fs.copyFileSync(DB_PATH, safetyFile);
  fs.copyFileSync(req.file.path, DB_PATH);
  fs.unlinkSync(req.file.path);

  Log.record(req.session.user.id, 'backup_restore', 'Banco de dados restaurado a partir de upload.');
  req.flash('success', 'Banco restaurado. Reinicie o servidor para garantir consistencia total.');
  res.redirect('/admin/backup');
}

module.exports = { index, createBackup, downloadBackup, removeBackup, restoreBackup };
