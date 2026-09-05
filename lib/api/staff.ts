import { supabase } from '@/lib/supabase';

export type Staff = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  specialization: string | null;
  status: string | null;
  image_path: string | null;
};

export type StaffFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  status: string;
};

const STAFF_SELECT = 'id, first_name, last_name, email, phone, specialization, status, image_path';

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
    specialization?: string | null;
    status?: string | null;
  } = {};
  if (fields.firstName !== undefined) patch.first_name = fields.firstName || null;
  if (fields.lastName !== undefined) patch.last_name = fields.lastName || null;
  if (fields.email !== undefined) patch.email = fields.email;
  if (fields.phone !== undefined) patch.phone = fields.phone || null;
  if (fields.specialization !== undefined) patch.specialization = fields.specialization || null;
  if (fields.status !== undefined) patch.status = fields.status || null;

  const { error } = await supabase.from('staff').update(patch).eq('id', staffId);
  if (error) throw error;
}

export type ScheduleRule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function padTime(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatTimeOfDay(hours: number, minutes: number): string {
  return `${padTime(hours)}:${padTime(minutes)}:00`;
}

export function parseTimeOfDay(value: string): { hours: number; minutes: number } {
  const timePart = value.includes('T') ? (value.split('T')[1] ?? '00:00:00') : value;
  const [hh, mm] = timePart.split(':');
  return { hours: Number(hh) || 0, minutes: Number(mm) || 0 };
}

export async function fetchScheduleRules(staffId: string, companyId: string): Promise<ScheduleRule[]> {
  const { data, error } = await supabase
    .from('staff_schedule_rule')
    .select('id, day_of_week, start_time, end_time')
    .eq('staff_id', staffId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true });

  if (error) throw error;
  return (data as ScheduleRule[]) ?? [];
}

export async function createScheduleRule(
  staffId: string,
  companyId: string,
  dayOfWeek: number,
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number
): Promise<void> {
  const { error } = await supabase.from('staff_schedule_rule').insert({
    staff_id: staffId,
    company_id: companyId,
    day_of_week: dayOfWeek,
    start_time: formatTimeOfDay(startHours, startMinutes),
    end_time: formatTimeOfDay(endHours, endMinutes),
    is_active: true,
  });
  if (error) throw error;
}

export async function updateScheduleRule(
  id: string,
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number
): Promise<void> {
  const { error } = await supabase
    .from('staff_schedule_rule')
    .update({
      start_time: formatTimeOfDay(startHours, startMinutes),
      end_time: formatTimeOfDay(endHours, endMinutes),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteScheduleRule(id: string): Promise<void> {
  const { error } = await supabase.from('staff_schedule_rule').delete().eq('id', id);
  if (error) throw error;
}

export type ScheduleException = {
  id: string;
  starts_at: string;
  ends_at: string;
  kind: 'unavailable' | 'available_addition';
};

export async function fetchTimeOff(staffId: string, companyId: string): Promise<ScheduleException[]> {
  const { data, error } = await supabase
    .from('staff_schedule_exception')
    .select('id, starts_at, ends_at, kind')
    .eq('staff_id', staffId)
    .eq('company_id', companyId)
    .eq('kind', 'unavailable')
    .order('starts_at', { ascending: false });

  if (error) throw error;
  return (data as ScheduleException[]) ?? [];
}

/** Single calendar day only — the web dialog itself has no multi-day range picker. */
export async function createTimeOff(
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

  const { error } = await supabase.from('staff_schedule_exception').insert({
    staff_id: staffId,
    company_id: companyId,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    kind: 'unavailable',
  });
  if (error) throw error;
}

export async function deleteTimeOff(id: string): Promise<void> {
  const { error } = await supabase.from('staff_schedule_exception').delete().eq('id', id);
  if (error) throw error;
}
