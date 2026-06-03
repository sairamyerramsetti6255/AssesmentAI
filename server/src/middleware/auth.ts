import { Request, Response, NextFunction } from 'express';
import { demoStore } from '../lib/demoStore.js';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role_name: 'super_admin' | 'sales_manager' | 'sales_rep';
  role_id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.slice(7);
  req.token = token;

  const session = demoStore.sessions_auth.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid token' });
  const user = demoStore.users.find((u) => u.id === session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = user;
  next();
}

export function requireRole(...roles: AuthUser['role_name'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role_name)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
