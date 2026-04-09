import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const LOGBOOK_BUCKET = 'logbook-photos';
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;

function extractStoragePath(value: string): string {
  const normalized = value.trim();
  if (!normalized) return normalized;

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return extractStoragePath(parsed[0]);
      }
    } catch {
      // Ignore invalid JSON and continue with normal parsing.
    }
  }

  const marker = `/storage/v1/object/public/${LOGBOOK_BUCKET}/`;
  const signedMarker = `/storage/v1/object/sign/${LOGBOOK_BUCKET}/`;
  const authMarker = `/storage/v1/object/authenticated/${LOGBOOK_BUCKET}/`;

  if (normalized.includes(marker)) {
    return decodeURIComponent(normalized.split(marker)[1] || '');
  }

  if (normalized.includes(signedMarker)) {
    return decodeURIComponent(normalized.split(signedMarker)[1]?.split('?')[0] || '');
  }

  if (normalized.includes(authMarker)) {
    return decodeURIComponent(normalized.split(authMarker)[1]?.split('?')[0] || '');
  }

  return normalized;
}

export async function createSignedPhotoUrl(pathOrUrl: string): Promise<string> {
  const path = extractStoragePath(pathOrUrl);
  if (!path) return pathOrUrl;

  const { data, error } = await supabaseAdmin.storage
    .from(LOGBOOK_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);

  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }

  return getPublicPhotoUrl(pathOrUrl);
}

export async function getPublicPhotoUrl(pathOrUrl: string): Promise<string> {
  const path = extractStoragePath(pathOrUrl);
  if (!path) return pathOrUrl;

  const { data } = supabaseAdmin.storage.from(LOGBOOK_BUCKET).getPublicUrl(path);
  return data?.publicUrl || pathOrUrl;
}

export async function createSignedPhotoUrls(pathsOrUrls: string[]): Promise<string[]> {
  return Promise.all(pathsOrUrls.map((value) => createSignedPhotoUrl(value)));
}
