declare module './service/supabaseClient' {
  import { SupabaseClient } from '@supabase/supabase-js';
  export const supabase: SupabaseClient;
} 