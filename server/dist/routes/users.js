import { Router } from 'express';
import { demoStore } from '../lib/demoStore.js';
import { logAudit } from '../lib/audit.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { param } from '../lib/params.js';
const router = Router();
router.use(authMiddleware);
router.use(requireRole('super_admin'));
router.get('/', async (_req, res) => {
    res.json(demoStore.users.map(({ id, email, full_name, role_name, is_active }) => ({
        id, email, full_name, role_name, is_active,
    })));
});
router.put('/:id/role', async (req, res) => {
    const id = param(req.params.id);
    const { role_name } = req.body;
    const user = demoStore.users.find((u) => u.id === id);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    user.role_name = role_name;
    await logAudit(req.user.id, 'update_user_role', 'user', id, { role_name });
    res.json(user);
});
router.delete('/:id', async (req, res) => {
    const id = param(req.params.id);
    const idx = demoStore.users.findIndex((u) => u.id === id);
    if (idx === -1)
        return res.status(404).json({ error: 'User not found' });
    demoStore.users.splice(idx, 1);
    await logAudit(req.user.id, 'delete_user', 'user', id);
    res.json({ message: 'User deleted' });
});
export default router;
