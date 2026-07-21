const Setting = require('../models/Setting');
const Service = require('../models/Service');
const Barber = require('../models/Barber');
const GalleryPhoto = require('../models/GalleryPhoto');

function index(req, res) {
  const galleryPhotos = GalleryPhoto.all();
  // First non-video gallery upload becomes the hero backdrop, so the
  // homepage picks up real shop photos automatically once he uploads any.
  const heroPhoto = galleryPhotos.find((p) => !/\.(mp4|webm|mov|m4v)$/i.test(p.path));

  res.render('site/index', {
    title: Setting.get('shop_name', 'Barbearia'),
    settings: Setting.getAll(),
    services: Service.all({ onlyActive: true }),
    barbers: Barber.all({ onlyActive: true }),
    galleryPhotos,
    heroPhoto,
  });
}

module.exports = { index };
