const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const { uploadBarberPhoto, uploadLogo, uploadGalleryPhoto, uploadDbFile } = require('../config/upload');

const dashboardController = require('../controllers/admin/dashboardController');
const appointmentController = require('../controllers/admin/appointmentController');
const clientController = require('../controllers/admin/clientController');
const barberController = require('../controllers/admin/barberController');
const serviceController = require('../controllers/admin/serviceController');
const hoursController = require('../controllers/admin/hoursController');
const financialController = require('../controllers/admin/financialController');
const settingsController = require('../controllers/admin/settingsController');
const backupController = require('../controllers/admin/backupController');
const galleryController = require('../controllers/admin/galleryController');
const Log = require('../models/Log');
const realtime = require('../utils/realtime');

router.use(requireAuth);

router.get('/', (req, res) => res.redirect('/admin/dashboard'));
router.get('/dashboard', dashboardController.index);

// Live updates: any device with an admin page open gets notified the
// instant an appointment is created/edited/cancelled anywhere else.
router.get('/stream', realtime.stream);

// Appointments
router.get('/appointments', appointmentController.list);
router.get('/appointments/new', appointmentController.newForm);
router.post('/appointments', appointmentController.create);
router.get('/appointments/available-times', appointmentController.availableTimesJson);
// Must be registered before /appointments/:id or "bulk-complete" would be read as an :id.
router.post('/appointments/bulk-complete', appointmentController.bulkComplete);
router.get('/appointments/:id/edit', appointmentController.editForm);
router.post('/appointments/:id', appointmentController.update);
router.post('/appointments/:id/status', appointmentController.setStatus);
router.post('/appointments/:id/delete', appointmentController.remove);

// Clients
router.get('/clients', clientController.list);
router.get('/clients/new', clientController.newForm);
router.post('/clients', clientController.create);
router.get('/clients/:id', clientController.show);
router.get('/clients/:id/edit', clientController.editForm);
router.post('/clients/:id', clientController.update);
router.post('/clients/:id/delete', clientController.remove);

// Barbers
router.get('/barbers', barberController.list);
router.get('/barbers/new', barberController.newForm);
router.post('/barbers', uploadBarberPhoto.single('photo'), barberController.create);
router.get('/barbers/:id/edit', barberController.editForm);
router.post('/barbers/:id', uploadBarberPhoto.single('photo'), barberController.update);
router.post('/barbers/:id/delete', barberController.remove);

// Services
router.get('/services', serviceController.list);
router.get('/services/new', serviceController.newForm);
router.post('/services', serviceController.create);
router.get('/services/:id/edit', serviceController.editForm);
router.post('/services/:id', serviceController.update);
router.post('/services/:id/price', serviceController.updatePrice);
router.post('/services/:id/delete', serviceController.remove);

// Working hours & holidays
router.get('/hours', hoursController.index);
router.post('/hours', hoursController.updateHours);
router.post('/hours/holidays', hoursController.addHoliday);
router.post('/hours/holidays/:id/delete', hoursController.removeHoliday);

// Financial
router.get('/financial', financialController.index);
router.get('/financial/export.csv', financialController.exportCsv);

// Settings
router.get('/settings', settingsController.index);
router.post('/settings', uploadLogo.single('logo'), settingsController.update);

// Gallery (barbershop photos shown on the public site)
router.get('/gallery', galleryController.index);
router.post('/gallery', uploadGalleryPhoto.array('photos', 10), galleryController.upload);
router.post('/gallery/:id/delete', galleryController.remove);

// Backup
router.get('/backup', backupController.index);
router.post('/backup', backupController.createBackup);
router.get('/backup/:filename/download', backupController.downloadBackup);
router.post('/backup/:filename/delete', backupController.removeBackup);
router.post('/backup/restore', uploadDbFile.single('dbfile'), backupController.restoreBackup);

// Logs
router.get('/logs', (req, res) => res.render('admin/logs/index', { title: 'Logs do Sistema', logs: Log.recent(100) }));

module.exports = router;
