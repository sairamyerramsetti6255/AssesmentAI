import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { demoStore } from '../lib/demoStore.js';
import { openai, isOpenAIConfigured } from '../lib/openai.js';
import { logAudit } from '../lib/audit.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
router.use(authMiddleware);
router.use(requireRole('super_admin', 'sales_manager'));
async function extractText(buffer, mimeType) {
    if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
        const data = await pdfParse(buffer);
        return data.text;
    }
    return buffer.toString('utf-8');
}
async function summarizeDocument(text) {
    if (!isOpenAIConfigured()) {
        return {
            key_themes: ['Digital transformation', 'Data modernization', 'Process automation'],
            pain_points: ['Manual processes', 'Data silos'],
            tech_stack_hints: ['Cloud infrastructure', 'Legacy ERP'],
            ai_maturity_signals: ['Exploring AI use cases', 'Limited ML infrastructure'],
            summary: text.slice(0, 500) || 'Document processed successfully (demo mode).',
        };
    }
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
                role: 'user',
                content: `Analyze this document for AI readiness assessment. Return JSON with: key_themes (array), pain_points (array), tech_stack_hints (array), ai_maturity_signals (array), summary (string).\n\n${text.slice(0, 8000)}`,
            }],
        response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0]?.message?.content || '{}');
}
function chunkText(text, chunkSize = 1000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}
router.post('/', upload.single('file'), async (req, res) => {
    const assessmentId = req.params.id;
    if (!req.file)
        return res.status(400).json({ error: 'File required' });
    const text = await extractText(req.file.buffer, req.file.mimetype);
    const summary = await summarizeDocument(text);
    const chunks = chunkText(text);
    const doc = {
        id: uuidv4(),
        assessment_id: assessmentId,
        file_name: req.file.originalname,
        file_path: `/uploads/${uuidv4()}/${req.file.originalname}`,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        extraction_status: 'completed',
        extraction_summary: summary,
        uploaded_by: req.user.id,
        created_at: new Date().toISOString(),
    };
    demoStore.documents.push(doc);
    chunks.forEach((content, i) => {
        demoStore.chunks.push({ id: uuidv4(), document_id: doc.id, chunk_index: i, content });
    });
    await logAudit(req.user.id, 'upload_document', 'document', doc.id);
    res.status(201).json(doc);
});
router.get('/', async (req, res) => {
    const assessmentId = req.params.id;
    res.json(demoStore.documents.filter((d) => d.assessment_id === assessmentId));
});
router.get('/:docId/extraction', async (req, res) => {
    const doc = demoStore.documents.find((d) => d.id === req.params.docId);
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    res.json({ status: doc.extraction_status, summary: doc.extraction_summary });
});
export default router;
