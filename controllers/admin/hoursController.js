const WorkingHour = require('../../models/WorkingHour');
const Holiday = require('../../models/Holiday');
const Setting = require('../../models/Setting');
const Barber = require('../../models/Barber');
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
  const barberIds = Barber.all().map((b) => b.id);

  WEEKDAYS.forEach((_, wd) => {
    const isOpen = !!req.body[`is_open_${wd}`];
    const openTime = req.body[`open_${wd}`] || '08:00';
    const closeTime = req.body[`close_${wd}`] || '19:00';
    // Optional lunch break -- blank fields mean no break that day.
    const breakStart = req.body[`break_start_${wd}`] || null;
    const breakEnd = req.body[`break_end_${wd}`] || null;

    WorkingHour.update(wd, {
      is_open: isOpen ? 1 : 0,
      open_time: openTime,
      close_time: closeTime,
      break_start: breakStart,
      break_end: breakEnd,
    });

    // This page is the shop's single source of truth for hours, but actual
    // booking availability is checked per-barber (barber_schedules) -- so
    // without this, changing hours here (e.g. opening on Sunday, or setting
    // a lunch break) silently had zero effect on what clients could book.
    barberIds.forEach((barberId) => {
      Barber.upsertScheduleForWeekday(barberId, wd, {
        start_time: openTime,
        end_time: closeTime,
        is_off: !isOpen,
        break_start: breakStart,
        break_end: breakEnd,
      });
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
