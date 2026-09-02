/**
 * Entorno de producción.
 *
 * SUPABASE_SERVICE_ROLE_KEY, credenciales SFTP y RESEND_API_KEY NUNCA
 * viven aquí — son secretos de Edge Function.
 *
 * En CI estos valores se inyectan desde GitHub Actions al hacer el build
 * (ver .github/workflows/deploy.yml).
 */
export const environment = {
  production: true,
  supabaseUrl: 'https://xiqqhjdpmqdnzsvpjhwq.supabase.co',
  supabaseAnonKey: '__SUPABASE_ANON_KEY__',
  adminBasePath: 'gestion-privas',
};
