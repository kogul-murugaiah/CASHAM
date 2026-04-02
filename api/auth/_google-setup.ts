import { VercelRequest, VercelResponse } from '@vercel/node';
import * as cookie from 'cookie';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

const DEFAULT_CATEGORIES = [
    'Food & Dining', 'Transportation', 'Entertainment', 'Shopping',
    'Healthcare', 'Education', 'Bills & Utilities', 'Travel', 'Others',
];
const DEFAULT_SOURCES = ['Salary', 'Freelance', 'Business', 'Investment Returns', 'Others'];
const DEFAULT_ACCOUNT_TYPES = ['Stocks', 'Mutual Funds', 'Fixed Deposit', 'Savings Account', 'Others'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { access_token, refresh_token, expires_in } = req.body || {};

    if (!access_token || !refresh_token) {
        return res.status(400).json({ error: 'Missing tokens' });
    }

    // 1. Set httpOnly session cookies
    res.setHeader('Set-Cookie', [
        cookie.serialize('sb-access-token', access_token, {
            httpOnly: true,
            secure: true,
            maxAge: expires_in || 3600,
            path: '/',
            sameSite: 'none',
        }),
        cookie.serialize('sb-refresh-token', refresh_token, {
            httpOnly: true,
            secure: true,
            maxAge: 60 * 60 * 24 * 30,
            path: '/',
            sameSite: 'none',
        }),
    ]);

    // 2. Seed default data for new users (idempotent — only inserts if user has none)
    try {
        // Re-read user from the cookies we just set by decoding the token directly
        const user = await getUserFromRequest({
            ...req,
            headers: { ...req.headers, cookie: `sb-access-token=${access_token}` },
        } as VercelRequest);

        if (user) {
            const [{ data: cats }, { data: srcs }, { data: accts }] = await Promise.all([
                supabaseAdmin.from('categories').select('id').eq('user_id', user.id).limit(1),
                supabaseAdmin.from('income_sources').select('id').eq('user_id', user.id).limit(1),
                supabaseAdmin.from('account_types').select('name').eq('user_id', user.id).limit(1),
            ]);

            await Promise.all([
                (!cats || cats.length === 0) && supabaseAdmin.from('categories').insert(
                    DEFAULT_CATEGORIES.map(name => ({ user_id: user.id, name }))
                ),
                (!srcs || srcs.length === 0) && supabaseAdmin.from('income_sources').insert(
                    DEFAULT_SOURCES.map(name => ({ user_id: user.id, name }))
                ),
                (!accts || accts.length === 0) && supabaseAdmin.from('account_types').insert(
                    DEFAULT_ACCOUNT_TYPES.map(name => ({ user_id: user.id, name }))
                ),
            ].filter(Boolean));
        }
    } catch (seedErr) {
        console.warn('Seed defaults failed (non-critical):', seedErr);
    }

    return res.status(200).json({ success: true });
}
