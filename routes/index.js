const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const bookingController = require('../controllers/bookingController');
const myAppointmentsController = require('../controllers/myAppointmentsController');

router.get('/', siteController.index);

router.get('/agendar', bookingController.showBooking);
router.post('/agendar', bookingController.createBooking);
router.get('/agendar/sucesso', bookingController.bookingSuccess);
router.get('/agendar/:id/calendario.ics', bookingController.downloadIcs);

// Primary flow: phone + last 4 CPF digits (set at booking time) authorizes
// viewing and managing appointments -- no link to save, no account.
router.get('/meus-agendamentos', myAppointmentsController.show);
router.post('/meus-agendamentos', myAppointmentsController.lookup);
router.post('/meus-agendamentos/:id/cancelar', myAppointmentsController.cancel);
router.post('/meus-agendamentos/:id/remarcar', myAppointmentsController.reschedule);

// Secondary shortcut: private per-appointment link (token in the URL) from
// the booking confirmation / WhatsApp reminder, for clients who saved it.
router.get('/meu-agendamento/:token', myAppointmentsController.showByToken);
router.post('/meu-agendamento/:token/cancelar', myAppointmentsController.cancelByToken);
router.post('/meu-agendamento/:token/remarcar', myAppointmentsController.rescheduleByToken);

router.get('/api/barbers-by-service/:serviceId', bookingController.barbersByService);
router.get('/api/available-times', bookingController.availableTimes);

module.exports = router;
