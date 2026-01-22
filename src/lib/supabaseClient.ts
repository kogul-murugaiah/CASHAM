import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables. Please check if VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file or deployment configuration.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
