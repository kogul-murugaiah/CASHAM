import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';

/**
 * api/prices/refresh.ts
 * Vercel Cron Job to automate investment price updates.
 * Schedule: 8:00 AM IST (2:30 AM UTC)
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Authorization — Simplified for cron. Use a secret header if needed.
    // if (req.headers['x-cron-auth'] !== process.env.CRON_SECRET) {
    //     return res.status(401).json({ error: 'Unauthorized' });
    // }

    try {
        console.log('--- Starting Price Refresh Job ---');
        
        // 1. Fetch all automated investments
        const { data: automatedInvs, error } = await supabaseAdmin
            .from('investments')
            .select('id, type, name, current_value, investment_mf(amfi_code), investment_stock(ticker, exchange)')
            .eq('is_automated', true);

        if (error) throw error;
        if (!automatedInvs?.length) return res.status(200).json({ message: 'No automated investments found' });

        const mfs = automatedInvs.filter(i => i.type === 'Mutual Fund' && i.investment_mf?.[0]?.amfi_code);
        const stocks = automatedInvs.filter(i => i.type === 'Stock' && i.investment_stock?.[0]?.ticker);

        let updatedCount = 0;

        // 2. Refresh Mutual Funds via AMFI
        if (mfs.length > 0) {
            console.log(`Refreshing ${mfs.length} Mutual Funds...`);
            const amfiRes = await fetch('https://portal.amfiindia.com/spages/NAVAll.txt');
            const amfiText = await amfiRes.text();
            
            // Map amfi_code -> nav
            const navMap: Record<string, number> = {};
            const lines = amfiText.split('\n');
            for (const line of lines) {
                const parts = line.split(';');
                if (parts.length >= 5) {
                    const code = parts[0].trim();
                    const nav = parseFloat(parts[4]);
                    if (!isNaN(nav)) navMap[code] = nav;
                }
            }

            for (const inv of mfs) {
                const code = inv.investment_mf[0].amfi_code;
                const newNav = navMap[code];
                if (newNav) {
                    // Update current_value = nav * units
                    const { data: mfDetail } = await supabaseAdmin
                        .from('investment_mf')
                        .select('units')
                        .eq('investment_id', inv.id)
                        .single();
                    
                    if (mfDetail?.units) {
                        const newVal = newNav * mfDetail.units;
                        await supabaseAdmin
                            .from('investments')
                            .update({ 
                                current_value: newVal, 
                                current_value_updated_at: new Date().toISOString() 
                            })
                            .eq('id', inv.id);
                        updatedCount++;
                    }
                }
            }
        }

        // 3. Refresh Stocks via Twelve Data (Placeholder API Key)
        if (stocks.length > 0) {
            console.log(`Refreshing ${stocks.length} Stocks...`);
            const apiKey = process.env.TWELVE_DATA_API_KEY;
            if (apiKey) {
                // Batch request tickers
                const tickers = stocks.map(s => s.investment_stock[0].ticker).join(',');
                const stockRes = await fetch(`https://api.twelvedata.com/price?symbol=${tickers}&apikey=${apiKey}`);
                const stockData = await stockRes.json();

                for (const inv of stocks) {
                    const ticker = inv.investment_stock[0].ticker;
                    const price = parseFloat(stockData[ticker]?.price || stockData.price); 
                    // Note: Twelve Data returns { "AAPL": { "price": "..." } } for multiples, or just { "price": "..." } for one.
                    
                    if (!isNaN(price)) {
                        const { data: sDetail } = await supabaseAdmin
                            .from('investment_stock')
                            .select('quantity')
                            .eq('investment_id', inv.id)
                            .single();
                        
                        if (sDetail?.quantity) {
                            const newVal = price * sDetail.quantity;
                            await supabaseAdmin
                                .from('investments')
                                .update({ 
                                    current_value: newVal, 
                                    current_value_updated_at: new Date().toISOString() 
                                })
                                .eq('id', inv.id);
                            updatedCount++;
                        }
                    }
                }
            } else {
                console.warn('TWELVE_DATA_API_KEY missing. Skipping Stock refresh.');
            }
        }

        return res.status(200).json({ 
            success: true, 
            updated: updatedCount,
            timestamp: new Date().toISOString()
        });

    } catch (err: any) {
        console.error('Refresh Job Failed:', err);
        return res.status(500).json({ error: err.message });
    }
}
