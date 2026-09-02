import { VercelRequest, VercelResponse } from '@vercel/node';

import expensesHandler from './_expenses.js';
import incomesHandler from './_incomes.js';
import transfersHandler from './_transfers.js';
import goalsHandler from './_goals.js';
import investmentsHandler from './_investments.js';
import lookupsHandler from './_lookups.js';
import profileHandler from './_profile.js';
import accountsHandler from './_accounts.js';
import dashboardHandler from './_dashboard.js';
import creditCardsHandler from './_credit_cards.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { resource } = req.query;

    switch (resource) {
        case 'expenses': return expensesHandler(req, res);
        case 'incomes': return incomesHandler(req, res);
        case 'transfers': return transfersHandler(req, res);
        case 'goals': return goalsHandler(req, res);
        case 'investments': return investmentsHandler(req, res);
        case 'lookups': return lookupsHandler(req, res);
        case 'profile': return profileHandler(req, res);
        case 'accounts': return accountsHandler(req, res);
        case 'dashboard': return dashboardHandler(req, res);
        case 'credit-cards': return creditCardsHandler(req, res);
        default:
            return res.status(404).json({ error: `Route /api/${resource} not found in resource router.` });
    }
}