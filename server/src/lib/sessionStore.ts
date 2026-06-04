import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../../data/auth-sessions.json');

export type AuthSession = { userId: string; email: string };

function ensureDataDir() {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadAuthSessions(): Map<string, AuthSession> {
  try {
    if (!fs.existsSync(SESSION_FILE)) return new Map();
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as Record<string, AuthSession>;
    return new Map(Object.entries(raw));
  } catch {
    return new Map();
  }
}

export function persistAuthSessions(sessions: Map<string, AuthSession>) {
  try {
    ensureDataDir();
    const obj = Object.fromEntries(sessions.entries());
    fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist auth sessions:', err);
  }
}
