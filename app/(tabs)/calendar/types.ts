export type CalendarDay = {
  date: number;
  inMonth: boolean;
  isSunday?: boolean;
  dateKey: string;
};

export type CalendarWeek = {
  weekNumber: number;
  days: CalendarDay[];
};

export type EventItem = {
  label: string;
  color: string;
  textColor?: string;
};

export type MonthData = {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  weeks: CalendarWeek[];
  events: Record<string, EventItem[]>;
  inMonthKeys: Set<string>;
  firstDateKey: string;
};

export type WeekAppointment = EventItem & {
  startTime: string;
  endTime: string;
  allDay?: boolean;
};

export type WeekDayData = {
  dateKey: string;
  date: number;
  weekday: string;
  isSunday: boolean;
  appointments: WeekAppointment[];
};

export type ListRowItem = WeekAppointment & {
  dateKey: string;
};

export type ListSection = {
  title: string;
  dateKey: string;
  isToday: boolean;
  data: ListRowItem[];
};
