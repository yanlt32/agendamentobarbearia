const dayjs = require('dayjs');
const Appointment = require('../../models/Appointment');
const Service = require('../../models/Service');
const Client = require('../../models/Client');

function index(req, res) {
  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

  const stats = {
    todayCount: Appointment.countByDate(today),
    monthCount: Appointment.countBetween(monthStart, monthEnd),
    todayRevenue: Appointment.revenueByDate(today),
    monthRevenue: Appointment.revenueBetween(monthStart, monthEnd),
    totalClients: Client.count(),
    newClientsMonth: Client.newClientsBetween(monthStart, monthEnd),
    avgTicket: Appointment.averageTicket(monthStart, monthEnd),
  };

  const upcoming = Appointment.upcoming(8);
  const topServices = Service.topSold(monthStart, monthEnd, 5);

  const revenueSeries = Appointment.revenueSeries(dayjs().subtract(13, 'day').format('YYYY-MM-DD'), today);
  const appointmentsByMonth = Appointment.appointmentsByMonthSeries(dayjs().subtract(5, 'month').startOf('month').format('YYYY-MM-DD'));

  res.render('admin/dashboard', {
    title: 'Dashboard',
    stats,
    upcoming,
    topServices,
    revenueSeries,
    appointmentsByMonth,
  });
}

function today(req, res) {
  const { rows } = Appointment.list({ range: 'today', perPage: 200 });
  rows.sort((a, b) => a.time.localeCompare(b.time));

  res.render('admin/today', {
    title: 'Agendamentos de hoje',
    rows,
    todayFormatted: dayjs().format('DD/MM/YYYY'),
  });
}

module.exports = { index, today };
