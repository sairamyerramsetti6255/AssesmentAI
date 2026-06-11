import { Router } from 'express';
import { demoStore } from '../lib/demoStore.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
router.use(authMiddleware);
router.get('/', async (req, res) => {
    const notifications = demoStore.notifications
        .filter((n) => n.user_id === req.user.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(notifications);
});
router.put('/:id/read', async (req, res) => {
    const notification = demoStore.notifications.find((n) => n.id === req.params.id && n.user_id === req.user.id);
    if (!notification)
        return res.status(404).json({ error: 'Not found' });
    notification.is_read = true;
    res.json(notification);
});
router.put('/read-all', async (req, res) => {
    demoStore.notifications.filter((n) => n.user_id === req.user.id).forEach((n) => { n.is_read = true; });
    res.json({ message: 'All marked as read' });
});
export default router;
