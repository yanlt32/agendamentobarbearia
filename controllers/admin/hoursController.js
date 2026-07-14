const WorkingHour = require('../../models/WorkingHour');
const Holiday = require('../../models/Holiday');
const Setting = require('../../models/Setting');
const Log = require('../../models/Log');

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado'];

function index(req, res) {
  res.render('admin/hours/index', {
    title: 'Horarios de Funcionamento',
    hours: WorkingHour.all(),
    holidays: Holiday.all(),
    weekdays: WEEKDAYS,
    slotInterval: Setting.get('slot_interval_minutes', '30'),
  });
}

function updateHours(req, res) {
  WEEKDAYS.forEach((_, wd) => {
    WorkingHour.update(wd, {
      is_open: req.body[`is_open_${wd}`] ? 1 : 0,
      open_time: req.body[`open_${wd}`] || null,
      close_time: req.body[`close_${wd}`] || null,
    });
  });
  if (req.body.slot_interval_minutes) {
    Setting.set('slot_interval_minutes', req.body.slot_interval_minutes);
  }
  Log.record(req.session.user.id, 'hours_update', 'Horarios de funcionamento atualizados.');
  req.flash('success', 'Horarios atualizados com sucesso.');
  res.redirect('/admin/hours');
}

function addHoliday(req, res) {
  const { date, description } = req.body;
  if (date) {
    Holiday.create({ date, description: description || null });
    Log.record(req.session.user.id, 'holiday_create', `Feriado ${date} cadastrado.`);
    req.flash('success', 'Feriado/bloqueio cadastrado.');
  }
  res.redirect('/admin/hours');
}

function removeHoliday(req, res) {
  Holiday.remove(req.params.id);
  Log.record(req.session.user.id, 'holiday_delete', `Feriado #${req.params.id} removido.`);
  req.flash('success', 'Feriado/bloqueio removido.');
  res.redirect('/admin/hours');
}

module.exports = { index, updateHours, addHoliday, removeHoliday };
