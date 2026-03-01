import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

const DEFAULT_CATEGORIES = [
    'Food & Dining',
    'Transportation',
    'Entertainment',
    'Shopping',
    'Healthcare',
    'Education',
    'Bills & Utilities',
    'Travel',
    'Others',
];

const DEFAULT_SOURCES = [
    'Salary',
    'Freelance',
    'Business',
    'Investment Returns',
    'Others',
];

const DEFAULT_ACCOUNT_TYPES = [
    'Stocks',
    'Mutual Funds',
    'Fixed Deposit',
    'Savings Account',
    'Others',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Check if user already has categories — idempotent, safe to call multiple times
        const { data: existingCategories } = await supabaseAdmin
            .from('categories')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

        if (!existingCategories || existingCategories.length === 0) {
            await supabaseAdmin.from('categories').insert(
                DEFAULT_CATEGORIES.map(name => ({ user_id: user.id, name }))
            );
        }

        // Check if user already has income sources
        const { data: existingSources } = await supabaseAdmin
            .from('income_sources')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

        if (!existingSources || existingSources.length === 0) {
            await supabaseAdmin.from('income_sources').insert(
                DEFAULT_SOURCES.map(name => ({ user_id: user.id, name }))
            );
        }

        // Check if user already has account types
        const { data: existingAccounts } = await supabaseAdmin
            .from('account_types')
            .select('name')
            .eq('user_id', user.id)
            .limit(1);

        if (!existingAccounts || existingAccounts.length === 0) {
            await supabaseAdmin.from('account_types').insert(
                DEFAULT_ACCOUNT_TYPES.map(name => ({ user_id: user.id, name }))
            );
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('Seed defaults error:', err);
        return res.status(500).json({ error: err.message || 'Failed to seed defaults' });
    }
}
