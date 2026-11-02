import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    // GET /api/gym/settings
    if (method === 'GET') {
        try {
            const { data, error } = await supabaseAdmin
                .from('gym_user_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            const defaults = {
                user_id: user.id,
                preferred_unit: 'kg',
                default_rest_seconds: 90,
                weekly_workout_target: 5,
                week_start_day: 1
            };

            return res.status(200).json(data || defaults);
        } catch (error: any) {
            console.error('Error fetching gym settings:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // PUT /api/gym/settings
    if (method === 'PUT') {
        try {
            const { preferred_unit, default_rest_seconds, weekly_workout_target, week_start_day } = req.body;

            const payload: any = {
                user_id: user.id,
                updated_at: new Date().toISOString()
            };

            if (preferred_unit) payload.preferred_unit = preferred_unit === 'lbs' ? 'lbs' : 'kg';
            if (default_rest_seconds) payload.default_rest_seconds = Math.max(15, parseInt(default_rest_seconds));
            if (weekly_workout_target) payload.weekly_workout_target = Math.min(7, Math.max(1, parseInt(weekly_workout_target)));
            if (week_start_day) payload.week_start_day = Math.min(7, Math.max(1, parseInt(week_start_day)));

            const { data, error } = await supabaseAdmin
                .from('gym_user_settings')
                .upsert(payload)
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json(data);
        } catch (error: any) {
            console.error('Error saving gym settings:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

