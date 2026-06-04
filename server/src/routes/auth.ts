import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore, demoPasswords } from '../lib/demoStore.js';
import { logAudit } from '../lib/audit.js';
import { authMiddleware } from '../middleware/auth.js';
import { persistAuthSessions } from '../lib/sessionStore.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const expected = demoPasswords[email];
  if (!expected || expected !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const user = demoStore.users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = uuidv4();
  demoStore.sessions_auth.set(token, { userId: user.id, email: user.email });
  persistAuthSessions(demoStore.sessions_auth);
  await logAudit(user.id, 'login', 'user', user.id);
  res.json({ token, user });
});

router.post('/register', authMiddleware, async (req: Request, res: Response) => {
  if (req.user?.role_name !== 'super_admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { email, password, full_name, role_name } = req.body;

  const existing = demoStore.users.find((u) => u.email === email);
  if (existing) return res.status(400).json({ error: 'User exists' });
  const roleIdMap: Record<string, string> = {
    super_admin: 'super_admin',
    sales_manager: 'sales_manager',
    sales_rep: 'sales_rep',
  };
  const user = {
    id: uuidv4(),
    email,
    full_name,
    role_name: role_name as 'super_admin' | 'sales_manager' | 'sales_rep',
    role_id: uuidv4(),
    is_active: true,
  };
  void roleIdMap;
  demoStore.users.push(user);
  demoPasswords[email] = password;
  await logAudit(req.user!.id, 'register_user', 'user', user.id, { email });
  res.status(201).json(user);
});

router.post('/magic-link', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  res.json({ message: 'Magic link sent (demo mode - use password login)' });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json(req.user);
});

router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  if (req.token) {
    demoStore.sessions_auth.delete(req.token);
    persistAuthSessions(demoStore.sessions_auth);
  }
  await logAudit(req.user!.id, 'logout', 'user', req.user!.id);
  res.json({ message: 'Logged out' });
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  res.json({ message: 'Password reset email sent (demo mode)' });
});

router.put('/reset-password', authMiddleware, async (req: Request, res: Response) => {
  const { password } = req.body;
  if (req.user) demoPasswords[req.user.email] = password;
  res.json({ message: 'Password updated' });
});

export default router;
