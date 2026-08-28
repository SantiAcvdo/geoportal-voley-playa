// Guarda este archivo en: js/supabase.js
// Responsabilidad única: crear el cliente público de Supabase.
// IMPORTANTE: aquí solo va Project URL + Publishable key.
// Nunca pongas service_role, secret key ni contraseña de PostgreSQL.

const SUPABASE_URL = 'https://omwzkeuhxlzkixpzdbwu.supabase.co';

const SUPABASE_PUBLIC_KEY =
  'sb_publishable_n6_FX9CCTZzCoGcnIKrVrw_oqyhw7hJ';

if (!window.supabase) {
  throw new Error(
    'No se cargó Supabase. Revisa que el script CDN esté antes de js/main.js en index.html.'
  );
}

export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY
);