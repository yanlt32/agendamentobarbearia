const fs = require('fs');
const path = require('path');
const GalleryPhoto = require('../../models/GalleryPhoto');
const Log = require('../../models/Log');

function index(req, res) {
  res.render('admin/gallery/index', { title: 'Galeria', photos: GalleryPhoto.all() });
}

function upload(req, res) {
  if (!req.files || req.files.length === 0) {
    req.flash('error', 'Selecione ao menos uma foto.');
    return res.redirect('/admin/gallery');
  }

  req.files.forEach((file) => {
    GalleryPhoto.create({ path: `/uploads/gallery/${file.filename}`, caption: req.body.caption || null });
  });

  Log.record(req.session.user.id, 'gallery_upload', `${req.files.length} foto(s) adicionada(s) a galeria.`);
  req.flash('success', 'Fotos adicionadas com sucesso.');
  res.redirect('/admin/gallery');
}

function remove(req, res) {
  const photo = GalleryPhoto.find(req.params.id);
  if (photo) {
    GalleryPhoto.remove(photo.id);
    const filePath = path.join(__dirname, '..', '..', 'public', photo.path);
    fs.unlink(filePath, () => {});
    Log.record(req.session.user.id, 'gallery_delete', `Foto #${photo.id} removida da galeria.`);
  }
  req.flash('success', 'Foto removida.');
  res.redirect('/admin/gallery');
}

module.exports = { index, upload, remove };
