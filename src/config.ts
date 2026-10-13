/**
 * Conexión con la nube (Supabase).
 * Estos dos valores son PÚBLICOS por diseño (la seguridad la dan las reglas de supabase/schema.sql).
 * Nunca pongas aquí la "service_role" ni la "secret key".
 * Si están vacíos, la app funciona solo en el dispositivo (sin cuentas).
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || 'https://aoxxzmfiduwdplvrssyk.supabase.co';
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0qyfc-mIPZmRpF55tgFsuw_LSlyhSL0';

export const nubeConfigurada = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
