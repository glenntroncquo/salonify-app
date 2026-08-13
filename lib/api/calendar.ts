import { supabase } from '@/lib/supabase';

export type AppointmentRow = {
  id: string;
  start: string;
  end: string;
  notes: string | null;
  staff_notes: string | null;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  staff: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_path: string | null;
  } | null;
  appointment_treatment: Array<{
    id: string;
    treatment: {
      id: string;
      name: string;
      color: string | null;
    };
    price_option: {
      id: string;
      name: string;
    };
  }>;
  treatment: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  price_option: {
    id: string;
    name: string;
  } | null;
};

export type StaffMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_path: string | null;
};

const APPOINTMENT_SELECT = `
  id,
  start,
  end,
  notes,
  staff_notes,
  client:client_id ( id, first_name, last_name, email ),
  staff:staff_id ( id, first_name, last_name, image_path ),
  appointment_treatment ( id, treatment: treatment_id ( id, name, color ), price_option: price_option_id ( id, name ) ),
  treatment:treatment_id ( id, name, color ),
  price_option:price_option_id ( id, name )
`;

/**
 * Fetches appointments starting within a single calendar month (local time).
 * Called once per month rather than once for the whole company, so browsing
 * further into the calendar (month, week, or list view) fetches lazily
 * instead of loading the company's entire appointment history up front.
 */
export async function fetchAppointmentsForMonth(
  companyId: string,
  year: number,
  monthIndex: number
): Promise<AppointmentRow[]> {
  const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);

  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_SELECT)
    .eq('company_id', companyId)
    .eq('is_canceled', false)
    .gte('start', monthStart.toISOString())
    .lt('start', monthEnd.toISOString());

  if (error) throw error;
  return (data as unknown as AppointmentRow[]) ?? [];
}

export async function fetchAppointmentById(appointmentId: string): Promise<AppointmentRow | null> {
  const { data, error } = await supabase.from('appointment').select(APPOINTMENT_SELECT).eq('id', appointmentId).single();

  if (error) throw error;
  return (data as unknown as AppointmentRow) ?? null;
}

export async function fetchStaff(companyId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, first_name, last_name, image_path')
    .eq('company_id', companyId)
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Appointment history for a single client, newest first (for the client detail screen). */
export async function fetchClientAppointments(clientId: string, companyId: string): Promise<AppointmentRow[]> {
  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_SELECT)
    .eq('company_id', companyId)
    .eq('client_id', clientId)
    .eq('is_canceled', false)
    .order('start', { ascending: false });

  if (error) throw error;
  return (data as unknown as AppointmentRow[]) ?? [];
}

/** A single staff member's appointments within a date range (for the staff schedule/roster view). */
export async function fetchStaffAppointments(
  staffId: string,
  companyId: string,
  rangeStart: Date,
  rangeEndExclusive: Date
): Promise<AppointmentRow[]> {
  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_SELECT)
    .eq('company_id', companyId)
    .eq('staff_id', staffId)
    .eq('is_canceled', false)
    .gte('start', rangeStart.toISOString())
    .lt('start', rangeEndExclusive.toISOString());

  if (error) throw error;
  return (data as unknown as AppointmentRow[]) ?? [];
}
