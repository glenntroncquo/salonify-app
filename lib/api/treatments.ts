import { supabase } from '@/lib/supabase';

export type PriceOption = {
  id: string;
  name: string;
  price: number;
  duration_in_minutes: number;
};

export type TreatmentWithOptions = {
  id: string;
  name: string;
  color: string | null;
  price_option: PriceOption[];
};

export async function fetchTreatments(companyId: string): Promise<TreatmentWithOptions[]> {
  const { data, error } = await supabase
    .from('treatment')
    .select('id, name, color, price_option ( id, name, price, duration_in_minutes )')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return (data as unknown as TreatmentWithOptions[]) ?? [];
}

export type ManagedTreatment = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  is_active: boolean | null;
  order: number | null;
  price_option: PriceOption[];
};

export type TreatmentFields = {
  name: string;
  color: string;
  description: string;
};

const MANAGED_TREATMENT_SELECT =
  'id, name, color, description, is_active, order, price_option ( id, name, price, duration_in_minutes )';

/** All treatments (active and inactive) for the management screen, ordered for display/reordering. */
export async function fetchAllTreatments(companyId: string): Promise<ManagedTreatment[]> {
  const { data, error } = await supabase
    .from('treatment')
    .select(MANAGED_TREATMENT_SELECT)
    .eq('company_id', companyId)
    .order('order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as unknown as ManagedTreatment[]) ?? [];
}

export async function fetchTreatment(treatmentId: string): Promise<ManagedTreatment | null> {
  const { data, error } = await supabase
    .from('treatment')
    .select(MANAGED_TREATMENT_SELECT)
    .eq('id', treatmentId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ManagedTreatment | null;
}

export async function createTreatment(companyId: string, fields: TreatmentFields): Promise<ManagedTreatment> {
  const { data, error } = await supabase
    .from('treatment')
    .insert({
      company_id: companyId,
      name: fields.name,
      color: fields.color || null,
      description: fields.description || null,
      is_active: true,
    })
    .select(MANAGED_TREATMENT_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as ManagedTreatment;
}

export async function updateTreatment(
  treatmentId: string,
  fields: Partial<TreatmentFields> & { isActive?: boolean }
): Promise<void> {
  const patch: { name?: string; color?: string | null; description?: string | null; is_active?: boolean } = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.color !== undefined) patch.color = fields.color || null;
  if (fields.description !== undefined) patch.description = fields.description || null;
  if (fields.isActive !== undefined) patch.is_active = fields.isActive;

  const { error } = await supabase.from('treatment').update(patch).eq('id', treatmentId);
  if (error) throw error;
}

/** Persists a new display order for the whole list (small per-company lists, so a full rewrite is simplest and always consistent). */
export async function reorderTreatments(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) => supabase.from('treatment').update({ order: index }).eq('id', id));
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export type PriceOptionFields = {
  name: string;
  price: number;
  durationInMinutes: number;
};

export async function createPriceOption(
  treatmentId: string,
  companyId: string,
  fields: PriceOptionFields
): Promise<PriceOption> {
  const { data, error } = await supabase
    .from('price_option')
    .insert({
      treatment_id: treatmentId,
      company_id: companyId,
      name: fields.name,
      price: fields.price,
      duration_in_minutes: fields.durationInMinutes,
    })
    .select('id, name, price, duration_in_minutes')
    .single();

  if (error) throw error;
  return data;
}

export async function updatePriceOption(priceOptionId: string, fields: Partial<PriceOptionFields>): Promise<void> {
  const patch: { name?: string; price?: number; duration_in_minutes?: number } = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.price !== undefined) patch.price = fields.price;
  if (fields.durationInMinutes !== undefined) patch.duration_in_minutes = fields.durationInMinutes;

  const { error } = await supabase.from('price_option').update(patch).eq('id', priceOptionId);
  if (error) throw error;
}

export async function deletePriceOption(priceOptionId: string): Promise<void> {
  const { error } = await supabase.from('price_option').delete().eq('id', priceOptionId);
  if (error) throw error;
}
