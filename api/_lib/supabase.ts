import { createClient } from '@supabase/supabase-js';
import { setServers } from 'dns';

// Force Cloudflare DNS in local dev to bypass ISP blocks on .co domains.
// In production (Vercel), this is a no-op — Vercel's servers have proper DNS.
if (process.env.NODE_ENV !== 'production') {
    try {
        setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8']);
    } catch {
        // ignore if dns module unavailable
    }
}


const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    if (process.env.NODE_ENV === 'production') {
        console.error("CRITICAL: Missing SUPABASE config in production!");
    } else {
        console.warn("Missing SUPABASE config. Using placeholders for development.");
    }
    console.debug("Env status:", {
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
}

// Admin client for database operations, bypassing RLS
export const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Auth client for verifying JWT tokens
export const supabaseAuthClient = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
