import { toFakeUtcISOString } from '@/app/(tabs)/calendar/date-utils';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/api/clients';
import { ServiceVariantPhase } from '@/lib/api/services';

export type CreateAppointmentSegment = {
  serviceId: string;
  serviceVariantId: string;
  staffId: string;
  price: number;
  phases: ServiceVariantPhase[];
  durationMinutes: number;
};

export type CreateAppointmentPayload = {
  start: Date;
  companyId: string;
  segments: CreateAppointmentSegment[];
  firstName: string;
  lastName: string;
  email: string;
  notes: string;
  clientId?: string;
};

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function fakeZ(date: Date): string {
  return toFakeUtcISOString(date, date.getHours(), date.getMinutes());
}

async function resolveClientId(payload: CreateAppointmentPayload): Promise<string> {
  if (payload.clientId) return payload.clientId;

  const email = payload.email.trim();
  if (email) {
    const { data: existing, error } = await supabase
      .from('client')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (existing?.id) {
      const { error: linkError } = await supabase
        .from('client_company')
        .insert({ client_id: existing.id, company_id: payload.companyId, is_active: true });
      if (linkError && !/duplicate|unique/i.test(linkError.message)) throw linkError;
      return existing.id;
    }
  }

  const created = await createClient(payload.companyId, {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email,
    phone: '',
  });
  return created.id;
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<{ id?: string; clientId?: string }> {
  if (payload.segments.length === 0) {
    throw new Error('At least one service is required');
  }

  const clientId = await resolveClientId(payload);
  const start = payload.start;
  const totalPrice = payload.segments.reduce((sum, segment) => sum + Number(segment.price), 0);
  const totalMinutes = payload.segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
  const end = addMinutes(start, totalMinutes);
  const primaryStaffId = payload.segments[0].staffId;

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointment')
    .insert({
      company_id: payload.companyId,
      client_id: clientId,
      staff_id: primaryStaffId,
      price: totalPrice,
      notes: payload.notes || null,
      duration_in_minutes: totalMinutes,
      start: fakeZ(start),
      end: fakeZ(end),
      actual_start: fakeZ(start),
      actual_end: fakeZ(end),
      allow_overlap: true,
      status: 'scheduled',
      is_canceled: false,
    })
    .select('id')
    .single();

  if (appointmentError) throw appointmentError;

  try {
    let cursor = start;
    for (let sequence = 0; sequence < payload.segments.length; sequence += 1) {
      const segment = payload.segments[sequence];
      const phases =
        segment.phases.length > 0
          ? [...segment.phases].sort((a, b) => a.sequence - b.sequence)
          : [{ sequence: 0, phase_type: 'busy' as const, duration_minutes: segment.durationMinutes }];

      const segmentStart = cursor;
      let phaseCursor = cursor;
      const instantiated = phases.map((phase, phaseIndex) => {
        const phaseStart = phaseCursor;
        const phaseEnd = addMinutes(phaseStart, Number(phase.duration_minutes));
        phaseCursor = phaseEnd;
        return {
          sequence: phase.sequence ?? phaseIndex,
          phase_type: phase.phase_type,
          starts_at: phaseStart.toISOString(),
          ends_at: phaseEnd.toISOString(),
        };
      });
      const segmentEnd = phaseCursor;
      cursor = segmentEnd;

      const { data: inserted, error: segmentError } = await supabase
        .from('appointment_segment')
        .insert({
          company_id: payload.companyId,
          appointment_id: appointment.id,
          service_id: segment.serviceId,
          service_variant_id: segment.serviceVariantId,
          staff_id: segment.staffId,
          sequence,
          starts_at: segmentStart.toISOString(),
          ends_at: segmentEnd.toISOString(),
          price: segment.price,
          allow_overlap: true,
        })
        .select('id')
        .single();

      if (segmentError) throw segmentError;

      const { error: phaseError } = await supabase.from('appointment_segment_phase').insert(
        instantiated.map((phase) => ({
          company_id: payload.companyId,
          appointment_segment_id: inserted.id,
          staff_id: segment.staffId,
          sequence: phase.sequence,
          phase_type: phase.phase_type,
          starts_at: phase.starts_at,
          ends_at: phase.ends_at,
          allow_overlap: true,
        }))
      );
      if (phaseError) throw phaseError;
    }
  } catch (error) {
    await supabase.from('appointment').delete().eq('id', appointment.id);
    throw error;
  }

  return { id: appointment.id, clientId };
}
