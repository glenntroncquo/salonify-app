import i18n from '@/lib/i18n';
import type { AppointmentRow, AppointmentSegmentRow } from '@/lib/api/calendar';
import { COLOR_BG_MAP, COLOR_MAP, COLOR_TEXT_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';

import { formatTime, getISOWeekNumber, getMonthShortLabel, toDateKey } from './date-utils';
import { EventItem, MonthData } from './types';

function staffLabel(staff: { first_name: string | null; last_name: string | null } | null): string {
  if (!staff) return i18n.t('calendar.unassignedStaff');
  return `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || i18n.t('calendar.unassignedStaff');
}

function clientLabel(client: AppointmentRow['client']): string {
  if (!client) return i18n.t('calendar.unknownClient');
  return `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || i18n.t('calendar.unknownClient');
}

function segmentToEvent(appointment: AppointmentRow, segment: AppointmentSegmentRow): EventItem {
  const serviceName = segment.service?.name || i18n.t('calendar.untitledAppointment');
  const eventColor = mapTreatmentColorToEventColor(segment.service?.color ?? null, segment.service?.name);

  return {
    id: segment.id,
    appointmentId: appointment.id,
    label: serviceName,
    color: COLOR_MAP[eventColor],
    bgColor: COLOR_BG_MAP[eventColor],
    textColor: COLOR_TEXT_MAP[eventColor],
    clientName: clientLabel(appointment.client),
    clientId: appointment.client?.id ?? null,
    staffName: staffLabel(segment.staff ?? appointment.staff),
    staffId: segment.staff?.id ?? segment.staff_id ?? appointment.staff?.id ?? null,
    startTime: formatTime(segment.starts_at),
    endTime: formatTime(segment.ends_at),
    startISO: segment.starts_at,
  };
}

/** One calendar event per segment, timed and staffed from appointment_segment. */
export function appointmentToEvents(appointment: AppointmentRow): EventItem[] {
  const segments = appointment.appointment_segment ?? [];
  if (segments.length === 0) {
    return [appointmentToEvent(appointment)];
  }
  return segments.map((segment) => segmentToEvent(appointment, segment));
}

/** Combined appointment view (history / detail) — all services, overall span. */
export function appointmentToEvent(appointment: AppointmentRow): EventItem {
  const segments = appointment.appointment_segment ?? [];
  const services = segments.map((segment) => segment.service).filter(Boolean);
  const label =
    services.map((service) => service!.name).join(', ') || i18n.t('calendar.untitledAppointment');
  const eventColor = mapTreatmentColorToEventColor(services[0]?.color ?? null, services[0]?.name);
  const first = segments[0];
  const last = segments[segments.length - 1];
  const startISO = first?.starts_at ?? appointment.start;
  const endISO = last?.ends_at ?? appointment.end;
  const staff = first?.staff ?? appointment.staff;

  return {
    id: appointment.id,
    appointmentId: appointment.id,
    label,
    color: COLOR_MAP[eventColor],
    bgColor: COLOR_BG_MAP[eventColor],
    textColor: COLOR_TEXT_MAP[eventColor],
    clientName: clientLabel(appointment.client),
    clientId: appointment.client?.id ?? null,
    staffName: staffLabel(staff),
    staffId: staff?.id ?? first?.staff_id ?? null,
    startTime: formatTime(startISO),
    endTime: formatTime(endISO),
    startISO,
  };
}

/** Cache key for one calendar month. Must include shop + tenant so a location switch cannot reuse another shop's rows. */
export function monthCacheKey(companyId: string, locationId: string, year: number, monthIndex: number): string {
  return `${companyId}:${locationId}:${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function groupAppointmentsByDateKey(
  appointments: AppointmentRow[],
  staffFilterId: string | null
): Record<string, EventItem[]> {
  const events = appointments.flatMap(appointmentToEvents);
  const filtered = staffFilterId ? events.filter((event) => event.staffId === staffFilterId) : events;

  const byDateKey: Record<string, EventItem[]> = {};

  filtered.forEach((event) => {
    const dateKey = toDateKey(new Date(event.startISO));
    if (!byDateKey[dateKey]) {
      byDateKey[dateKey] = [];
    }
    byDateKey[dateKey].push(event);
  });

  Object.values(byDateKey).forEach((dayEvents) => {
    dayEvents.sort((a, b) => a.startISO.localeCompare(b.startISO));
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
