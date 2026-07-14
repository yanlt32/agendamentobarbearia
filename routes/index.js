const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const bookingController = require('../controllers/bookingController');

router.get('/', siteController.index);

router.get('/agendar', bookingController.showBooking);
router.post('/agendar', bookingController.createBooking);
router.get('/agendar/sucesso', bookingController.bookingSuccess);
router.get('/agendar/:id/calendario.ics', bookingController.downloadIcs);

router.get('/api/barbers-by-service/:serviceId', bookingController.barbersByService);
router.get('/api/available-times', bookingController.availableTimes);

module.exports = router;
