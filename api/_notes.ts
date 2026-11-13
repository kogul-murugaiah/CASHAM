import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;
    const { action } = req.query;

    try {
        if (method === 'GET') {
            if (action === 'list_notes' || !action) {
                const { data, error } = await supabaseAdmin
                    .from('notes')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('is_pinned', { ascending: false })
                    .order('updated_at', { ascending: false });

                if (error) throw error;
                return res.status(200).json(data || []);
            }
        }

        if (method === 'POST') {
            if (action === 'create_note' || !action) {
                const { title, content, color, is_pinned, category, tags } = req.body || {};

                const cleanTitle = String(title || '').trim();
                const cleanContent = String(content || '').trim();

                if (!cleanTitle && !cleanContent) {
                    return res.status(400).json({ error: 'Note cannot be empty' });
                }

                const { data, error } = await supabaseAdmin
                    .from('notes')
                    .insert([{
                        user_id: user.id,
                        title: cleanTitle,
                        content: cleanContent,
                        color: color || '#10b981',
                        is_pinned: Boolean(is_pinned),
                        category: category || 'General',
                        tags: Array.isArray(tags) ? tags : [],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (error) throw error;
                return res.status(201).json(data);
            }
        }

        if (method === 'PUT') {
            if (action === 'update_note' || !action) {
                const { id, title, content, color, is_pinned, category, tags } = req.body || {};
                if (!id) return res.status(400).json({ error: 'Note ID is required' });

                const updates: Record<string, unknown> = {
                    updated_at: new Date().toISOString()
                };

                if (title !== undefined) updates.title = String(title).trim();
                if (content !== undefined) updates.content = String(content).trim();
                if (color !== undefined) updates.color = color;
                if (is_pinned !== undefined) updates.is_pinned = Boolean(is_pinned);
                if (category !== undefined) updates.category = category;
                if (tags !== undefined && Array.isArray(tags)) updates.tags = tags;

                const { data, error } = await supabaseAdmin
                    .from('notes')
                    .update(updates)
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;
                return res.status(200).json(data);
            }

            if (action === 'toggle_pin') {
                const { id, is_pinned } = req.body || {};
                if (!id) return res.status(400).json({ error: 'Note ID is required' });

                const { data, error } = await supabaseAdmin
                    .from('notes')
                    .update({
                        is_pinned: Boolean(is_pinned),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;
                return res.status(200).json(data);
            }
        }

        if (method === 'DELETE') {
            if (action === 'delete_note' || !action) {
                const { id } = req.query;
                if (!id) return res.status(400).json({ error: 'Note ID is required' });

                const { error } = await supabaseAdmin
                    .from('notes')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) throw error;
                return res.status(200).json({ success: true });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: unknown) {
        console.error('Notes API Error:', err);
        const message = err instanceof Error ? err.message : 'Internal server error';
        return res.status(500).json({ error: message });
    }
}

