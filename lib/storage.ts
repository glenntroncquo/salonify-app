const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/** Public URL for a file in the `company` storage bucket (staff/client photos etc.), matching the pattern used across platform/client. */
export function getCompanyImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/company/${path}`;
}
