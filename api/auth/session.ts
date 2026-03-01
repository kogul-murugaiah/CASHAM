import { VercelRequest, VercelResponse } from '@vercel/node';
import * as cookie from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { access_token, refresh_token, expires_in } = req.body || {};

    if (!access_token || !refresh_token) {
        return res.status(400).json({ error: 'Missing tokens' });
    }

    const accessTokenCookie = cookie.serialize('sb-access-token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: expires_in || 3600,
        path: '/',
        sameSite: 'lax',
    });

    const refreshTokenCookie = cookie.serialize('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        sameSite: 'lax',
    });

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
    return res.status(200).json({ success: true });
}
