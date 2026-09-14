import { createClient } from '@supabase/supabase-js';
import { required, HttpError } from './security.js';

export function database() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new HttpError(503, 'Configuración incompleta: falta SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  return createClient(required('SUPABASE_URL'), key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) } });
}
export async function rpc(name, parameters) {
  const { data, error } = await database().rpc(name, parameters);
  if (error) throw error;
  return data;
}
export async function rateLimit(key, limit, seconds) {
  const permitted = await rpc('epm_rate_limit', { p_key: key, p_limit: limit, p_seconds: seconds });
  if (!permitted) throw new HttpError(429, 'Demasiados intentos. Esperá unos minutos y volvé a intentar.');
}
