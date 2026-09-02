import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, auto_carryover_enabled')
      .eq('id', user.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const enabled = req.body?.auto_carryover_enabled;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'auto_carryover_enabled must be boolean' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        { id: user.id, auto_carryover_enabled: enabled },
        { onConflict: 'id' }
      )
      .select('id, auto_carryover_enabled')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}