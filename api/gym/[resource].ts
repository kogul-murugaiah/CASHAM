import { VercelRequest, VercelResponse } from '@vercel/node';
import exercisesHandler from './exercises.js';
import routinesHandler from './routines.js';
import workoutsHandler from './workouts.js';
import setsHandler from './sets.js';
import prsHandler from './prs.js';
import statsHandler from './stats.js';
import historyHandler from './history.js';
import settingsHandler from './settings.js';

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
