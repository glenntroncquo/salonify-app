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
  appointmentId: string;
  label: string;
  /** Saturated accent color — used for thin bars/dots. */
  color: string;
  /** Pastel chip background, paired with textColor. */
  bgColor: string;
  /** Readable text color on top of bgColor. */
  textColor: string;
  clientName: string;
  clientId: string | null;
  staffName: string;
  staffId: string | null;
  startTime: string;
  endTime: string;
  startISO: string;
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

export type WeekDayData = {
  dateKey: string;
  date: number;
  weekday: string;
  isSunday: boolean;
  appointments: EventItem[];
};

export type ListFlatItem =
  | { kind: 'header'; key: string; dateKey: string; title: string; isToday: boolean }
  | { kind: 'row'; key: string; dateKey: string; event: EventItem };
