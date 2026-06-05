import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — Supabase features disabled');
}

/** Service-role client — bypasses RLS, server-side only. */
export const supabaseAdmin = url && (serviceKey || anonKey)
  ? createClient(url, serviceKey || anonKey!, { auth: { persistSession: false } })
  : null;

/** Anon client — respects RLS. */
export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Helper: throw a clear error if Supabase isn't configured. */
export function requireSupabase() {
  if (!supabaseAdmin) throw new Error('Supabase not configured — set SUPABASE_URL and SUPABASE_ANON_KEY in server/.env');
  return supabaseAdmin;
}
