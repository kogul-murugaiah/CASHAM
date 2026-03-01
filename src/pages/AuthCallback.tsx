import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// Same project URL = shares the same localStorage session as Login.tsx client
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AuthCallback = () => {
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const handled = useRef(false);

    useEffect(() => {
        const persistSession = async (session: { access_token: string; refresh_token: string; expires_in: number }) => {
            if (handled.current) return;
            handled.current = true;

            try {
                // Single call: sets httpOnly cookies AND seeds defaults for new users
                const res = await fetch("/api/auth/google-setup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        expires_in: session.expires_in,
                    }),
                    credentials: "include",
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || "Failed to persist session");
                }

                navigate("/dashboard", { replace: true });
            } catch (err: any) {
                setError(err.message || "Sign-in failed");
                setTimeout(() => navigate("/login?error=google_failed", { replace: true }), 2500);
            }
        };

        // Supabase automatically processes both PKCE ?code= and hash #access_token=
        // and fires SIGNED_IN once the session is ready — subscribe before checking
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
                subscription.unsubscribe();
                persistSession(session);
            }
        });

        // Safety timeout — if nothing fires in 8s, redirect to login
        const timeout = setTimeout(() => {
            if (!handled.current) {
                handled.current = true;
                setError("Sign-in timed out. Please try again.");
                setTimeout(() => navigate("/login", { replace: true }), 2500);
            }
        }, 8000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none animate-float-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none animate-float-delayed" />

            <div className="relative z-10 text-center space-y-6 px-4">
                {error ? (
                    <div className="glass-card p-8 max-w-sm mx-auto space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white font-semibold">Sign-in failed</p>
                            <p className="text-slate-400 text-sm mt-1">{error}</p>
                            <p className="text-slate-500 text-xs mt-2">Redirecting to login…</p>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card p-8 max-w-sm mx-auto space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white font-semibold">Completing sign-in…</p>
                            <p className="text-slate-400 text-sm mt-1">Setting up your session</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;
