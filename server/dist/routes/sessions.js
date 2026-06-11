import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../lib/demoStore.js';
import { openai, isOpenAIConfigured } from '../lib/openai.js';
import { getAssessmentContext, transcribeSessionAudio } from '../lib/assessmentAi.js';
import { logAudit, createNotification } from '../lib/audit.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { param } from '../lib/params.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(authMiddleware);
router.post('/', requireRole('sales_rep'), async (req, res) => {
    const { assessment_id } = req.body;
    const assessment = demoStore.assessments.find((a) => a.id === assessment_id);
    if (!assessment)
        return res.status(404).json({ error: 'Assessment not found' });
    if (req.user.role_name === 'sales_rep' && assessment.assigned_rep_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const session = {
        id: uuidv4(),
        assessment_id,
        rep_id: req.user.id,
        status: 'active',
        started_at: new Date().toISOString(),
        ended_at: null,
        current_question_index: 0,
    };
    demoStore.sessions.push(session);
    assessment.status = 'in_session';
    assessment.updated_at = new Date().toISOString();
    await logAudit(req.user.id, 'start_session', 'session', session.id);
    res.status(201).json(session);
});
router.get('/:id', async (req, res) => {
    const sessionId = param(req.params.id);
    const session = demoStore.sessions.find((s) => s.id === sessionId);
    if (!session)
        return res.status(404).json({ error: 'Not found' });
    const questions = demoStore.questions
        .filter((q) => q.assessment_id === session.assessment_id && q.session_status !== 'deleted')
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((q) => {
        const { expected_answer: _bench, ...rest } = q;
        return rest;
    });
    const answers = demoStore.answers.filter((a) => a.session_id === session.id);
    const ctx = getAssessmentContext(session.assessment_id);
    res.json({
        ...session,
        questions,
        answers,
        assessment: ctx
            ? {
                id: ctx.assessment.id,
                company_name: ctx.client.company_name,
                industry_name: ctx.industryName,
                pre_assessment_notes: ctx.assessment.pre_assessment_notes,
                business_domains: ctx.businessDomains,
                pain_points: ctx.painPointNames,
            }
            : null,
    });
});
router.put('/:id/answers', requireRole('super_admin', 'sales_rep'), async (req, res) => {
    const { question_id, rating_value, text_answer, transcript_answer } = req.body;
    const sessionId = param(req.params.id);
    const existing = demoStore.answers.find((a) => a.session_id === sessionId && a.question_id === question_id);
    if (existing) {
        if (rating_value !== undefined)
            existing.rating_value = rating_value;
        if (text_answer !== undefined)
            existing.text_answer = text_answer;
        if (transcript_answer !== undefined)
            existing.transcript_answer = transcript_answer;
        existing.answered_at = new Date().toISOString();
        return res.json(existing);
    }
    const answer = {
        id: uuidv4(),
        session_id: sessionId,
        question_id,
        rating_value: rating_value ?? null,
        text_answer: text_answer ?? null,
        transcript_answer: transcript_answer ?? null,
        answered_at: new Date().toISOString(),
    };
    demoStore.answers.push(answer);
    res.json(answer);
});
router.patch('/:id/questions/:qid', requireRole('super_admin', 'sales_rep'), async (req, res) => {
    const { action, question_text, skip_reason } = req.body;
    const sessionId = param(req.params.id);
    const questionId = param(req.params.qid);
    const session = demoStore.sessions.find((s) => s.id === sessionId);
    if (!session)
        return res.status(404).json({ error: 'Session not found' });
    const question = demoStore.questions.find((q) => q.id === questionId);
    if (!question)
        return res.status(404).json({ error: 'Question not found' });
    if (action === 'modify' && question_text) {
        if (!question.original_question_text)
            question.original_question_text = question.question_text;
        question.question_text = question_text;
    }
    else if (action === 'skip') {
        question.session_status = 'skipped';
        question.skip_reason = skip_reason || 'Skipped by rep';
    }
    else if (action === 'delete') {
        if (question.is_required)
            return res.status(400).json({ error: 'Cannot delete required question' });
        question.session_status = 'deleted';
    }
    await logAudit(req.user.id, `question_${action}`, 'question', questionId, { session_id: sessionId });
    res.json(question);
});
router.post('/:id/recordings', requireRole('super_admin', 'sales_rep'), upload.single('audio'), async (req, res) => {
    const { question_id, duration_seconds } = req.body;
    const sessionId = param(req.params.id);
    const recording = {
        id: uuidv4(),
        session_id: sessionId,
        question_id: question_id || null,
        audio_path: req.file ? `/audio/${uuidv4()}.webm` : null,
        transcript: null,
        duration_seconds: duration_seconds ? parseInt(duration_seconds) : null,
    };
    demoStore.recordings.push(recording);
    res.status(201).json(recording);
});
router.post('/:id/transcribe', requireRole('super_admin', 'sales_rep'), async (req, res) => {
    const sessionId = param(req.params.id);
    const { recording_id, question_id, audio_base64, mime_type } = req.body;
    const session = demoStore.sessions.find((s) => s.id === sessionId);
    if (!session)
        return res.status(404).json({ error: 'Session not found' });
    const question = question_id
        ? demoStore.questions.find((q) => q.id === question_id)
        : null;
    const ctx = getAssessmentContext(session.assessment_id);
    const companyName = ctx?.client.company_name || 'Client';
    const questionText = question?.question_text || 'Assessment question';
    let transcript = '';
    if (isOpenAIConfigured() && audio_base64) {
        try {
            const buffer = Buffer.from(audio_base64, 'base64');
            const file = new File([buffer], 'audio.webm', { type: mime_type || 'audio/webm' });
            const result = await openai.audio.transcriptions.create({ model: 'whisper-1', file });
            transcript = result.text;
        }
        catch { /* try Gemini */ }
    }
    if (!transcript && audio_base64) {
        transcript = await transcribeSessionAudio(audio_base64, mime_type || 'audio/webm', questionText, companyName);
    }
    if (!transcript) {
        transcript = `No audio received. Enter the client's response manually or record again.`;
    }
    const recording = demoStore.recordings.find((r) => r.id === recording_id);
    if (recording)
        recording.transcript = transcript;
    if (question_id) {
        let answer = demoStore.answers.find((a) => a.session_id === sessionId && a.question_id === question_id);
        if (answer) {
            answer.transcript_answer = transcript;
        }
        else {
            demoStore.answers.push({
                id: uuidv4(),
                session_id: sessionId,
                question_id,
                rating_value: null,
                text_answer: null,
                transcript_answer: transcript,
                answered_at: new Date().toISOString(),
            });
        }
    }
    res.json({ transcript });
});
router.post('/:id/complete', requireRole('super_admin', 'sales_rep'), async (req, res) => {
    const sessionId = param(req.params.id);
    const session = demoStore.sessions.find((s) => s.id === sessionId);
    if (!session)
        return res.status(404).json({ error: 'Not found' });
    session.status = 'completed';
    session.ended_at = new Date().toISOString();
    const assessment = demoStore.assessments.find((a) => a.id === session.assessment_id);
    if (assessment) {
        assessment.status = 'scored';
        const managers = demoStore.users.filter((u) => u.role_name === 'sales_manager' || u.role_name === 'super_admin');
        for (const m of managers) {
            await createNotification(m.id, 'Session Completed', 'A live assessment session has been completed', 'success', `/assessments/${assessment.id}/results`);
        }
    }
    await logAudit(req.user.id, 'complete_session', 'session', session.id);
    res.json(session);
});
export default router;
