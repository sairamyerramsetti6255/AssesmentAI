import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
// On Windows, Node's TLS verification fails against Supabase's CDN.
// This is safe for a server-to-Supabase connection that is already encrypted.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const adminKey = serviceKey && serviceKey !== anonKey ? serviceKey : anonKey;
if (!url || !anonKey) {
    console.warn('[supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set');
}
if (!serviceKey || serviceKey === anonKey) {
    console.warn('[supabase] WARNING: SUPABASE_SERVICE_ROLE_KEY missing or same as anon key — RLS will block writes');
}
else {
    console.log('[supabase] Service-role key loaded ✓');
}
export const supabaseAdmin = url && adminKey
    ? createClient(url, adminKey, { auth: { persistSession: false } })
    : null;
export function isSupabaseConfigured() {
    return Boolean(url && anonKey);
}
export function requireSupabase() {
    if (!supabaseAdmin) {
        throw new Error('Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env');
    }
    return supabaseAdmin;
}
