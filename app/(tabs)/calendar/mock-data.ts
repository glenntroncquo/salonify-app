import { EVENT_COLORS, EVENT_LABELS, MONTH_LABELS } from './constants';
import { addMonths, getISOWeekNumber, toDateKey } from './date-utils';
import { EventItem, MonthData, WeekAppointment } from './types';

function mulberry32(seed: number) {
  let t = seed;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMonthData(year: number, monthIndex: number): MonthData {
  const label = `${MONTH_LABELS[monthIndex]} ${year}`;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, monthIndex, 1 - firstDayIndex);
  const rand = mulberry32(year * 100 + monthIndex + 1);

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

  Array.from(inMonthKeys).forEach((dateKey, index) => {
    const roll = rand();
    let count = 0;
    if (roll > 0.55) count = 1;
    if (roll > 0.72) count = 2;
    if (roll > 0.85) count = 3;
    if (roll > 0.95) count = 4;

    if (count > 0) {
      const items: EventItem[] = [];
      for (let i = 0; i < count; i += 1) {
        const label = EVENT_LABELS[(index + i) % EVENT_LABELS.length];
        const color = EVENT_COLORS[(index + i) % EVENT_COLORS.length];
        items.push({ label, color: color.color, textColor: color.textColor });
      }
      events[dateKey] = items;
    }
  });

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

export function buildWeekAppointments(baseEvents: EventItem[]): WeekAppointment[] {
  const slots = [
    ['09:30', '10:30'],
    ['11:00', '12:00'],
    ['12:00', '13:00'],
    ['14:00', '15:00'],
    ['16:00', '17:00'],
    ['17:30', '18:30'],
  ] as const;

  return baseEvents.map((event, index) => ({
    ...event,
    startTime: slots[index % slots.length][0],
    endTime: slots[index % slots.length][1],
    allDay: false,
  }));
}

export function getMonthDataForOffset(baseYear: number, baseMonth: number, offset: number) {
  const { year, monthIndex } = addMonths(baseYear, baseMonth, offset);
  return generateMonthData(year, monthIndex);
}
