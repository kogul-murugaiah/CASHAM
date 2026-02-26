import { VercelRequest, VercelResponse } from '@vercel/node';
import * as cookie from 'cookie';
import { supabaseAuthClient } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Clear cookie even if Supabase logout fails locally
    const accessTokenCookie = cookie.serialize('sb-access-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        expires: new Date(0),
        path: '/',
        sameSite: 'lax',
    });

    const refreshTokenCookie = cookie.serialize('sb-refresh-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        expires: new Date(0),
        path: '/',
        sameSite: 'lax',
    });

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);

    // We can try to optionally clear the session from Supabase but it's not strictly necessary 
    // if we just clear the cookies, which invalidates the session from the client's perspective

    return res.status(200).json({ message: 'Logged out successfully' });
}
