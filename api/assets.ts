import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';
import yahooFinance from 'yahoo-finance2';

// Helper to fetch MF NAV
async function getMutualFundNav(schemeCode: string): Promise<number | null> {
    try {
        const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
            // data.data[0] contains the latest entry
            return parseFloat(data.data[0].nav);
        }
    } catch (e) {
        console.error('Error fetching MF NAV:', e);
    }
    return null;
}

// Helper to fetch Stock/Crypto Price
async function getYahooFinancePrice(symbol: string): Promise<number | null> {
    try {
        const quote = await yahooFinance.quote(symbol);
        return quote.regularMarketPrice || quote.price || null;
    } catch (e) {
        console.error('Error fetching Yahoo Finance price:', e);
    }
    return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    if (method === 'GET') {
        try {
            const { data, error } = await supabaseAdmin
                .from('assets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Enrich with live price
            const enrichedData = await Promise.all(data.map(async (asset) => {
                let livePrice = null;

                if (asset.symbol) {
                    if (asset.type === 'mutual_funds') {
                        livePrice = await getMutualFundNav(asset.symbol);
                    } else if (asset.type === 'stocks' || asset.type === 'crypto') {
                        livePrice = await getYahooFinancePrice(asset.symbol);
                    }
                }

                // If we get a live price and we know units, update current value dynamically
                if (livePrice !== null && asset.units) {
                    return {
                        ...asset,
                        live_price: livePrice,
                        value: livePrice * asset.units
                    };
                }

                return asset;
            }));

            return res.status(200).json(enrichedData);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'POST') {
        try {
            const { type, name, symbol, units, purchase_price, purchase_date, value, notes } = req.body;

            // Calculate manual value if units and price exist but no manual value provided
            let finalValue = value;
            if (!value && units && purchase_price) {
                finalValue = units * purchase_price;
            }

            const { data, error } = await supabaseAdmin
                .from('assets')
                .insert([{
                    user_id: user.id,
                    type,
                    name,
                    symbol: symbol || null,
                    units: units || null,
                    purchase_price: purchase_price || null,
                    purchase_date: purchase_date || null,
                    value: finalValue || 0,
                    notes: notes || null
                }])
                .select();

            if (error) throw error;
            return res.status(201).json(data[0]);
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Missing asset id' });

            const { error } = await supabaseAdmin
                .from('assets')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
