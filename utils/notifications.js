/**
 * Camada de notificacoes. Hoje apenas loga no console; preparado para
 * futura integracao com WhatsApp (ex: API oficial/Twilio), Email (nodemailer)
 * e SMS. Basta implementar os metodos internos abaixo sem alterar quem chama.
 */

function sendWhatsApp(to, message) {
  console.log(`[WhatsApp -> ${to}] ${message}`);
  return Promise.resolve({ ok: true, channel: 'whatsapp', simulated: true });
}

function sendEmail(to, subject, message) {
  console.log(`[Email -> ${to}] ${subject}: ${message}`);
  return Promise.resolve({ ok: true, channel: 'email', simulated: true });
}

function sendSMS(to, message) {
  console.log(`[SMS -> ${to}] ${message}`);
  return Promise.resolve({ ok: true, channel: 'sms', simulated: true });
}

async function notifyNewAppointment(appointment) {
  const msg = `Agendamento confirmado para ${appointment.date} as ${appointment.time}.`;
  return sendWhatsApp(appointment.client_phone, msg);
}

async function notifyCancellation(appointment) {
  const msg = `Seu agendamento de ${appointment.date} as ${appointment.time} foi cancelado.`;
  return sendWhatsApp(appointment.client_phone, msg);
}

async function notifyReminder(appointment) {
  const msg = `Lembrete: voce tem um horario amanha, ${appointment.date} as ${appointment.time}.`;
  return sendWhatsApp(appointment.client_phone, msg);
}

module.exports = { sendWhatsApp, sendEmail, sendSMS, notifyNewAppointment, notifyCancellation, notifyReminder };
