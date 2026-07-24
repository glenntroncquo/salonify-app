import i18n from '@/lib/i18n';

import { BASE_MONTH_INDEX, BASE_YEAR } from './constants';

function weekdaysLong(): string[] {
  return i18n.t('calendar.weekdaysLong', { returnObjects: true }) as string[];
}

function weekdaysShort(): string[] {
  return i18n.t('calendar.weekdaysShort', { returnObjects: true }) as string[];
}

function monthsLong(): string[] {
  return i18n.t('calendar.monthsLong', { returnObjects: true }) as string[];
}

function monthsShort(): string[] {
  return i18n.t('calendar.monthsShort', { returnObjects: true }) as string[];
}

export function getMonthShortLabel(monthIndex: number) {
  return monthsShort()[monthIndex];
}

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
  return `${weekdaysLong()[date.getDay()]}, ${date.getDate()} ${monthsLong()[date.getMonth()]} ${date.getFullYear()}`;
}

export function getListHeaderLabel(dateKey: string) {
  const date = new Date(dateKey);
  return `${weekdaysShort()[date.getDay()]}, ${date.getDate()} ${monthsShort()[date.getMonth()]} ${date.getFullYear()}`;
}

export function getWeekdayLong(date: Date) {
  return weekdaysLong()[date.getDay()];
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
