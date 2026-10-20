function getISTDateStr(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(date);
}

import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;
    const { action } = req.query;

    try {
        // ─── GET ────────────────────────────────────────────────────────────────
        if (method === 'GET') {
            if (action === 'get_today') {
                // Target date: defaults to today, but supports ?date=YYYY-MM-DD for backdating / yesterday
                const targetDateStr = (req.query.date as string) || getISTDateStr();
                const targetDateObj = new Date(targetDateStr);
                const targetDayOfWeek = targetDateObj.getDay();

                // Active (not stopped), not paused tasks
                const { data: tasks, error: tErr } = await supabaseAdmin
                    .from('tasks')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .eq('is_paused', false)
                    .order('created_at', { ascending: true });

                if (tErr) throw tErr;

                // All completions up to target date (to check target date completion and past completions for carry-forward)
                const { data: completions, error: cErr } = await supabaseAdmin
                    .from('task_completions')
                    .select('task_id, completed_date')
                    .eq('user_id', user.id)
                    .lte('completed_date', targetDateStr);

                if (cErr) throw cErr;

                const targetDateCompletedIds = new Set(
                    (completions || [])
                        .filter((c: any) => c.completed_date === targetDateStr)
                        .map((c: any) => c.task_id)
                );

                const pastCompletedIds = new Set(
                    (completions || [])
                        .filter((c: any) => c.completed_date < targetDateStr)
                        .map((c: any) => c.task_id)
                );

                // Filter tasks scheduled for target date
                const todayTasks = (tasks || []).filter((task: any) => {
                    // Skip if task recurrence ended before target date
                    if (task.end_date && task.end_date < targetDateStr) return false;

                    const ft = task.frequency_type;
                    if (ft === 'daily') return true;
                    if (ft === 'weekly') {
                        const days: number[] = task.frequency_days || [];
                        return days.includes(targetDayOfWeek);
                    }
                    if (ft === 'monthly') {
                        return task.frequency_monthly_date === targetDateObj.getDate();
                    }
                    if (ft === 'custom') {
                        const interval = Math.max(1, task.frequency_x_times || 1);
                        const anchorStr = task.due_date || task.created_at.slice(0, 10);
                        const [ay, am, ad] = anchorStr.split('-').map(Number);
                        const [ty, tm, td] = targetDateStr.split('-').map(Number);
                        const anchorUtc = Date.UTC(ay, am - 1, ad);
                        const targetUtc = Date.UTC(ty, tm - 1, td);
                        const diffDays = Math.round((targetUtc - anchorUtc) / 86400000);
                        return diffDays >= 0 && (diffDays % interval === 0);
                    }
                    if (ft === 'one_time') {
                        // 1. Long term goal with NO due date: DO NOT show in daily task list!
                        if (!task.due_date) return false;

                        // 2. Due on target date
                        if (task.due_date === targetDateStr) return true;

                        // 3. Overdue task: carry forward if not completed previously
                        if (task.due_date < targetDateStr) {
                            if (pastCompletedIds.has(task.id)) return false; // Already done in the past
                            // Carry forward if carry_forward is true OR if it's currently completed on target date
                            if (task.carry_forward || targetDateCompletedIds.has(task.id)) return true;
                        }

                        // Future due date: don't show yet
                        return false;
                    }
                    return false;
                });

                const result = todayTasks.map((t: any) => ({
                    ...t,
                    completed_today: targetDateCompletedIds.has(t.id),
                    is_carried_forward: t.frequency_type === 'one_time' && t.due_date && t.due_date < targetDateStr,
                }));

                return res.status(200).json(result);
            }

            if (action === 'get_all') {
                // Return ALL tasks including paused/stopped so user can manage them
                const { data, error } = await supabaseAdmin
                    .from('tasks')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Also fetch completed task IDs for completion status
                const { data: comps } = await supabaseAdmin
                    .from('task_completions')
                    .select('task_id')
                    .eq('user_id', user.id);

                const completedIds = new Set((comps || []).map((c: any) => c.task_id));
                const result = (data || []).map((t: any) => ({
                    ...t,
                    completed_today: completedIds.has(t.id),
                }));

                return res.status(200).json(result);
            }

            if (action === 'get_heatmap_data') {
                const from = new Date();
                from.setDate(from.getDate() - 364);
                const fromStr = getISTDateStr(from);

                const { data: comps, error: cErr } = await supabaseAdmin
                    .from('task_completions')
                    .select('task_id, completed_date')
                    .eq('user_id', user.id)
                    .gte('completed_date', fromStr)
                    .order('completed_date', { ascending: true });

                if (cErr) throw cErr;

                // Aggregate total per date + per-task per date
                const counts: Record<string, number> = {};
                const taskCounts: Record<string, Record<string, number>> = {};

                (comps || []).forEach((c: any) => {
                    counts[c.completed_date] = (counts[c.completed_date] || 0) + 1;
                    if (!taskCounts[c.task_id]) taskCounts[c.task_id] = {};
                    taskCounts[c.task_id][c.completed_date] = 1;
                });

                const { data: tasks } = await supabaseAdmin
                    .from('tasks')
                    .select('id, title, color, frequency_type, frequency_days, frequency_monthly_date, frequency_x_times, frequency_x_period, due_date, end_date, is_paused, is_active, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                return res.status(200).json({ counts, taskCounts, tasks: tasks || [] });
            }

            if (action === 'get_stats') {
                const today = getISTDateStr();
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
                const fromStr = getISTDateStr(thirtyDaysAgo);

                const { data: comps, error } = await supabaseAdmin
                    .from('task_completions')
                    .select('completed_date, task_id')
                    .eq('user_id', user.id)
                    .gte('completed_date', fromStr)
                    .lte('completed_date', today)
                    .order('completed_date', { ascending: true });

                if (error) throw error;
                return res.status(200).json(comps || []);
            }

            return res.status(400).json({ error: 'Unknown GET action' });
        }

        // ─── POST ───────────────────────────────────────────────────────────────
        if (method === 'POST') {
            if (action === 'add_task') {
                const {
                    title, description, category, color,
                    frequency_type, frequency_days, frequency_monthly_date,
                    frequency_x_times, frequency_x_period,
                    time_block, due_date, end_date, priority,
                    estimated_minutes, carry_forward,
                } = req.body;

                const { data, error } = await supabaseAdmin
                    .from('tasks')
                    .insert({
                        user_id: user.id,
                        title,
                        description: description || null,
                        category: category || 'Personal',
                        color: color || '#10b981',
                        frequency_type,
                        frequency_days: frequency_days || null,
                        frequency_monthly_date: frequency_monthly_date || null,
                        frequency_x_times: frequency_x_times || null,
                        frequency_x_period: frequency_x_period || null,
                        time_block: time_block || 'anytime',
                        due_date: due_date || null,
                        end_date: end_date || null,
                        priority: priority || 'medium',
                        estimated_minutes: estimated_minutes || null,
                        carry_forward: carry_forward || false,
                        is_active: true,
                        is_paused: false,
                    })
                    .select()
                    .single();

                if (error) throw error;
                return res.status(201).json(data);
            }

            if (action === 'toggle_complete') {
                const { task_id, date, notes } = req.body;
                const targetDate = date || getISTDateStr();

                const { data: existing } = await supabaseAdmin
                    .from('task_completions')
                    .select('id')
                    .eq('task_id', task_id)
                    .eq('user_id', user.id)
                    .eq('completed_date', targetDate)
                    .single();

                if (existing) {
                    const { error } = await supabaseAdmin
                        .from('task_completions')
                        .delete()
                        .eq('id', existing.id);
                    if (error) throw error;
                    return res.status(200).json({ completed: false });
                } else {
                    const { error } = await supabaseAdmin
                        .from('task_completions')
                        .insert({
                            task_id,
                            user_id: user.id,
                            completed_date: targetDate,
                            notes: notes || null,
                        });
                    if (error) throw error;
                    return res.status(200).json({ completed: true });
                }
            }

            // ── Pause / Resume / Stop ────────────────────────────────────────
            if (action === 'pause_task') {
                const { id } = req.body;
                const { data, error } = await supabaseAdmin
                    .from('tasks')
                    .update({ is_paused: true })
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                if (error) throw error;
                return res.status(200).json(data);
            }

            if (action === 'resume_task') {
                const { id } = req.body;
                const { data, error } = await supabaseAdmin
                    .from('tasks')
                    .update({ is_paused: false })
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                if (error) throw error;
                return res.status(200).json(data);
            }

            if (action === 'stop_task') {
                // Marks as inactive (ended). History preserved.
                const { id } = req.body;
                const todayStr = getISTDateStr();
                const { data, error } = await supabaseAdmin
                    .from('tasks')
                    .update({ is_active: false, end_date: todayStr })
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                if (error) throw error;
                return res.status(200).json(data);
            }

            return res.status(400).json({ error: 'Unknown POST action' });
        }

        // ─── PUT ────────────────────────────────────────────────────────────────
        if (method === 'PUT') {
            if (action === 'update_task') {
                const { id, ...updates } = req.body;

                const { data, error } = await supabaseAdmin
                    .from('tasks')
                    .update(updates)
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;
                return res.status(200).json(data);
            }

            return res.status(400).json({ error: 'Unknown PUT action' });
        }

        // ─── DELETE ─────────────────────────────────────────────────────────────
        if (method === 'DELETE') {
            if (action === 'delete_task') {
                const { id } = req.body;

                const { error } = await supabaseAdmin
                    .from('tasks')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) throw error;
                return res.status(200).json({ success: true });
            }

            return res.status(400).json({ error: 'Unknown DELETE action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[tasks handler]', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
