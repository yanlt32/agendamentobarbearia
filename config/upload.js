const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'public', 'uploads');
const TMP_ROOT = path.join(__dirname, '..', 'database', 'tmp');

['barbers', 'settings', 'gallery'].forEach((dir) => {
  const full = path.join(UPLOAD_ROOT, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});
if (!fs.existsSync(TMP_ROOT)) fs.mkdirSync(TMP_ROOT, { recursive: true });

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, subfolder)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  });
}

const imageFilter = (req, file, cb) => {
  if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) return cb(null, true);
  cb(new Error('Apenas arquivos de imagem sao permitidos.'));
};

const uploadBarberPhoto = multer({ storage: makeStorage('barbers'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadLogo = multer({ storage: makeStorage('settings'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadGalleryPhoto = multer({ storage: makeStorage('gallery'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadDbFile = multer({ dest: TMP_ROOT, limits: { fileSize: 200 * 1024 * 1024 } });

module.exports = { uploadBarberPhoto, uploadLogo, uploadGalleryPhoto, uploadDbFile };
