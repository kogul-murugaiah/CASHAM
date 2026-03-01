import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from './_lib/auth.js';
import yahooFinance from 'yahoo-finance2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { q, type } = req.query;
    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Missing search query' });
    }

    try {
        if (type === 'mutual_funds') {
            // Search MFAPI for Indian Mutual Funds
            const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`);
            const data = await response.json();

            // Map to unified format and take top 10
            const results = (data || []).map((item: any) => ({
                symbol: item.schemeCode.toString(),
                name: item.schemeName,
                type: 'mutual_funds',
                exchange: 'MFAPI'
            })).slice(0, 10);

            return res.status(200).json(results);
        } else {
            // Search Yahoo Finance for Stocks, ETFs, and Crypto
            const searchResult = await yahooFinance.search(q);
            const results = searchResult.quotes
                .filter(quote => quote.isYahooFinance)
                .map(quote => ({
                    symbol: quote.symbol,
                    name: quote.shortname || quote.longname || quote.symbol,
                    type: quote.quoteType?.toLowerCase() === 'cryptocurrency' ? 'crypto' : 'stocks',
                    exchange: quote.exchange
                })).slice(0, 10);

            return res.status(200).json(results);
        }
    } catch (error: any) {
        console.error('Search Error:', error);
        return res.status(500).json({ error: 'Search failed' });
    }
}
