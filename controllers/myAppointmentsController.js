const dayjs = require('dayjs');
const Client = require('../models/Client');
const Appointment = require('../models/Appointment');
const realtime = require('../utils/realtime');

const CANCEL_CUTOFF_MINUTES = 120;

function cpfDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

// Phone alone was never enough (anyone who knows/guesses a number could
// manage a stranger's booking). Phone + 3 CPF digits given at booking time
// is the credential now -- something the client already knows by heart, no
// link to lose, and nothing the barber has to resend. Uses the 3 digits
// right before the 2 check digits (not the check digits themselves, which
// are just computed from the other 9 and add no real secrecy).
function verifyIdentity(phone, cpf3) {
  const client = Client.findByPhone(phone);
  if (!client || !client.cpf) return null;
  if (cpfDigits(client.cpf).slice(-5, -2) !== cpfDigits(cpf3)) return null;
  return client;
}

function show(req, res) {
  const phone = (req.query.phone || '').trim();
  const cpf3 = (req.query.cpf3 || '').trim();
  const searched = !!(phone && cpf3);

  let foundClient = null;
  let identityError = false;
  let upcoming = [];
  let past = [];

  if (searched) {
    foundClient = verifyIdentity(phone, cpf3);
    if (!foundClient) {
      identityError = true;
    } else {
      const today = dayjs().format('YYYY-MM-DD');
      const all = Client.history(foundClient.id);
      upcoming = all
        .filter((a) => a.date >= today && a.status !== 'cancelled')
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .map((a) => ({ ...a, canManage: ['pending', 'confirmed'].includes(a.status) && minutesUntilDateTime(a.date, a.time) >= CANCEL_CUTOFF_MINUTES }));
      past = all.filter((a) => a.date < today || a.status === 'cancelled');
    }
  }

  res.render('site/my-appointments', {
    title: 'Meus Agendamentos',
    phone,
    cpf3,
    searched,
    identityError,
    foundClient,
    upcoming,
    past,
  });
}

function lookup(req, res) {
  const phone = (req.body.phone || '').trim();
  const cpf3 = (req.body.cpf3 || '').trim();
  res.redirect(`/meus-agendamentos?phone=${encodeURIComponent(phone)}&cpf3=${encodeURIComponent(cpf3)}`);
}

function minutesUntilDateTime(date, time) {
  return dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm').diff(dayjs(), 'minute');
}

function backToList(phone, cpf3) {
  return `/meus-agendamentos?phone=${encodeURIComponent(phone)}&cpf3=${encodeURIComponent(cpf3)}`;
}

// Both actions require the same phone + 3-CPF-digit proof as the listing
// page (sent as hidden fields on each row's form) -- so a stolen/guessed
// phone number alone still isn't enough to touch someone else's booking.
function cancel(req, res) {
  const phone = (req.body.phone || '').trim();
  const cpf3 = (req.body.cpf3 || '').trim();
  const client = verifyIdentity(phone, cpf3);
  const appointment = client ? Appointment.find(Number(req.params.id)) : null;

  if (!client || !appointment || appointment.client_id !== client.id) {
    req.flash('error', 'Nao foi possivel confirmar sua identidade.');
    return res.redirect(backToList(phone, cpf3));
  }
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    req.flash('error', 'Este agendamento nao pode mais ser cancelado.');
    return res.redirect(backToList(phone, cpf3));
  }
  if (minutesUntilDateTime(appointment.date, appointment.time) < CANCEL_CUTOFF_MINUTES) {
    req.flash('error', 'Cancelamentos so podem ser feitos ate 2 horas antes do horario. Entre em contato com a barbearia.');
    return res.redirect(backToList(phone, cpf3));
  }

  Appointment.updateStatus(appointment.id, 'cancelled');
  realtime.broadcast('status', { id: appointment.id, status: 'cancelled' });
  req.flash('success', 'Agendamento cancelado.');
  res.redirect(backToList(phone, cpf3));
}

function reschedule(req, res) {
  const phone = (req.body.phone || '').trim();
  const cpf3 = (req.body.cpf3 || '').trim();
  const client = verifyIdentity(phone, cpf3);
  const appointment = client ? Appointment.find(Number(req.params.id)) : null;

  if (!client || !appointment || appointment.client_id !== client.id) {
    req.flash('error', 'Nao foi possivel confirmar sua identidade.');
    return res.redirect(backToList(phone, cpf3));
  }
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    req.flash('error', 'Este agendamento nao pode mais ser remarcado.');
    return res.redirect(backToList(phone, cpf3));
  }
  if (minutesUntilDateTime(appointment.date, appointment.time) < CANCEL_CUTOFF_MINUTES) {
    req.flash('error', 'Remarcacoes so podem ser feitas ate 2 horas antes do horario. Entre em contato com a barbearia.');
    return res.redirect(backToList(phone, cpf3));
  }

  Appointment.updateStatus(appointment.id, 'cancelled');
  realtime.broadcast('status', { id: appointment.id, status: 'cancelled' });
  req.flash('success', 'Seu horario anterior foi liberado. Escolha o novo horario abaixo.');
  res.redirect(`/agendar?service_id=${appointment.service_id}&barber_id=${appointment.barber_id}&prefill=${appointment.access_token}`);
}

// Private per-appointment link (from the confirmation page / WhatsApp
// reminder) -- kept as a convenience shortcut alongside phone+CPF, since
// some clients will still have it saved.
function showByToken(req, res) {
  const appointment = Appointment.findByToken(req.params.token);
  if (!appointment) {
    return res.status(404).render('site/manage-appointment', { title: 'Agendamento', appointment: null });
  }
  res.render('site/manage-appointment', {
    title: 'Gerenciar Agendamento',
    appointment,
    canManage: ['pending', 'confirmed'].includes(appointment.status) && minutesUntilDateTime(appointment.date, appointment.time) >= CANCEL_CUTOFF_MINUTES,
  });
}

function cancelByToken(req, res) {
  const appointment = Appointment.findByToken(req.params.token);
  if (!appointment) return res.redirect('/');

  if (!['pending', 'confirmed'].includes(appointment.status)) {
    req.flash('error', 'Este agendamento nao pode mais ser cancelado.');
    return res.redirect(`/meu-agendamento/${req.params.token}`);
  }
  if (minutesUntilDateTime(appointment.date, appointment.time) < CANCEL_CUTOFF_MINUTES) {
    req.flash('error', 'Cancelamentos so podem ser feitos ate 2 horas antes do horario. Entre em contato com a barbearia.');
    return res.redirect(`/meu-agendamento/${req.params.token}`);
  }

  Appointment.updateStatus(appointment.id, 'cancelled');
  realtime.broadcast('status', { id: appointment.id, status: 'cancelled' });
  req.flash('success', 'Agendamento cancelado.');
  res.redirect(`/meu-agendamento/${req.params.token}`);
}

function rescheduleByToken(req, res) {
  const appointment = Appointment.findByToken(req.params.token);
  if (!appointment) return res.redirect('/');

  if (!['pending', 'confirmed'].includes(appointment.status)) {
    req.flash('error', 'Este agendamento nao pode mais ser remarcado.');
    return res.redirect(`/meu-agendamento/${req.params.token}`);
  }
  if (minutesUntilDateTime(appointment.date, appointment.time) < CANCEL_CUTOFF_MINUTES) {
    req.flash('error', 'Remarcacoes so podem ser feitas ate 2 horas antes do horario. Entre em contato com a barbearia.');
    return res.redirect(`/meu-agendamento/${req.params.token}`);
  }

  Appointment.updateStatus(appointment.id, 'cancelled');
  realtime.broadcast('status', { id: appointment.id, status: 'cancelled' });
  req.flash('success', 'Seu horario anterior foi liberado. Escolha o novo horario abaixo.');
  res.redirect(`/agendar?service_id=${appointment.service_id}&barber_id=${appointment.barber_id}&prefill=${appointment.access_token}`);
}

module.exports = { show, lookup, cancel, reschedule, showByToken, cancelByToken, rescheduleByToken };
