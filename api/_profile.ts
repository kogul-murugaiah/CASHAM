import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Authenticate the user
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            return res.status(500).json({ error: error.message });
        }
        
        return res.status(200).json({ displayName: data?.display_name || null });
    }

    if (req.method === 'POST') {
        const { displayName } = req.body;
        if (!displayName) return res.status(400).json({ error: 'Display Name is required' });

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .upsert({ 
                id: user.id, 
                display_name: displayName,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ message: 'Profile updated successfully', profile: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
