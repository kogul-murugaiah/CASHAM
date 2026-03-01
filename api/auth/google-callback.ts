import { VercelRequest, VercelResponse } from '@vercel/node';
import * as cookie from 'cookie';
import { supabaseAuthClient } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const code = req.query.code as string;

    if (!code) {
        return res.status(400).json({ error: 'Missing OAuth code' });
    }

    try {
        const { data, error } = await supabaseAuthClient.auth.exchangeCodeForSession(code);

        if (error || !data?.session) {
            console.error('Google OAuth exchange error:', error);
            return res.status(400).json({ error: error?.message || 'Failed to exchange code for session' });
        }

        const { session } = data;

        const accessTokenCookie = cookie.serialize('sb-access-token', session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: session.expires_in,
            path: '/',
            sameSite: 'lax',
        });

        const refreshTokenCookie = cookie.serialize('sb-refresh-token', session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
            sameSite: 'lax',
        });

        res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
        return res.status(200).json({ user: data.user });
    } catch (err: any) {
        console.error('Google callback exception:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
