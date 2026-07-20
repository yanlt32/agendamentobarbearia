const dayjs = require('dayjs');
const Service = require('../models/Service');
const Barber = require('../models/Barber');
const Client = require('../models/Client');
const Appointment = require('../models/Appointment');
const Holiday = require('../models/Holiday');
const Setting = require('../models/Setting');
const { getAvailableSlots } = require('../utils/availability');
const notifications = require('../utils/notifications');
const realtime = require('../utils/realtime');

function showBooking(req, res) {
  const barbers = Barber.all({ onlyActive: true });
  res.render('site/booking', {
    title: 'Agendar Horario',
    services: Service.all({ onlyActive: true }),
    barbers,
    singleBarber: barbers.length === 1 ? barbers[0] : null,
    minDate: dayjs().format('YYYY-MM-DD'),
    maxDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
  });
}

function barbersByService(req, res) {
  const serviceId = Number(req.params.serviceId);
  const barbers = Barber.all({ onlyActive: true }).filter((b) =>
    Barber.getServices(b.id).some((s) => s.id === serviceId)
  );
  res.json(barbers);
}

function availableTimes(req, res) {
  const { barberId, serviceId, date } = req.query;
  if (!barberId || !serviceId || !date) return res.json([]);

  if (dayjs(date).isBefore(dayjs(), 'day')) return res.json([]);
  if (Holiday.findByDate(date)) return res.json([]);

  const service = Service.find(Number(serviceId));
  if (!service) return res.json([]);

  const slots = getAvailableSlots({
    barberId: Number(barberId),
    date,
    durationMinutes: service.duration_minutes,
  });
  res.json(slots);
}

async function createBooking(req, res) {
  const { service_id, barber_id, date, time, name, phone, email, notes } = req.body;

  if (!service_id || !barber_id || !date || !time || !name || !phone) {
    req.flash('error', 'Preencha todos os campos obrigatorios.');
    return res.redirect('/agendar');
  }

  const phoneDigits = String(phone).replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    req.flash('error', 'Informe um numero de WhatsApp valido, com DDD.');
    return res.redirect('/agendar');
  }

  const service = Service.find(Number(service_id));
  if (!service) {
    req.flash('error', 'Servico invalido.');
    return res.redirect('/agendar');
  }

  const slots = getAvailableSlots({
    barberId: Number(barber_id),
    date,
    durationMinutes: service.duration_minutes,
  });
  const slot = slots.find((s) => s.time === time);
  if (!slot || !slot.available) {
    req.flash('error', 'Este horario nao esta mais disponivel. Escolha outro.');
    return res.redirect('/agendar');
  }

  let client = Client.findByPhone(phone);
  if (!client) {
    const clientId = Client.create({ name, phone, email: email || null });
    client = Client.find(clientId);
  }

  // Shop has no secretary/receptionist to manually confirm every booking, so
  // appointments made through the public site are already confirmed.
  const appointmentId = Appointment.create({
    client_id: client.id,
    barber_id: Number(barber_id),
    service_id: Number(service_id),
    date,
    time,
    status: 'confirmed',
    notes: notes || null,
    price: service.price,
  });

  const appointment = Appointment.find(appointmentId);
  notifications.notifyNewAppointment(appointment).catch(() => {});
  realtime.broadcast('created', { id: appointmentId });

  res.redirect(`/agendar/sucesso?id=${appointmentId}`);
}

function bookingSuccess(req, res) {
  const appointment = Appointment.find(Number(req.query.id));
  if (!appointment) return res.redirect('/agendar');
  res.render('site/booking-success', { title: 'Agendamento Confirmado', appointment });
}

function icsEscape(text) {
  return String(text).replace(/[,;]/g, (m) => `\\${m}`);
}

function downloadIcs(req, res) {
  const appointment = Appointment.find(Number(req.params.id));
  if (!appointment) return res.redirect('/agendar');

  const shopName = Setting.get('shop_name', 'Barbearia');
  const address = Setting.get('address', '');

  const start = dayjs(`${appointment.date} ${appointment.time}`, 'YYYY-MM-DD HH:mm');
  const end = start.add(appointment.duration_minutes || 30, 'minute');
  const fmt = (d) => d.format('YYYYMMDDTHHmmss');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//' + icsEscape(shopName) + '//Agendamento//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:agendamento-${appointment.id}@${icsEscape(shopName).replace(/\s+/g, '').toLowerCase()}`,
    `DTSTAMP:${fmt(dayjs())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${icsEscape(appointment.service_name)} - ${icsEscape(shopName)}`,
    `DESCRIPTION:Agendamento com ${icsEscape(appointment.barber_name)} na ${icsEscape(shopName)}.`,
    `LOCATION:${icsEscape(address)}`,
    // Reminder pops up on the client's phone/calendar 1h before the
    // appointment -- no WhatsApp/SMS provider needed for this to work.
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:Lembrete: seu horario na ${icsEscape(shopName)} e daqui a 1 hora.`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="agendamento-${appointment.id}.ics"`);
  res.send(ics);
}

module.exports = { showBooking, barbersByService, availableTimes, createBooking, bookingSuccess, downloadIcs };
