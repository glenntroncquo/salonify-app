import { supabase } from '@/lib/supabase';

export type ServiceVariantPhase = {
  sequence: number;
  phase_type: 'busy' | 'free';
  duration_minutes: number;
};

export type ServiceVariant = {
  id: string;
  name: string;
  price: number;
  vat_rate: number | null;
  client_duration_minutes: number;
  staff_duration_minutes: number | null;
  is_active?: boolean | null;
  is_deleted?: boolean | null;
  display_order?: number | null;
  service_variant_phase: ServiceVariantPhase[];
};

export type ServiceWithVariants = {
  id: string;
  name: string;
  color: string | null;
  service_variant: ServiceVariant[];
};

const BOOKING_SERVICE_SELECT = `
  id, name, color,
  service_variant (
    id, name, price, vat_rate, client_duration_minutes, staff_duration_minutes,
    is_active, is_deleted, display_order,
    service_variant_phase ( sequence, phase_type, duration_minutes )
  )
`;

function sortPhases(phases: ServiceVariantPhase[] | null | undefined): ServiceVariantPhase[] {
  return [...(phases ?? [])].sort((a, b) => a.sequence - b.sequence);
}

function normalizeVariant(variant: ServiceVariant): ServiceVariant {
  return {
    ...variant,
    service_variant_phase: sortPhases(variant.service_variant_phase),
  };
}

function isBookableVariant(variant: ServiceVariant): boolean {
  return variant.is_deleted !== true && variant.is_active !== false;
}

function compareVariants(a: ServiceVariant, b: ServiceVariant): number {
  const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name);
}

export async function fetchServices(companyId: string): Promise<ServiceWithVariants[]> {
  const { data, error } = await supabase
    .from('service')
    .select(BOOKING_SERVICE_SELECT)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return ((data as unknown as ServiceWithVariants[]) ?? [])
    .map((service) => ({
      ...service,
      service_variant: (service.service_variant ?? [])
        .filter(isBookableVariant)
        .map(normalizeVariant)
        .sort(compareVariants),
    }))
    .filter((service) => service.service_variant.length > 0);
}

export type ManagedService = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  is_active: boolean | null;
  display_order: number | null;
  service_variant: ServiceVariant[];
};

export type ServiceFields = {
  name: string;
  color: string;
  description: string;
};

const MANAGED_SERVICE_SELECT = `
  id, name, color, description, is_active, display_order,
  service_variant (
    id, name, price, vat_rate, client_duration_minutes, staff_duration_minutes,
    is_active, is_deleted, display_order,
    service_variant_phase ( sequence, phase_type, duration_minutes )
  )
`;

function normalizeManagedService(service: ManagedService): ManagedService {
  return {
    ...service,
    service_variant: (service.service_variant ?? [])
      .filter((variant) => variant.is_deleted !== true)
      .map(normalizeVariant)
      .sort(compareVariants),
  };
}

export async function fetchAllServices(companyId: string): Promise<ManagedService[]> {
  const { data, error } = await supabase
    .from('service')
    .select(MANAGED_SERVICE_SELECT)
    .eq('company_id', companyId)
    .eq('is_deleted', false)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return ((data as unknown as ManagedService[]) ?? []).map(normalizeManagedService);
}

export async function fetchService(serviceId: string): Promise<ManagedService | null> {
  const { data, error } = await supabase
    .from('service')
    .select(MANAGED_SERVICE_SELECT)
    .eq('id', serviceId)
    .maybeSingle();

  if (error) throw error;
  const service = data as unknown as ManagedService | null;
  return service ? normalizeManagedService(service) : null;
}

export async function createService(companyId: string, fields: ServiceFields): Promise<ManagedService> {
  const { data, error } = await supabase
    .from('service')
    .insert({
      company_id: companyId,
      name: fields.name,
      color: fields.color || null,
      description: fields.description || null,
      is_active: true,
      is_deleted: false,
    })
    .select(MANAGED_SERVICE_SELECT)
    .single();

  if (error) throw error;
  return normalizeManagedService(data as unknown as ManagedService);
}

export async function updateService(
  serviceId: string,
  fields: Partial<ServiceFields> & { isActive?: boolean }
): Promise<void> {
  const patch: { name?: string; color?: string | null; description?: string | null; is_active?: boolean } = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.color !== undefined) patch.color = fields.color || null;
  if (fields.description !== undefined) patch.description = fields.description || null;
  if (fields.isActive !== undefined) patch.is_active = fields.isActive;

  const { error } = await supabase.from('service').update(patch).eq('id', serviceId);
  if (error) throw error;
}

export async function reorderServices(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from('service').update({ display_order: index }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export type PhaseDraft = {
  phase_type: 'busy' | 'free';
  duration_minutes: number;
};

export type ServiceVariantFields = {
  name: string;
  price: number;
  phases: PhaseDraft[];
};

export function clientDurationFromPhases(phases: PhaseDraft[]): number {
  return phases.reduce((sum, phase) => sum + Math.max(0, Number(phase.duration_minutes) || 0), 0);
}

export function staffDurationFromPhases(phases: PhaseDraft[]): number {
  return phases
    .filter((phase) => phase.phase_type === 'busy')
    .reduce((sum, phase) => sum + Math.max(0, Number(phase.duration_minutes) || 0), 0);
}

/**
 * When a variant has no phase rows, reconstruct the old two-duration shape:
 * busy = staff/actual duration, trailing free = leftover client duration.
 */
export function inferPhasesFromDurations(
  clientDuration: number,
  staffDuration: number | null
): ServiceVariantPhase[] {
  const client = Math.max(0, Number(clientDuration) || 0);
  const staff = Math.max(0, Number(staffDuration) || 0);
  const busyMinutes = staff > 0 ? staff : client || 30;
  const freeMinutes = Math.max(0, client - busyMinutes);
  const phases: ServiceVariantPhase[] = [
    { sequence: 0, phase_type: 'busy', duration_minutes: busyMinutes },
  ];
  if (freeMinutes > 0) {
    phases.push({ sequence: 1, phase_type: 'free', duration_minutes: freeMinutes });
  }
  return phases;
}

export function phasesForEditor(variant: Pick<ServiceVariant, 'client_duration_minutes' | 'staff_duration_minutes' | 'service_variant_phase'>): ServiceVariantPhase[] {
  const existing = sortPhases(variant.service_variant_phase);
  if (existing.length > 0) return existing;
  return inferPhasesFromDurations(variant.client_duration_minutes, variant.staff_duration_minutes);
}

function normalizePhaseDrafts(phases: PhaseDraft[]): ServiceVariantPhase[] {
  const normalized = phases
    .map((phase) => ({
      phase_type: phase.phase_type === 'free' ? ('free' as const) : ('busy' as const),
      duration_minutes: Math.max(1, Math.round(Number(phase.duration_minutes) || 0)),
    }))
    .filter((phase) => phase.duration_minutes > 0);

  if (!normalized.some((phase) => phase.phase_type === 'busy')) {
    throw new Error('At least one busy phase is required');
  }

  return normalized.map((phase, sequence) => ({ ...phase, sequence }));
}

async function replaceVariantPhases(
  variantId: string,
  companyId: string,
  phases: ServiceVariantPhase[]
): Promise<void> {
  const { data: existing, error: loadError } = await supabase
    .from('service_variant_phase')
    .select('id')
    .eq('service_variant_id', variantId);
  if (loadError) throw loadError;

  const { data: inserted, error: insertError } = await supabase
    .from('service_variant_phase')
    .insert(
      phases.map((phase) => ({
        company_id: companyId,
        service_variant_id: variantId,
        sequence: 1000 + phase.sequence,
        phase_type: phase.phase_type,
        duration_minutes: phase.duration_minutes,
      }))
    )
    .select('id');
  if (insertError) throw insertError;

  if (existing && existing.length > 0) {
    const { error: deleteError } = await supabase
      .from('service_variant_phase')
      .delete()
      .in(
        'id',
        existing.map((row) => row.id)
      );
    if (deleteError) throw deleteError;
  }

  const relabel = (inserted ?? []).map((row, index) =>
    supabase.from('service_variant_phase').update({ sequence: index }).eq('id', row.id)
  );
  const results = await Promise.all(relabel);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export async function createServiceVariant(
  serviceId: string,
  companyId: string,
  fields: ServiceVariantFields
): Promise<ServiceVariant> {
  const phases = normalizePhaseDrafts(fields.phases);
  const clientDuration = clientDurationFromPhases(phases);
  const staffDuration = staffDurationFromPhases(phases);

  const { data, error } = await supabase
    .from('service_variant')
    .insert({
      service_id: serviceId,
      company_id: companyId,
      name: fields.name,
      price: fields.price,
      client_duration_minutes: clientDuration,
      staff_duration_minutes: staffDuration,
      is_active: true,
      is_deleted: false,
    })
    .select('id, name, price, vat_rate, client_duration_minutes, staff_duration_minutes')
    .single();

  if (error) throw error;

  const { error: phaseError } = await supabase.from('service_variant_phase').insert(
    phases.map((phase) => ({
      company_id: companyId,
      service_variant_id: data.id,
      sequence: phase.sequence,
      phase_type: phase.phase_type,
      duration_minutes: phase.duration_minutes,
    }))
  );
  if (phaseError) throw phaseError;

  return {
    ...data,
    service_variant_phase: phases,
  };
}

export async function updateServiceVariant(
  variantId: string,
  companyId: string,
  fields: Partial<ServiceVariantFields>
): Promise<void> {
  const patch: {
    name?: string;
    price?: number;
    client_duration_minutes?: number;
    staff_duration_minutes?: number;
  } = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.price !== undefined) patch.price = fields.price;

  let phases: ServiceVariantPhase[] | null = null;
  if (fields.phases !== undefined) {
    phases = normalizePhaseDrafts(fields.phases);
    patch.client_duration_minutes = clientDurationFromPhases(phases);
    patch.staff_duration_minutes = staffDurationFromPhases(phases);
  }

  const { error } = await supabase.from('service_variant').update(patch).eq('id', variantId);
  if (error) throw error;

  if (phases) {
    await replaceVariantPhases(variantId, companyId, phases);
  }
}

export async function deleteServiceVariant(variantId: string): Promise<void> {
  const { error } = await supabase.from('service_variant').delete().eq('id', variantId);
  if (error) throw error;
}

export function variantDurationMinutes(variant: Pick<ServiceVariant, 'client_duration_minutes' | 'service_variant_phase'>): number {
  const phases = variant.service_variant_phase ?? [];
  if (phases.length > 0) return clientDurationFromPhases(phases);
  return Number(variant.client_duration_minutes) || 0;
}

export function variantStaffDurationMinutes(
  variant: Pick<ServiceVariant, 'staff_duration_minutes' | 'service_variant_phase'>
): number {
  const phases = variant.service_variant_phase ?? [];
  if (phases.length > 0) return staffDurationFromPhases(phases);
  return Number(variant.staff_duration_minutes) || 0;
}
