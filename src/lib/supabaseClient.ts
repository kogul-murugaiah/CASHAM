import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Directly inject error into the DOM so it's visible even if React crashes
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#111;color:#f87171;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;z-index:9999;padding:20px;text-align:center;';

  errorDiv.innerHTML = `
    <h1 style="font-size:24px;margin-bottom:16px;">Configuration Error</h1>
    <p>Missing Supabase Environment Variables.</p>
    <p style="color:#9ca3af;font-size:14px;margin-top:8px;">
      Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.<br>
      (See console for details)
    </p>
  `;
  document.body.appendChild(errorDiv);

  console.error('Missing Supabase Environment Variables. Check your .env file or Vercel project settings.');
  // We still need to throw or handle this to stop execution, but the error is now visible.
  // Returning a dummy client might be safer to let React at least start rendering the ErrorBoundary, 
  // but this is a critical config error.
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
