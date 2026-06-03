import { v4 as uuidv4 } from 'uuid';
import { demoStore } from './demoStore.js';

export async function logAudit(
  userId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
  _ipAddress?: string
) {
  try {
    demoStore.auditLogs.push({
      id: uuidv4(),
      user_id: userId,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type = 'info',
  link?: string
) {
  try {
    demoStore.notifications.push({
      id: uuidv4(),
      user_id: userId,
      title,
      message,
      type,
      link: link || null,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Notification failed:', err);
  }
}
