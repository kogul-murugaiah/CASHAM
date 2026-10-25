import { createClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase client for the browser.
 * Import this everywhere instead of calling createClient() locally.
 * A single instance shares one localStorage session and one auth listener.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
