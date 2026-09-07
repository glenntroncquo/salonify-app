export const CALENDAR_REFRESH_EVENT = 'calendarRefreshAppointments';

export type CalendarRefreshPayload = {
  appointmentId?: string;
  removed?: boolean;
};
