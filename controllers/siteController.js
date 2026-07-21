const Setting = require('../models/Setting');
const Service = require('../models/Service');
const Barber = require('../models/Barber');
const GalleryPhoto = require('../models/GalleryPhoto');

function index(req, res) {
  const galleryPhotos = GalleryPhoto.all();
  // Up to 5 non-video gallery uploads become a crossfading hero backdrop
  // slideshow, so the homepage picks up real shop photos automatically
  // once he uploads any. With none uploaded yet, falls back to a designed
  // background graphic (public/img/hero-bg.svg) instead of the photos.
  const heroPhotos = galleryPhotos.filter((p) => !/\.(mp4|webm|mov|m4v)$/i.test(p.path)).slice(0, 5);

  res.render('site/index', {
    title: Setting.get('shop_name', 'Barbearia'),
    settings: Setting.getAll(),
    services: Service.all({ onlyActive: true }),
    barbers: Barber.all({ onlyActive: true }),
    galleryPhotos,
    heroPhotos,
  });
}

module.exports = { index };
