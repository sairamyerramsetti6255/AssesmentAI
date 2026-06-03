import { Router, Request, Response } from 'express';
import { demoStore } from '../lib/demoStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { param } from '../lib/params.js';

const router = Router();
router.use(authMiddleware);

const demoMap: Record<string, keyof typeof demoStore.masters> = {
  industries: 'industries',
  drivers: 'drivers',
  'maturity-stages': 'maturityStages',
  questions: 'questions',
  solutions: 'solutions',
  'pain-points': 'painPoints',
};

router.get('/:table', async (req: Request, res: Response) => {
  const table = param(req.params.table);
  const demoKey = demoMap[table];
  if (!demoKey) return res.status(400).json({ error: 'Invalid table' });

  res.json(demoStore.masters[demoKey]);
});

export default router;
