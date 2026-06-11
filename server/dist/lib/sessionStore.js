import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../../data/auth-sessions.json');
function ensureDataDir() {
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
export function loadAuthSessions() {
    try {
        if (!fs.existsSync(SESSION_FILE))
            return new Map();
        const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        return new Map(Object.entries(raw));
    }
    catch {
        return new Map();
    }
}
export function persistAuthSessions(sessions) {
    try {
        ensureDataDir();
        const obj = Object.fromEntries(sessions.entries());
        fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2), 'utf8');
    }
    catch (err) {
        console.warn('Could not persist auth sessions:', err);
    }
}
