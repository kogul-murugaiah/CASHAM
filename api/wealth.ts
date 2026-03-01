import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';
import yahooFinance from 'yahoo-finance2';

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------
async function getMutualFundNav(schemeCode: string): Promise<number | null> {
    try {
        const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
            return parseFloat(data.data[0].nav);
        }
    } catch (e) {
        console.error('Error fetching MF NAV:', e);
    }
    return null;
}

async function getYahooFinancePrice(symbol: string): Promise<number | null> {
    try {
        const quote = await yahooFinance.quote(symbol) as any;
        return quote.regularMarketPrice || quote.price || null;
    } catch (e) {
        console.error('Error fetching Yahoo Finance price:', e);
    }
    return null;
}

// ---------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method, query: reqQuery } = req;
    const action = reqQuery.action || 'assets'; // 'assets', 'liabilities', or 'search'

    // ========================================================
    // ACTION: SEARCH
    // ========================================================
    if (action === 'search') {
        const { q, type } = reqQuery;
        if (!q || typeof q !== 'string') return res.status(400).json({ error: 'Missing search query' });

        try {
            if (type === 'mutual_funds') {
                const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`);
                const data = await response.json();
                const results = (data || []).map((item: any) => ({
                    symbol: item.schemeCode.toString(),
                    name: item.schemeName,
                    type: 'mutual_funds',
                    exchange: 'MFAPI'
                })).slice(0, 10);
                return res.status(200).json(results);
            } else {
                const searchResult = await yahooFinance.search(q);
                // Type cast since yahooFinance types can infer as never
                const quotes = (searchResult as any).quotes || [];
                const results = quotes
                    .filter((quote: any) => quote.isYahooFinance)
                    .map((quote: any) => ({
                        symbol: quote.symbol,
                        name: quote.shortname || quote.longname || quote.symbol,
                        type: quote.quoteType?.toLowerCase() === 'cryptocurrency' ? 'crypto' : 'stocks',
                        exchange: quote.exchange
                    })).slice(0, 10);
                return res.status(200).json(results);
            }
        } catch (error: any) {
            return res.status(500).json({ error: 'Search failed' });
        }
    }

    // ========================================================
    // ACTION: ASSETS
    // ========================================================
    if (action === 'assets') {
        if (method === 'GET') {
            try {
                const { data, error } = await supabaseAdmin
                    .from('assets')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const enrichedData = await Promise.all(data.map(async (asset) => {
                    let livePrice = null;
                    if (asset.symbol) {
                        if (asset.type === 'mutual_funds') {
                            livePrice = await getMutualFundNav(asset.symbol);
                        } else if (asset.type === 'stocks' || asset.type === 'crypto') {
                            livePrice = await getYahooFinancePrice(asset.symbol);
                        }
                    }
                    if (livePrice !== null && asset.units) {
                        return { ...asset, live_price: livePrice, value: livePrice * asset.units };
                    }
                    return asset;
                }));
                return res.status(200).json(enrichedData);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        } else if (method === 'POST') {
            try {
                const { type, name, symbol, units, purchase_price, purchase_date, value, notes } = req.body;
                let finalValue = value;
                if (!value && units && purchase_price) {
                    finalValue = units * purchase_price;
                }
                const { data, error } = await supabaseAdmin
                    .from('assets')
                    .insert([{
                        user_id: user.id, type, name, symbol: symbol || null, units: units || null,
                        purchase_price: purchase_price || null, purchase_date: purchase_date || null,
                        value: finalValue || 0, notes: notes || null
                    }]).select();
                if (error) throw error;
                return res.status(201).json(data[0]);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        } else if (method === 'DELETE') {
            try {
                const { id } = reqQuery;
                if (!id) return res.status(400).json({ error: 'Missing asset id' });
                const { error } = await supabaseAdmin.from('assets').delete().eq('id', id).eq('user_id', user.id);
                if (error) throw error;
                return res.status(200).json({ success: true });
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }
    }

    // ========================================================
    // ACTION: LIABILITIES
    // ========================================================
    if (action === 'liabilities') {
        if (method === 'GET') {
            try {
                const { data, error } = await supabaseAdmin.from('liabilities').select('*')
                    .eq('user_id', user.id).order('created_at', { ascending: false });
                if (error) throw error;
                return res.status(200).json(data);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        } else if (method === 'POST') {
            try {
                const { type, name, balance, interest_rate, minimum_payment, notes } = req.body;
                const { data, error } = await supabaseAdmin.from('liabilities').insert([{
                    user_id: user.id, type, name, balance, interest_rate: interest_rate || null,
                    minimum_payment: minimum_payment || null, notes: notes || null
                }]).select();
                if (error) throw error;
                return res.status(201).json(data[0]);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        } else if (method === 'DELETE') {
            try {
                const { id } = reqQuery;
                if (!id) return res.status(400).json({ error: 'Missing liability id' });
                const { error } = await supabaseAdmin.from('liabilities').delete().eq('id', id).eq('user_id', user.id);
                if (error) throw error;
                return res.status(200).json({ success: true });
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }
    }

    return res.status(405).json({ error: 'Method or action not allowed' });
}
