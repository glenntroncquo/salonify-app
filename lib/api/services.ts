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

export type ServiceVariantFields = {
  name: string;
  price: number;
  durationInMinutes: number;
};

async function replaceSingleBusyPhase(
  variantId: string,
  companyId: string,
  durationMinutes: number
): Promise<void> {
  const { data: phases, error: loadError } = await supabase
    .from('service_variant_phase')
    .select('id, sequence, phase_type')
    .eq('service_variant_id', variantId)
    .order('sequence', { ascending: true });

  if (loadError) throw loadError;

  const rows = phases ?? [];
  if (rows.length === 1 && rows[0].phase_type === 'busy') {
    const { error } = await supabase
      .from('service_variant_phase')
      .update({ duration_minutes: durationMinutes })
      .eq('id', rows[0].id);
    if (error) throw error;
    return;
  }
  if (rows.length === 0) {
    const { error } = await supabase.from('service_variant_phase').insert({
      company_id: companyId,
      service_variant_id: variantId,
      sequence: 0,
      phase_type: 'busy',
      duration_minutes: durationMinutes,
    });
    if (error) throw error;
  }
}

export async function createServiceVariant(
  serviceId: string,
  companyId: string,
  fields: ServiceVariantFields
): Promise<ServiceVariant> {
  const { data, error } = await supabase
    .from('service_variant')
    .insert({
      service_id: serviceId,
      company_id: companyId,
      name: fields.name,
      price: fields.price,
      client_duration_minutes: fields.durationInMinutes,
      staff_duration_minutes: fields.durationInMinutes,
      is_active: true,
      is_deleted: false,
    })
    .select('id, name, price, vat_rate, client_duration_minutes, staff_duration_minutes')
    .single();

  if (error) throw error;

  const { error: phaseError } = await supabase.from('service_variant_phase').insert({
    company_id: companyId,
    service_variant_id: data.id,
    sequence: 0,
    phase_type: 'busy',
    duration_minutes: fields.durationInMinutes,
  });
  if (phaseError) throw phaseError;

  return {
    ...data,
    service_variant_phase: [{ sequence: 0, phase_type: 'busy', duration_minutes: fields.durationInMinutes }],
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
  if (fields.durationInMinutes !== undefined) {
    patch.client_duration_minutes = fields.durationInMinutes;
    patch.staff_duration_minutes = fields.durationInMinutes;
  }

  const { error } = await supabase.from('service_variant').update(patch).eq('id', variantId);
  if (error) throw error;

  if (fields.durationInMinutes !== undefined) {
    await replaceSingleBusyPhase(variantId, companyId, fields.durationInMinutes);
  }
}

export async function deleteServiceVariant(variantId: string): Promise<void> {
  const { error } = await supabase.from('service_variant').delete().eq('id', variantId);
  if (error) throw error;
}

export function variantDurationMinutes(variant: Pick<ServiceVariant, 'client_duration_minutes' | 'service_variant_phase'>): number {
  const phases = variant.service_variant_phase ?? [];
  if (phases.length > 0) {
    return phases.reduce((sum, phase) => sum + Number(phase.duration_minutes), 0);
  }
  return Number(variant.client_duration_minutes) || 0;
}
