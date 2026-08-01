import { supabase } from '@/lib/supabase';

export type ClientSearchResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  rank?: number;
};

export async function searchClients(term: string): Promise<ClientSearchResult[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase.functions.invoke('search-clients', {
    body: { search_term: trimmed },
  });

  if (error) throw error;
  return (data as ClientSearchResult[]) ?? [];
}

export type Client = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export type ClientFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

function sortByName(a: Client, b: Client) {
  const nameA = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim().toLowerCase();
  const nameB = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim().toLowerCase();
  return nameA.localeCompare(nameB);
}

/**
 * `client` has no `company_id` column — membership is via the `client_company`
 * join table, so listing a company's clients (unlike the `search-clients` edge
 * function above, which searches globally across all companies) must join
 * through it to stay correctly scoped to one salon.
 */
export async function fetchClients(companyId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('client_company')
    .select('client:client_id ( id, first_name, last_name, email, phone )')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) throw error;
  const rows = (data as unknown as { client: Client | null }[]) ?? [];
  return rows.map((row) => row.client).filter((client): client is Client => Boolean(client)).sort(sortByName);
}

export async function fetchClient(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('client')
    .select('id, first_name, last_name, email, phone')
    .eq('id', clientId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createClient(companyId: string, fields: ClientFields): Promise<Client> {
  const { data: client, error: insertError } = await supabase
    .from('client')
    .insert({
      first_name: fields.firstName || null,
      last_name: fields.lastName || null,
      email: fields.email || null,
      phone: fields.phone || null,
    })
    .select('id, first_name, last_name, email, phone')
    .single();

  if (insertError) throw insertError;

  const { error: linkError } = await supabase
    .from('client_company')
    .insert({ client_id: client.id, company_id: companyId, is_active: true });

  if (linkError) throw linkError;

  return client;
}

export async function updateClient(clientId: string, fields: ClientFields): Promise<void> {
  const { error } = await supabase
    .from('client')
    .update({
      first_name: fields.firstName || null,
      last_name: fields.lastName || null,
      email: fields.email || null,
      phone: fields.phone || null,
    })
    .eq('id', clientId);

  if (error) throw error;
}

export type ClientNote = {
  id: string;
  note: string | null;
  created_at: string;
};

export async function fetchClientNotes(clientId: string, companyId: string): Promise<ClientNote[]> {
  const { data, error } = await supabase
    .from('client_notes')
    .select('id, note, created_at')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addClientNote(clientId: string, companyId: string, note: string): Promise<void> {
  const { error } = await supabase.from('client_notes').insert({ client_id: clientId, company_id: companyId, note });

  if (error) throw error;
}
