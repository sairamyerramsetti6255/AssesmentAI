import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data/proto-documents');
export function saveLeadDocumentFile(leadId, docId, originalName, buffer) {
    const dir = path.join(ROOT, leadId);
    fs.mkdirSync(dir, { recursive: true });
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const rel = path.join(leadId, `${docId}-${safe}`);
    const abs = path.join(ROOT, rel);
    fs.writeFileSync(abs, buffer);
    return rel;
}
export function readLeadDocumentFile(storagePath) {
    const abs = path.join(ROOT, storagePath);
    if (!fs.existsSync(abs))
        return null;
    return fs.readFileSync(abs);
}
export function demoDocumentContent(name, transactionDate) {
    const body = [
        'AI Readiness Assessment — demo document export',
        `Filename: ${name}`,
        `Transaction date: ${transactionDate}`,
        '',
        'This placeholder is served when the original upload is not on disk (seed/demo data).',
    ].join('\n');
    return Buffer.from(body, 'utf-8');
}
