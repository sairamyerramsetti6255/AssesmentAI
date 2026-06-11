import { demoStore } from '../lib/demoStore.js';
export async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Not logged in. Please sign in again.' });
    }
    const token = authHeader.slice(7);
    req.token = token;
    const session = demoStore.sessions_auth.get(token);
    if (!session) {
        return res.status(401).json({
            error: 'Session expired or server was restarted. Please log in again.',
        });
    }
    const user = demoStore.users.find((u) => u.id === session.userId);
    if (!user)
        return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role_name)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
