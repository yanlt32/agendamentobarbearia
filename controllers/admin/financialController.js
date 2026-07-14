const dayjs = require('dayjs');
const { db } = require('../../database/database');
const Appointment = require('../../models/Appointment');
const Service = require('../../models/Service');
const Client = require('../../models/Client');
const Payment = require('../../models/Payment');

function resolveRange(period, from, to) {
  const today = dayjs();
  if (from && to) return { start: from, end: to, label: `${from} a ${to}` };
  switch (period) {
    case 'week':
      return { start: today.startOf('week').format('YYYY-MM-DD'), end: today.endOf('week').format('YYYY-MM-DD'), label: 'Esta semana' };
    case 'year':
      return { start: today.startOf('year').format('YYYY-MM-DD'), end: today.endOf('year').format('YYYY-MM-DD'), label: 'Este ano' };
    case 'day':
      return { start: today.format('YYYY-MM-DD'), end: today.format('YYYY-MM-DD'), label: 'Hoje' };
    case 'month':
    default:
      return { start: today.startOf('month').format('YYYY-MM-DD'), end: today.endOf('month').format('YYYY-MM-DD'), label: 'Este mes' };
  }
}

function buildReport(period, from, to) {
  const { start, end, label } = resolveRange(period, from, to);
  const revenue = Appointment.revenueBetween(start, end);
  const count = Appointment.countBetween(start, end);
  const avgTicket = Appointment.averageTicket(start, end);
  const topServices = Service.topSold(start, end, 10);
  const revenueSeries = Appointment.revenueSeries(start, end);
  const methodBreakdown = Payment.methodBreakdown(start, end);
  const newClients = Client.newClientsBetween(start, end);

  const recurringClients = db.prepare(`
    SELECT COUNT(DISTINCT client_id) AS c FROM appointments
    WHERE status = 'completed' AND date BETWEEN ? AND ?
    AND client_id IN (
      SELECT client_id FROM appointments WHERE status='completed' AND date < ?
    )
  `).get(start, end, start).c;

  const completedList = db.prepare(`
    SELECT a.*, c.name AS client_name, b.name AS barber_name, s.name AS service_name
    FROM appointments a
    JOIN clients c ON c.id = a.client_id
    JOIN barbers b ON b.id = a.barber_id
    JOIN services s ON s.id = a.service_id
    WHERE a.status = 'completed' AND a.date BETWEEN ? AND ?
    ORDER BY a.date DESC, a.time DESC
  `).all(start, end);

  return { start, end, label, revenue, count, avgTicket, topServices, revenueSeries, methodBreakdown, newClients, recurringClients, completedList };
}

function index(req, res) {
  const { period = 'month', from, to } = req.query;
  const report = buildReport(period, from, to);
  res.render('admin/financial/index', { title: 'Financeiro', report, period, from, to });
}

function exportCsv(req, res) {
  const { period = 'month', from, to } = req.query;
  const report = buildReport(period, from, to);

  let csv = 'Data;Hora;Cliente;Barbeiro;Servico;Valor\n';
  report.completedList.forEach((a) => {
    csv += `${a.date};${a.time};${a.client_name};${a.barber_name};${a.service_name};${a.price.toFixed(2).replace('.', ',')}\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="financeiro_${report.start}_a_${report.end}.csv"`);
  res.send('﻿' + csv);
}

module.exports = { index, exportCsv };
