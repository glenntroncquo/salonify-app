import { BASE_MONTH_INDEX, BASE_YEAR } from './constants';

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getISOWeekNumber(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function addMonths(baseYear: number, baseMonth: number, offset: number) {
  const total = baseYear * 12 + baseMonth + offset;
  const year = Math.floor(total / 12);
  const monthIndex = total % 12;
  return { year, monthIndex };
}

export function getOffsetForDate(date: Date) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  return year * 12 + monthIndex - (BASE_YEAR * 12 + BASE_MONTH_INDEX);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

export function getWeekStartMonday(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), mondayOffset);
}

export function getWeekOffsetFromBase(baseWeekStart: Date, dateKey: string) {
  const target = getWeekStartMonday(new Date(dateKey));
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - baseWeekStart.getTime()) / msPerWeek);
}

export function getFullDateLabel(dateKey: string) {
  const date = new Date(dateKey);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function getListHeaderLabel(dateKey: string) {
  const date = new Date(dateKey);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function getWeekdayLong(date: Date) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays[date.getDay()];
}

export function getInitialsFromLabel(label: string) {
  const parts = label
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
