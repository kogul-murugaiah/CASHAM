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
        const yf = new (yahooFinance as any)();
        const quote = await yf.quote(symbol) as any;
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
    const action = reqQuery.action || 'assets';

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
                const yf = new (yahooFinance as any)();
                const searchResult = await yf.search(q);
                const quotes = (searchResult as any).quotes || [];
                const results = quotes
                    .map((quote: any) => ({
                        symbol: quote.symbol || quote.ticker || "",
                        name: quote.shortname || quote.longname || quote.name || quote.symbol || "Unknown",
                        type: quote.quoteType?.toLowerCase() === 'cryptocurrency' ? 'crypto' : 'stocks',
                        exchange: quote.exchange || quote.exchDisp || ""
                    }))
                    .filter((q: any) => q.symbol)
                    .slice(0, 10);
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
                const { data: rawAssets, error } = await supabaseAdmin
                    .from('assets')
                    .select('*')
                    .eq('user_id', user.id);

                if (error) throw error;

                // Group assets by symbol (for stocks/mf/crypto) or by ID (for static assets)
                const holdingsMap: Record<string, any> = {};

                for (const asset of (rawAssets || [])) {
                    // Unique key for aggregation: symbol or asset ID for non-trackable items
                    const key = asset.symbol || asset.id;

                    if (!holdingsMap[key]) {
                        holdingsMap[key] = {
                            ...asset,
                            total_units: asset.units || 0,
                            total_invested: (asset.units || 1) * (asset.purchase_price || asset.value || 0),
                            records: [asset]
                        };
                    } else {
                        holdingsMap[key].total_units += (asset.units || 0);
                        holdingsMap[key].total_invested += (asset.units || 1) * (asset.purchase_price || 0);
                        holdingsMap[key].records.push(asset);
                    }
                }

                const holdings = Object.values(holdingsMap);

                // Fetch live prices and calculate secondary metrics
                const enrichedHoldings = await Promise.all(holdings.map(async (holding) => {
                    let livePrice = null;
                    if (holding.symbol) {
                        if (holding.type === 'mutual_funds') {
                            livePrice = await getMutualFundNav(holding.symbol);
                        } else if (holding.type === 'stocks' || holding.type === 'crypto') {
                            livePrice = await getYahooFinancePrice(holding.symbol);
                        }
                    }

                    const avg_buy_price = holding.total_units > 0
                        ? holding.total_invested / holding.total_units
                        : holding.purchase_price || holding.value;

                    const current_value = livePrice !== null && holding.total_units > 0
                        ? livePrice * holding.total_units
                        : holding.value;

                    return {
                        ...holding,
                        avg_buy_price,
                        current_value,
                        live_price: livePrice,
                        pnl: current_value - holding.total_invested,
                        pnl_percent: holding.total_invested > 0
                            ? ((current_value - holding.total_invested) / holding.total_invested) * 100
                            : 0
                    };
                }));

                // Group by Categories for the UI
                const categories: Record<string, any[]> = {};
                let totalPortfolioValue = 0;
                let totalPortfolioInvested = 0;

                enrichedHoldings.forEach(h => {
                    if (!categories[h.type]) categories[h.type] = [];
                    categories[h.type].push(h);
                    totalPortfolioValue += h.current_value;
                    totalPortfolioInvested += h.total_invested;
                });

                return res.status(200).json({
                    holdings: enrichedHoldings,
                    categories,
                    summary: {
                        total_value: totalPortfolioValue,
                        total_invested: totalPortfolioInvested,
                        total_pnl: totalPortfolioValue - totalPortfolioInvested,
                        total_pnl_percent: totalPortfolioInvested > 0
                            ? ((totalPortfolioValue - totalPortfolioInvested) / totalPortfolioInvested) * 100
                            : 0
                    }
                });
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        else if (method === 'POST') {
            try {
                const { type, name, symbol, units, purchase_price, purchase_date, value, notes } = req.body;

                // For trackable assets, value is derived. For others, it's manual.
                const finalValue = value || (units && purchase_price ? units * purchase_price : 0);

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
                        value: finalValue,
                        notes: notes || null
                    }]).select();

                if (error) throw error;
                return res.status(201).json(data[0]);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        else if (method === 'DELETE') {
            try {
                const { id, symbol } = reqQuery;

                if (symbol) {
                    // Delete all instances of this trackable holding
                    const { error } = await supabaseAdmin.from('assets').delete().eq('symbol', symbol).eq('user_id', user.id);
                    if (error) throw error;
                } else if (id) {
                    const { error } = await supabaseAdmin.from('assets').delete().eq('id', id).eq('user_id', user.id);
                    if (error) throw error;
                } else {
                    return res.status(400).json({ error: 'Missing id or symbol' });
                }

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
