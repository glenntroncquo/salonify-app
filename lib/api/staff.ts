import { supabase } from '@/lib/supabase';

export type Staff = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  specialization: string | null;
  status: string | null;
  image_path: string | null;
};

export type StaffFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  specialization: string;
  status: string;
};

const STAFF_SELECT = 'id, first_name, last_name, email, phone, role, specialization, status, image_path';

export async function fetchAllStaff(companyId: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select(STAFF_SELECT)
    .eq('company_id', companyId)
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchStaffMember(staffId: string): Promise<Staff | null> {
  const { data, error } = await supabase.from('staff').select(STAFF_SELECT).eq('id', staffId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createStaff(companyId: string, fields: StaffFields): Promise<Staff> {
  const { data, error } = await supabase
    .from('staff')
    .insert({
      company_id: companyId,
      first_name: fields.firstName || null,
      last_name: fields.lastName || null,
      email: fields.email,
      phone: fields.phone || null,
      role: fields.role || null,
      specialization: fields.specialization || null,
      status: fields.status || null,
    })
    .select(STAFF_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStaff(staffId: string, fields: Partial<StaffFields>): Promise<void> {
  const patch: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string;
    phone?: string | null;
    role?: string | null;
    specialization?: string | null;
    status?: string | null;
  } = {};
  if (fields.firstName !== undefined) patch.first_name = fields.firstName || null;
  if (fields.lastName !== undefined) patch.last_name = fields.lastName || null;
  if (fields.email !== undefined) patch.email = fields.email;
  if (fields.phone !== undefined) patch.phone = fields.phone || null;
  if (fields.role !== undefined) patch.role = fields.role || null;
  if (fields.specialization !== undefined) patch.specialization = fields.specialization || null;
  if (fields.status !== undefined) patch.status = fields.status || null;

  const { error } = await supabase.from('staff').update(patch).eq('id', staffId);
  if (error) throw error;
}

export type AvailabilitySlot = {
  id: number;
  day_of_week: number;
  start: string;
  end: string;
  recurring: boolean;
};

/**
 * `availability.start`/`end` are naive local datetime strings with no
 * timezone offset at all (not even the appointment table's fake "Z" suffix) —
 * confirmed from the web dialog's own insert code. Both the web UI and the
 * `get-availabilities*` edge functions always parse the full string and only
 * ever use the time-of-day portion, so the date part is disposable for
 * recurring rows; we just use today's date for it, matching web's own
 * behavior of using whatever date happened to be on screen.
 */
function buildNaiveDateTime(hours: number, minutes: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:00`;
}

export function parseNaiveTime(value: string): { hours: number; minutes: number } {
  const timePart = value.split('T')[1] ?? '00:00:00';
  const [hh, mm] = timePart.split(':');
  return { hours: Number(hh) || 0, minutes: Number(mm) || 0 };
}

export async function fetchRecurringAvailability(staffId: string, companyId: string): Promise<AvailabilitySlot[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('id, day_of_week, start, end, recurring')
    .eq('staff_id', staffId)
    .eq('company_id', companyId)
    .eq('recurring', true)
    .order('day_of_week', { ascending: true });

  if (error) throw error;
  return (data as AvailabilitySlot[]) ?? [];
}

export async function createRecurringAvailability(
  staffId: string,
  companyId: string,
  dayOfWeek: number,
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number
): Promise<void> {
  const { error } = await supabase.from('availability').insert({
    staff_id: staffId,
    company_id: companyId,
    day_of_week: dayOfWeek,
    recurring: true,
    start: buildNaiveDateTime(startHours, startMinutes),
    end: buildNaiveDateTime(endHours, endMinutes),
  });
  if (error) throw error;
}

export async function updateRecurringAvailability(
  id: number,
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number
): Promise<void> {
  const { error } = await supabase
    .from('availability')
    .update({ start: buildNaiveDateTime(startHours, startMinutes), end: buildNaiveDateTime(endHours, endMinutes) })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteAvailability(id: number): Promise<void> {
  const { error } = await supabase.from('availability').delete().eq('id', id);
  if (error) throw error;
}

export type UnavailabilityBlock = {
  id: string;
  start: string | null;
  end: string | null;
};

export async function fetchUnavailability(staffId: string, companyId: string): Promise<UnavailabilityBlock[]> {
  const { data, error } = await supabase
    .from('unavailability')
    .select('id, start, end')
    .eq('staff_id', staffId)
    .eq('company_id', companyId)
    .order('start', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Single calendar day only — the web dialog itself has no multi-day range picker. */
export async function createUnavailability(
  staffId: string,
  companyId: string,
  date: Date,
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number
): Promise<void> {
  const start = new Date(date);
  start.setHours(startHours, startMinutes, 0, 0);
  const end = new Date(date);
  const isEndOfDay = endHours === 23 && endMinutes === 59;
  end.setHours(endHours, endMinutes, isEndOfDay ? 59 : 0, 0);

  const { error } = await supabase.from('unavailability').insert({
    staff_id: staffId,
    company_id: companyId,
    start: start.toISOString(),
    end: end.toISOString(),
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteUnavailability(id: string): Promise<void> {
  const { error } = await supabase.from('unavailability').delete().eq('id', id);
  if (error) throw error;
}
