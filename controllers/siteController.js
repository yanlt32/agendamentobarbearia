const Setting = require('../models/Setting');
const Service = require('../models/Service');
const Barber = require('../models/Barber');
const GalleryPhoto = require('../models/GalleryPhoto');

function index(req, res) {
  res.render('site/index', {
    title: Setting.get('shop_name', 'Barbearia'),
    settings: Setting.getAll(),
    services: Service.all({ onlyActive: true }),
    barbers: Barber.all({ onlyActive: true }),
    galleryPhotos: GalleryPhoto.all(),
  });
}

module.exports = { index };
