import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    if (method === 'GET') {
        try {
            const { month, year } = req.query;
            
            if (!month || !year) {
                return res.status(400).json({ error: 'Month and year are required' });
            }

            // 1. Fetch budget month
            let { data: budgetMonth, error: monthError } = await supabaseAdmin
                .from('budget_months')
                .select('*')
                .eq('user_id', user.id)
                .eq('month', parseInt(month as string))
                .eq('year', parseInt(year as string))
                .maybeSingle();

            if (monthError) throw monthError;

            if (!budgetMonth) {
                // If it doesn't exist, return empty data rather than error
                return res.status(200).json({
                    id: null,
                    total_income: 0,
                    categories: []
                });
            }

            // 2. Fetch categories for this budget
            const { data: categories, error: catError } = await supabaseAdmin
                .from('budget_categories')
                .select('*')
                .eq('budget_id', budgetMonth.id)
                .order('created_at');

            if (catError) throw catError;

            // 3. Fetch items for these categories
            const categoryIds = (categories || []).map(c => c.id);
            let items: any[] = [];
            
            if (categoryIds.length > 0) {
                const { data: itemsData, error: itemsError } = await supabaseAdmin
                    .from('budget_items')
                    .select('*')
                    .in('category_id', categoryIds)
                    .order('created_at');
                    
                if (itemsError) throw itemsError;
                items = itemsData || [];
            }

            // 4. Assemble the nested structure
            const categoriesWithItems = (categories || []).map(cat => ({
                ...cat,
                items: items.filter(item => item.category_id === cat.id)
            }));

            return res.status(200).json({
                ...budgetMonth,
                categories: categoriesWithItems
            });

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'POST') {
        // Create or update the budget month (total income setup)
        try {
            const { month, year, total_income } = req.body;
            
            if (!month || !year) {
                return res.status(400).json({ error: 'Month and year are required' });
            }

            // Upsert doesn't work perfectly without unique index on user_id, month, year 
            // but we added it in the schema, so we can use an upsert-like logic
            let { data: existing } = await supabaseAdmin
                .from('budget_months')
                .select('id')
                .eq('user_id', user.id)
                .eq('month', parseInt(month))
                .eq('year', parseInt(year))
                .maybeSingle();

            let data;
            let error;

            if (existing) {
                const resUpdate = await supabaseAdmin
                    .from('budget_months')
                    .update({ total_income })
                    .eq('id', existing.id)
                    .select()
                    .single();
                data = resUpdate.data;
                error = resUpdate.error;
            } else {
                const resInsert = await supabaseAdmin
                    .from('budget_months')
                    .insert([{ user_id: user.id, month: parseInt(month), year: parseInt(year), total_income }])
                    .select()
                    .single();
                data = resInsert.data;
                error = resInsert.error;
            }

            if (error) throw error;
            return res.status(200).json(data);
            
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
