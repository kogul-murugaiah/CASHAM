import { VercelRequest } from '@vercel/node';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';

interface SupabaseJwtPayload {
    sub: string;
    email?: string;
    role?: string;
    aud?: string;
    exp?: number;
    iat?: number;
}

// Build the verifier key once at module load time
function getVerifierKey() {
    const jwkJson = process.env.SUPABASE_JWT_PUBLIC_KEY;
    const secret = process.env.SUPABASE_JWT_SECRET;

    if (jwkJson) {
        // Newer Supabase projects use ES256 (EC asymmetric key)
        try {
            const jwk = JSON.parse(jwkJson);
            return createPublicKey({ key: jwk, format: 'jwk' });
        } catch {
            console.error('Failed to parse SUPABASE_JWT_PUBLIC_KEY');
            return null;
        }
    }

    if (secret) {
        // Older Supabase projects use HS256 (symmetric secret)
        return secret;
    }

    console.error('Neither SUPABASE_JWT_PUBLIC_KEY nor SUPABASE_JWT_SECRET is set');
    return null;
}

const verifierKey = getVerifierKey();

export async function getUserFromRequest(req: VercelRequest) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies['sb-access-token'] || req.headers.authorization?.split('Bearer ')[1];

    if (!token || !verifierKey) {
        return null;
    }

    try {
        // Verify JWT locally — no network call to Supabase needed.
        // Supports both ES256 (EC public key) and HS256 (secret string).
        const decoded = jwt.verify(token, verifierKey, {
            algorithms: ['ES256', 'HS256'],
        }) as SupabaseJwtPayload;

        if (!decoded.sub) {
            return null;
        }

        return {
            id: decoded.sub,
            email: decoded.email || '',
            role: decoded.role,
        };
    } catch (err: any) {
        console.error('JWT verification error:', err.message);
        return null;
    }
}
