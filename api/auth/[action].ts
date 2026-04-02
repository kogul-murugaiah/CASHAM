import { VercelRequest, VercelResponse } from '@vercel/node';
import loginHandler from './_login.js';
import signupHandler from './_signup.js';
import logoutHandler from './_logout.js';
import userHandler from './_user.js';
import googleSetupHandler from './_google-setup.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = req.query.action as string;

    switch (action) {
        case 'login':
            return loginHandler(req, res);
        case 'signup':
            return signupHandler(req, res);
        case 'logout':
            return logoutHandler(req, res);
        case 'user':
            return userHandler(req, res);
        case 'google-setup':
            return googleSetupHandler(req, res);
        default:
            return res.status(404).json({ error: `Auth route not found: ${action}` });
    }
}
