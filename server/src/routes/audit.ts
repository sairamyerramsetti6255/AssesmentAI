import { Router, Request, Response } from 'express';
import { demoStore } from '../lib/demoStore.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('super_admin'));

router.get('/', async (req: Request, res: Response) => {
  const { user_id, action, entity_type } = req.query;

  let logs = [...demoStore.auditLogs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (user_id) logs = logs.filter((l) => l.user_id === user_id);
  if (action) logs = logs.filter((l) => l.action.includes(action as string));
  if (entity_type) logs = logs.filter((l) => l.entity_type === entity_type);

  const enriched = logs.map((l) => ({
    ...l,
    user_name: demoStore.users.find((u) => u.id === l.user_id)?.full_name || 'System',
  }));
  res.json(enriched);
});

export default router;
