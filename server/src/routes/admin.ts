import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../lib/demoStore.js';
import { logAudit } from '../lib/audit.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { param } from '../lib/params.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('super_admin'));

const masterTables: Record<string, keyof typeof demoStore.masters> = {
  industries: 'industries',
  drivers: 'drivers',
  'maturity-stages': 'maturityStages',
  questions: 'questions',
  solutions: 'solutions',
  'pain-points': 'painPoints',
  'proposal-templates': 'proposalTemplates',
  benchmarks: 'benchmarks',
};

router.get('/masters/:table', async (req: Request, res: Response) => {
  const table = param(req.params.table);
  const key = masterTables[table];
  if (!key) return res.status(400).json({ error: 'Invalid table' });

  res.json(demoStore.masters[key]);
});

router.post('/masters/:table', async (req: Request, res: Response) => {
  const table = param(req.params.table);
  const key = masterTables[table];
  if (!key) return res.status(400).json({ error: 'Invalid table' });

  const item = { id: uuidv4(), ...req.body };
  (demoStore.masters[key] as unknown[]).push(item);
  await logAudit(req.user!.id, 'create_master', table, item.id);
  res.status(201).json(item);
});

router.put('/masters/:table/:id', async (req: Request, res: Response) => {
  const table = param(req.params.table);
  const id = param(req.params.id);
  const key = masterTables[table];
  if (!key) return res.status(400).json({ error: 'Invalid table' });

  const items = demoStore.masters[key] as Array<{ id: string }>;
  const item = items.find((i) => i.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  Object.assign(item, req.body);
  await logAudit(req.user!.id, 'update_master', table, id);
  res.json(item);
});

router.delete('/masters/:table/:id', async (req: Request, res: Response) => {
  const table = param(req.params.table);
  const id = param(req.params.id);
  const key = masterTables[table];
  if (!key) return res.status(400).json({ error: 'Invalid table' });

  const items = demoStore.masters[key] as Array<{ id: string }>;
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items.splice(idx, 1);
  await logAudit(req.user!.id, 'delete_master', table, id);
  res.json({ message: 'Deleted' });
});

export default router;
