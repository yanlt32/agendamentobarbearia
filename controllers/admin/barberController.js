const Barber = require('../../models/Barber');
const Service = require('../../models/Service');
const Log = require('../../models/Log');

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terca-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sabado' },
];

function list(req, res) {
  res.render('admin/barbers/list', { title: 'Barbeiros', barbers: Barber.all() });
}

function newForm(req, res) {
  res.render('admin/barbers/form', {
    title: 'Novo Barbeiro',
    barber: null,
    services: Service.all({ onlyActive: true }),
    selectedServices: [],
    schedule: [],
    weekdays: WEEKDAYS,
  });
}

function buildScheduleFromBody(body) {
  return WEEKDAYS.map((wd) => ({
    weekday: wd.value,
    is_off: body[`is_off_${wd.value}`] ? 1 : 0,
    start_time: body[`start_${wd.value}`] || '09:00',
    end_time: body[`end_${wd.value}`] || '19:00',
  }));
}

function create(req, res) {
  const { name, specialty, status } = req.body;
  const photo = req.file ? `/uploads/barbers/${req.file.filename}` : null;

  const id = Barber.create({ name, specialty: specialty || null, photo, status: status || 'active' });

  const serviceIds = [].concat(req.body.services || []).map(Number);
  Barber.setServices(id, serviceIds);
  Barber.setSchedule(id, buildScheduleFromBody(req.body));

  Log.record(req.session.user.id, 'barber_create', `Barbeiro #${id} criado.`);
  req.flash('success', 'Barbeiro cadastrado com sucesso.');
  res.redirect('/admin/barbers');
}

function editForm(req, res) {
  const barber = Barber.find(req.params.id);
  if (!barber) {
    req.flash('error', 'Barbeiro nao encontrado.');
    return res.redirect('/admin/barbers');
  }
  const selectedServices = Barber.getServices(barber.id).map((s) => s.id);
  const scheduleRows = Barber.getSchedule(barber.id);
  const schedule = WEEKDAYS.map((wd) => scheduleRows.find((s) => s.weekday === wd.value) || {
    weekday: wd.value, start_time: '09:00', end_time: '19:00', is_off: wd.value === 0 ? 1 : 0,
  });

  res.render('admin/barbers/form', {
    title: 'Editar Barbeiro',
    barber,
    services: Service.all({ onlyActive: true }),
    selectedServices,
    schedule,
    weekdays: WEEKDAYS,
  });
}

function update(req, res) {
  const { name, specialty, status } = req.body;
  const existing = Barber.find(req.params.id);
  const photo = req.file ? `/uploads/barbers/${req.file.filename}` : existing.photo;

  Barber.update(req.params.id, { name, specialty: specialty || null, photo, status: status || 'active' });

  const serviceIds = [].concat(req.body.services || []).map(Number);
  Barber.setServices(req.params.id, serviceIds);
  Barber.setSchedule(req.params.id, buildScheduleFromBody(req.body));

  Log.record(req.session.user.id, 'barber_update', `Barbeiro #${req.params.id} atualizado.`);
  req.flash('success', 'Barbeiro atualizado com sucesso.');
  res.redirect('/admin/barbers');
}

function remove(req, res) {
  Barber.remove(req.params.id);
  Log.record(req.session.user.id, 'barber_delete', `Barbeiro #${req.params.id} excluido.`);
  req.flash('success', 'Barbeiro excluido.');
  res.redirect('/admin/barbers');
}

module.exports = { list, newForm, create, editForm, update, remove, WEEKDAYS };
