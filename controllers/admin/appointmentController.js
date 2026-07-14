const Appointment = require('../../models/Appointment');
const Client = require('../../models/Client');
const Barber = require('../../models/Barber');
const Service = require('../../models/Service');
const Payment = require('../../models/Payment');
const Log = require('../../models/Log');
const notifications = require('../../utils/notifications');
const { getAvailableSlots } = require('../../utils/availability');

function list(req, res) {
  const { range, barberId, status, search, page, dateFrom, dateTo } = req.query;
  const result = Appointment.list({
    range, barberId, status, search, dateFrom, dateTo,
    page: Number(page) || 1,
  });
  res.render('admin/appointments/list', {
    title: 'Agendamentos',
    ...result,
    filters: { range, barberId, status, search, dateFrom, dateTo },
    barbers: Barber.all(),
  });
}

function newForm(req, res) {
  res.render('admin/appointments/form', {
    title: 'Novo Agendamento',
    appointment: null,
    clients: Client.all(),
    barbers: Barber.all({ onlyActive: true }),
    services: Service.all({ onlyActive: true }),
  });
}

function create(req, res) {
  const { client_id, barber_id, service_id, date, time, notes, status } = req.body;
  const service = Service.find(Number(service_id));

  const id = Appointment.create({
    client_id: Number(client_id),
    barber_id: Number(barber_id),
    service_id: Number(service_id),
    date, time,
    status: status || 'pending',
    notes: notes || null,
    price: service ? service.price : 0,
  });

  Log.record(req.session.user.id, 'appointment_create', `Agendamento #${id} criado.`);
  req.flash('success', 'Agendamento criado com sucesso.');
  res.redirect('/admin/appointments');
}

function editForm(req, res) {
  const appointment = Appointment.find(req.params.id);
  if (!appointment) {
    req.flash('error', 'Agendamento nao encontrado.');
    return res.redirect('/admin/appointments');
  }
  res.render('admin/appointments/form', {
    title: 'Editar Agendamento',
    appointment,
    clients: Client.all(),
    barbers: Barber.all({ onlyActive: true }),
    services: Service.all({ onlyActive: true }),
  });
}

function update(req, res) {
  const { client_id, barber_id, service_id, date, time, notes, status } = req.body;
  const service = Service.find(Number(service_id));

  Appointment.update(req.params.id, {
    client_id: Number(client_id),
    barber_id: Number(barber_id),
    service_id: Number(service_id),
    date, time,
    status: status || 'pending',
    notes: notes || null,
    price: service ? service.price : 0,
  });

  Log.record(req.session.user.id, 'appointment_update', `Agendamento #${req.params.id} atualizado.`);
  req.flash('success', 'Agendamento atualizado com sucesso.');
  res.redirect('/admin/appointments');
}

function remove(req, res) {
  Appointment.remove(req.params.id);
  Log.record(req.session.user.id, 'appointment_delete', `Agendamento #${req.params.id} excluido.`);
  req.flash('success', 'Agendamento excluido.');
  res.redirect('/admin/appointments');
}

function setStatus(req, res) {
  const { status } = req.body;
  const appointment = Appointment.find(req.params.id);
  if (!appointment) {
    req.flash('error', 'Agendamento nao encontrado.');
    return res.redirect('/admin/appointments');
  }

  Appointment.updateStatus(req.params.id, status);

  if (status === 'completed') {
    Payment.create(appointment.id, appointment.price, req.body.method || 'dinheiro');
    Client.registerVisit(appointment.client_id, appointment.date);
  }
  if (status === 'cancelled') {
    notifications.notifyCancellation(appointment).catch(() => {});
  }

  Log.record(req.session.user.id, 'appointment_status', `Agendamento #${appointment.id} -> ${status}.`);
  req.flash('success', 'Status atualizado.');
  res.redirect(req.get('referer') || '/admin/appointments');
}

function availableTimesJson(req, res) {
  const { barberId, serviceId, date } = req.query;
  if (!barberId || !serviceId || !date) return res.json([]);
  const service = Service.find(Number(serviceId));
  if (!service) return res.json([]);
  const slots = getAvailableSlots({ barberId: Number(barberId), date, durationMinutes: service.duration_minutes });
  res.json(slots);
}

module.exports = { list, newForm, create, editForm, update, remove, setStatus, availableTimesJson };
