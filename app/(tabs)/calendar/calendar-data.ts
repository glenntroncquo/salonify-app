import i18n from '@/lib/i18n';
import type { AppointmentRow } from '@/lib/api/calendar';
import { COLOR_BG_MAP, COLOR_MAP, COLOR_TEXT_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';

import { formatTime, getISOWeekNumber, getMonthShortLabel, toDateKey } from './date-utils';
import { EventItem, MonthData } from './types';

function appointmentToEvent(appointment: AppointmentRow): EventItem {
  const treatments =
    appointment.appointment_treatment?.length > 0
      ? appointment.appointment_treatment.map((at) => at.treatment)
      : appointment.treatment
        ? [appointment.treatment]
        : [];

  const label = treatments.map((t) => t.name).join(', ') || i18n.t('calendar.untitledAppointment');
  const eventColor = mapTreatmentColorToEventColor(treatments[0]?.color ?? null, treatments[0]?.name);

  const clientName = appointment.client
    ? `${appointment.client.first_name ?? ''} ${appointment.client.last_name ?? ''}`.trim() ||
      i18n.t('calendar.unknownClient')
    : i18n.t('calendar.unknownClient');

  const staffName = appointment.staff
    ? `${appointment.staff.first_name ?? ''} ${appointment.staff.last_name ?? ''}`.trim() ||
      i18n.t('calendar.unassignedStaff')
    : i18n.t('calendar.unassignedStaff');

  return {
    appointmentId: appointment.id,
    label,
    color: COLOR_MAP[eventColor],
    bgColor: COLOR_BG_MAP[eventColor],
    textColor: COLOR_TEXT_MAP[eventColor],
    clientName,
    staffName,
    staffId: appointment.staff?.id ?? null,
    startTime: formatTime(appointment.start),
    endTime: formatTime(appointment.end),
    startISO: appointment.start,
  };
}

export function groupAppointmentsByDateKey(
  appointments: AppointmentRow[],
  staffFilterId: string | null
): Record<string, EventItem[]> {
  const filtered = staffFilterId
    ? appointments.filter((appointment) => appointment.staff?.id === staffFilterId)
    : appointments;

  const byDateKey: Record<string, EventItem[]> = {};

  filtered.forEach((appointment) => {
    const dateKey = toDateKey(new Date(appointment.start));
    if (!byDateKey[dateKey]) {
      byDateKey[dateKey] = [];
    }
    byDateKey[dateKey].push(appointmentToEvent(appointment));
  });

  Object.values(byDateKey).forEach((events) => {
    events.sort((a, b) => a.startISO.localeCompare(b.startISO));
  });

  return byDateKey;
}

export function buildMonthData(
  year: number,
  monthIndex: number,
  eventsByDateKey: Record<string, EventItem[]>
): MonthData {
  const label = `${getMonthShortLabel(monthIndex)} ${year}`;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, monthIndex, 1 - firstDayIndex);

  const weeks = [];
  const inMonthKeys = new Set<string>();
  const events: Record<string, EventItem[]> = {};
  let firstDateKey = '';

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + weekIndex * 7);
    const weekNumber = getISOWeekNumber(weekStart);
    const days = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayIndex);
      const inMonth = dayDate.getMonth() === monthIndex;
      const dateKey = toDateKey(dayDate);

      if (inMonth) {
        inMonthKeys.add(dateKey);
        if (!firstDateKey) {
          firstDateKey = dateKey;
        }
        if (eventsByDateKey[dateKey]) {
          events[dateKey] = eventsByDateKey[dateKey];
        }
      }

      days.push({
        date: dayDate.getDate(),
        inMonth,
        isSunday: dayDate.getDay() === 0,
        dateKey,
      });
    }

    weeks.push({ weekNumber, days });
  }

  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    label,
    year,
    monthIndex,
    weeks,
    events,
    inMonthKeys,
    firstDateKey,
  };
}
