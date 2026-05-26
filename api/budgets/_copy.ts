import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

/**
 * POST /api/budgets/copy
 * Body: { source_month, source_year, target_month, target_year }
 *
 * Copies all categories + items from the source budget month into
 * the target month. Items are reset to 'planned' with paid_amount = null.
 * If the target month already has data, it is replaced (categories cleared
 * and re-created from template).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { source_month, source_year, target_month, target_year } = req.body;

        if (!source_month || !source_year || !target_month || !target_year) {
            return res.status(400).json({ error: 'source_month, source_year, target_month, target_year are required' });
        }

        const srcM = parseInt(source_month);
        const srcY = parseInt(source_year);
        const tgtM = parseInt(target_month);
        const tgtY = parseInt(target_year);

        // 1. Load source budget month
        const { data: sourceBudget, error: srcErr } = await supabaseAdmin
            .from('budget_months')
            .select('*')
            .eq('user_id', user.id)
            .eq('month', srcM)
            .eq('year', srcY)
            .maybeSingle();

        if (srcErr) throw srcErr;
        if (!sourceBudget) {
            return res.status(404).json({ error: 'Source budget month not found. Nothing to copy.' });
        }

        // 2. Load source categories
        const { data: sourceCategories, error: catErr } = await supabaseAdmin
            .from('budget_categories')
            .select('*')
            .eq('budget_id', sourceBudget.id)
            .order('created_at');

        if (catErr) throw catErr;

        // 3. Load source items
        const sourceCatIds = (sourceCategories || []).map(c => c.id);
        let sourceItems: any[] = [];

        if (sourceCatIds.length > 0) {
            const { data: itemsData, error: itemsErr } = await supabaseAdmin
                .from('budget_items')
                .select('*')
                .in('category_id', sourceCatIds)
                .order('created_at');

            if (itemsErr) throw itemsErr;
            sourceItems = itemsData || [];
        }

        // 4. Ensure target budget month exists (upsert total_income from source)
        let { data: targetBudget } = await supabaseAdmin
            .from('budget_months')
            .select('id')
            .eq('user_id', user.id)
            .eq('month', tgtM)
            .eq('year', tgtY)
            .maybeSingle();

        if (!targetBudget) {
            const { data: created, error: createErr } = await supabaseAdmin
                .from('budget_months')
                .insert([{
                    user_id: user.id,
                    month: tgtM,
                    year: tgtY,
                    total_income: sourceBudget.total_income
                }])
                .select()
                .single();

            if (createErr) throw createErr;
            targetBudget = created;
        } else {
            // Update income to match source
            await supabaseAdmin
                .from('budget_months')
                .update({ total_income: sourceBudget.total_income })
                .eq('id', targetBudget.id);
        }

        // 5. Delete existing categories in target (cascade deletes items via FK)
        const { data: existingCats } = await supabaseAdmin
            .from('budget_categories')
            .select('id')
            .eq('budget_id', targetBudget.id);

        if (existingCats && existingCats.length > 0) {
            const existingCatIds = existingCats.map(c => c.id);

            // Delete items first (in case no cascade)
            await supabaseAdmin
                .from('budget_items')
                .delete()
                .in('category_id', existingCatIds);

            await supabaseAdmin
                .from('budget_categories')
                .delete()
                .eq('budget_id', targetBudget.id);
        }

        // 6. Insert copied categories + items
        for (const cat of (sourceCategories || [])) {
            const { data: newCat, error: newCatErr } = await supabaseAdmin
                .from('budget_categories')
                .insert([{
                    user_id: user.id,
                    budget_id: targetBudget.id,
                    name: cat.name,
                    allocated_amount: cat.allocated_amount,
                    account_name: cat.account_name ?? null
                }])
                .select()
                .single();

            if (newCatErr) throw newCatErr;

            const catItems = sourceItems.filter(i => i.category_id === cat.id);
            if (catItems.length > 0) {
                const itemsToInsert = catItems.map(item => ({
                    user_id: user.id,
                    category_id: newCat.id,
                    name: item.name,
                    amount: item.amount,
                    status: 'planned',
                    paid_amount: null
                }));

                const { error: insertItemsErr } = await supabaseAdmin
                    .from('budget_items')
                    .insert(itemsToInsert);

                if (insertItemsErr) throw insertItemsErr;
            }
        }

        return res.status(200).json({
            success: true,
            message: `Budget template copied to ${tgtM}/${tgtY}`
        });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
