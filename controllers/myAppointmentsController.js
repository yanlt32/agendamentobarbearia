const dayjs = require('dayjs');
const Client = require('../models/Client');
const Appointment = require('../models/Appointment');
const realtime = require('../utils/realtime');

const CANCEL_CUTOFF_MINUTES = 120;

function normalizeName(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Phone alone was never enough (anyone who knows/guesses a number could
// manage a stranger's booking). Phone + the exact full name given at
// booking time is the credential -- simple, no link to lose, nothing the
// barber has to resend. Weaker than a random token, but that's the
// trade-off the shop owner chose over asking clients for CPF.
function verifyIdentity(phone, name) {
  const client = Client.findByPhone(phone);
  if (!client || !client.name) return null;
  if (normalizeName(client.name) !== normalizeName(name)) return null;
  return client;
}

function show(req, res) {
  const phone = (req.query.phone || '').trim();
  const name = (req.query.name || '').trim();
  const searched = !!(phone && name);

  let foundClient = null;
  let identityError = false;
  let upcoming = [];
  let past = [];

  if (searched) {
    foundClient = verifyIdentity(phone, name);
    if (!foundClient) {
      identityError = true;
    } else {
      const today = dayjs().format('YYYY-MM-DD');
      const all = Client.history(foundClient.id);
      upcoming = all
        .filter((a) => a.date >= today && !['cancelled', 'rescheduled'].includes(a.status))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .map((a) => ({ ...a, canManage: ['pending', 'confirmed'].includes(a.status) && minutesUntilDateTime(a.date, a.time) >= CANCEL_CUTOFF_MINUTES }));
      past = all.filter((a) => a.date < today || ['cancelled', 'rescheduled'].includes(a.status));
    }
  }

  res.render('site/my-appointments', {
    title: 'Meus Agendamentos',
    phone,
    name,
    searched,
    identityError,
    foundClient,
    upcoming,
    past,
  });
}

function lookup(req, res) {
  const phone = (req.body.phone || '').trim();
  const name = (req.body.name || '').trim();
  res.redirect(`/meus-agendamentos?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}`);
}

function minutesUntilDateTime(date, time) {
  return dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm').diff(dayjs(), 'minute');
}

function backToList(phone, name) {
  return `/meus-agendamentos?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}`;
}

// Both actions require the same phone + name proof as the listing page
// (sent as hidden fields on each row's form) -- so a stolen/guessed phone
// number alone still isn't enough to touch someone else's booking.
function cancel(req, res) {
  const phone = (req.body.phone || '').trim();
  const name = (req.body.name || '').trim();
  const client = verifyIdentity(phone, name);
  const appointment = client ? Appointment.find(Number(req.params.id)) : null;

  if (!client || !appointment || appointment.client_id !== client.id) {
    req.flash('error', 'Nao foi possivel confirmar sua identidade.');
    return res.redirect(backToList(phone, name));
  }
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    req.flash('error', 'Este agendamento nao pode mais ser cancelado.');
    return res.redirect(backToList(phone, name));
  }
  if (minutesUntilDateTime(appointment.date, appointment.time) < CANCEL_CUTOFF_MINUTES) {
    req.flash('error', 'Cancelamentos so podem ser feitos ate 2 horas antes do horario. Entre em contato com a barbearia.');
    return res.redirect(backToList(phone, name));
  }

  Appointment.updateStatus(appointment.id, 'cancelled');
  realtime.broadcast('status', { id: appointment.id, status: 'cancelled' });
  req.flash('success', 'Agendamento cancelado.');
  res.redirect(backToList(phone, name));
}

// Reschedule does NOT touch the old appointment yet -- it just sends the
// client to pick a new time, carrying the old appointment's token along.
// The old one only gets marked 'rescheduled' once the new booking is
// actually confirmed (see bookingController.createBooking). This way,
// abandoning the reschedule mid-flow (e.g. no time works) leaves the
// original booking untouched instead of losing it for nothing.
function reschedule(req, res) {
  const phone = (req.body.phone || '').trim();
  const name = (req.body.name || '').trim();
  const client = verifyIdentity(phone, name);
  const appointment = client ? Appointment.find(Number(req.params.id)) : null;

  if (!client || !appointment || appointment.client_id !== client.id) {
    req.flash('error', 'Nao foi possivel confirmar sua identidade.');
    return res.redirect(backToList(phone, name));
  }
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    req.flash('error', 'Este agendamento nao pode mais ser remarcado.');
    return res.redirect(backToList(phone, name));
  }
  if (minutesUntilDateTime(appointment.date, appointment.time) < CANCEL_CUTOFF_MINUTES) {
    req.flash('error', 'Remarcacoes so podem ser feitas ate 2 horas antes do horario. Entre em contato com a barbearia.');
    return res.redirect(backToList(phone, name));
  }

  res.redirect(`/agendar?service_id=${appointment.service_id}&barber_id=${appointment.barber_id}&reschedule_of=${appointment.access_token}`);
}

// Private per-appointment link (from the confirmation page / WhatsApp
// reminder) -- kept as a convenience shortcut alongside phone+name, since
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

  res.redirect(`/agendar?service_id=${appointment.service_id}&barber_id=${appointment.barber_id}&reschedule_of=${appointment.access_token}`);
}

module.exports = { show, lookup, cancel, reschedule, showByToken, cancelByToken, rescheduleByToken };
