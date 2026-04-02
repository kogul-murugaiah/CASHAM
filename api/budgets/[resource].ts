import { VercelRequest, VercelResponse } from '@vercel/node';
import budgetMonthHandler from './_index.js';
import categoriesHandler from './_categories.js';
import itemsHandler from './_items.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const resource = req.query.resource as string;

    switch (resource) {
        case 'categories':
            return categoriesHandler(req, res);
        case 'items':
            return itemsHandler(req, res);
        case 'month':
        default:
            // root budget month setup
            return budgetMonthHandler(req, res);
    }
}
