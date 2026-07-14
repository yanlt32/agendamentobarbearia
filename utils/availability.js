const dayjs = require('dayjs');
const Barber = require('../models/Barber');
const Appointment = require('../models/Appointment');
const Holiday = require('../models/Holiday');
const Setting = require('../models/Setting');

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Returns [{ time: 'HH:mm', available: bool }] for a given barber/service/date.
 */
function getAvailableSlots({ barberId, date, durationMinutes }) {
  const weekday = dayjs(date).day();

  if (Holiday.findByDate(date)) return [];

  const schedule = Barber.scheduleForDay(barberId, weekday);
  if (!schedule || schedule.is_off) return [];

  const interval = parseInt(Setting.get('slot_interval_minutes', '30'), 10) || 30;
  const startMin = toMinutes(schedule.start_time);
  const endMin = toMinutes(schedule.end_time);

  const booked = Appointment.bookedTimesForBarberDate(barberId, date).map((b) => {
    const s = toMinutes(b.time);
    return { start: s, end: s + (b.duration_minutes || interval) };
  });

  const isToday = dayjs(date).isSame(dayjs(), 'day');
  const nowMin = dayjs().hour() * 60 + dayjs().minute();

  const slots = [];
  for (let t = startMin; t + durationMinutes <= endMin; t += interval) {
    if (isToday && t <= nowMin) continue;
    const overlaps = booked.some((b) => t < b.end && (t + durationMinutes) > b.start);
    slots.push({ time: toHHMM(t), available: !overlaps });
  }
  return slots;
}

module.exports = { getAvailableSlots, toMinutes, toHHMM };
