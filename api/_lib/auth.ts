import { VercelRequest } from '@vercel/node';
import * as cookie from 'cookie';
import { supabaseAuthClient } from './supabase.js';

export async function getUserFromRequest(req: VercelRequest) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies['sb-access-token'] || req.headers.authorization?.split('Bearer ')[1];
    console.log("Auth token present:", !!token);

    if (!token) {
        return null;
    }

    try {
        const { data: { user }, error } = await supabaseAuthClient.auth.getUser(token);

        if (error || !user) {
            console.error("Auth error:", error);
            return null;
        }

        return user;
    } catch (err) {
        console.error("Auth exception:", err);
        return null;
    }
}
