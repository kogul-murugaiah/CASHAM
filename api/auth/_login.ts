import { VercelRequest, VercelResponse } from '@vercel/node';
import * as cookie from 'cookie';
import { supabaseAuthClient } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(error.status || 400).json({ error: error.message });
        }

        if (data?.session) {
            const accessTokenCookie = cookie.serialize('sb-access-token', data.session.access_token, {
                httpOnly: true,
                secure: true, // Always true for cross-device resilience
                maxAge: data.session.expires_in,
                path: '/',
                sameSite: 'none', // Critical for mobile
            });

            const refreshTokenCookie = cookie.serialize('sb-refresh-token', data.session.refresh_token, {
                httpOnly: true,
                secure: true, // Always true for cross-device resilience
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
                sameSite: 'none', // Critical for mobile
            });

            res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
            return res.status(200).json({ user: data.user });
        }

        return res.status(200).json({ error: 'Login failed, no session created' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
