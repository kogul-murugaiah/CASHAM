import { VercelRequest, VercelResponse } from '@vercel/node';
import exercisesHandler from './_exercises.js';
import routinesHandler from './_routines.js';
import workoutsHandler from './_workouts.js';
import setsHandler from './_sets.js';
import prsHandler from './_prs.js';
import statsHandler from './_stats.js';
import historyHandler from './_history.js';
import settingsHandler from './_settings.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const resource = req.query.resource as string;

    switch (resource) {
        case 'exercises':
            return exercisesHandler(req, res);
        case 'routines':
            return routinesHandler(req, res);
        case 'workouts':
            return workoutsHandler(req, res);
        case 'sets':
            return setsHandler(req, res);
        case 'prs':
            return prsHandler(req, res);
        case 'stats':
            return statsHandler(req, res);
        case 'history':
            return historyHandler(req, res);
        case 'settings':
            return settingsHandler(req, res);
        default:
            return res.status(404).json({ error: `Gym resource /api/gym/${resource} not found` });
    }
}
