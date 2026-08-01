import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type CreateAppointmentTreatment = {
  treatmentId: string;
  priceOptionId: string;
};

export type CreateAppointmentPayload = {
  start: string;
  staffId: string;
  companyId: string;
  treatments: CreateAppointmentTreatment[];
  firstName: string;
  lastName: string;
  email: string;
  notes: string;
};

export async function createAppointment(payload: CreateAppointmentPayload): Promise<{ id?: string; clientId?: string }> {
  const { data, error } = await supabase.functions.invoke('create-staff-appointment-v2', {
    body: { ...payload, imageData: null },
  });

  if (error) {
    // FunctionsHttpError's own `.message` is always the generic "non-2xx
    // status code" string — the edge function's actual error detail lives
    // in the response body, which we need to parse out to map to a specific
    // user-facing message (conflict/availability/etc.) upstream.
    if (error instanceof FunctionsHttpError) {
      let detail = error.message;
      try {
        const body = await error.context.json();
        if (typeof body?.error === 'string') detail = body.error;
      } catch {
        // Body wasn't JSON — fall back to the generic message.
      }
      throw new Error(detail);
    }
    throw error;
  }

  return data ?? {};
}
