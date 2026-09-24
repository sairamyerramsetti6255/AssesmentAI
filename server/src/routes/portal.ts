import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../lib/demoStore.js';
import { param } from '../lib/params.js';
import { notifyAssessmentReceived } from '../lib/zeptomail.js';

const router = Router();
const emailedAssessments = new Set<string>();

async function maybeEmailClient(assessmentId: string, complete: boolean) {
  if (!complete || emailedAssessments.has(assessmentId)) return { emailSent: false };
  const assessment = demoStore.assessments.find((item) => item.id === assessmentId);
  const client = demoStore.clients.find((item) => item.id === assessment?.client_id);
  if (!client?.contact_email) {
    return { emailSent: false, emailError: 'This assessment has no client email' };
  }
  const result = await notifyAssessmentReceived({
    toEmail: client.contact_email,
    toName: client.contact_name || 'there',
    companyName: client.company_name,
  });
  if (result.emailSent) emailedAssessments.add(assessmentId);
  return result;
}

/** Public client portal — no auth; token issued when manager approves assessment. */
router.get('/:token', (req: Request, res: Response) => {
  const token = param(req.params.token);
  const assessment = demoStore.assessments.find((a) => a.portal_token === token);
  if (!assessment) return res.status(404).json({ error: 'Invalid or expired link' });

  const client = demoStore.clients.find((c) => c.id === assessment.client_id);
  const industry = demoStore.masters.industries.find((i) => i.id === client?.industry_id);
  const questions = demoStore.questions
    .filter((q) => q.assessment_id === assessment.id && q.session_status !== 'deleted')
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .map(({ expected_answer: _e, ...q }) => q);

  res.json({
    company_name: client?.company_name,
    industry_name: industry?.name,
    country_of_operation: client?.country_of_operation,
    questions,
  });
});

router.post('/:token/answers', async (req: Request, res: Response) => {
  const token = param(req.params.token);
  const assessment = demoStore.assessments.find((a) => a.portal_token === token);
  if (!assessment) return res.status(404).json({ error: 'Invalid or expired link' });

  const { question_id, rating_value, text_answer, transcript_answer, complete } = req.body;
  if (!question_id) return res.status(400).json({ error: 'question_id required' });

  const existing = demoStore.clientPortalSubmissions.find(
    (s) => s.assessment_id === assessment.id && s.question_id === question_id,
  );
  if (existing) {
    if (rating_value !== undefined) existing.rating_value = rating_value;
    if (text_answer !== undefined) existing.text_answer = text_answer;
    if (transcript_answer !== undefined) existing.transcript_answer = transcript_answer;
    existing.submitted_at = new Date().toISOString();
    const email = await maybeEmailClient(assessment.id, complete === true);
    return res.json({ ...existing, ...email });
  }

  const row = {
    id: uuidv4(),
    assessment_id: assessment.id,
    question_id,
    rating_value: rating_value ?? null,
    text_answer: text_answer ?? null,
    transcript_answer: transcript_answer ?? null,
    submitted_at: new Date().toISOString(),
  };
  demoStore.clientPortalSubmissions.push(row);
  const email = await maybeEmailClient(assessment.id, complete === true);
  res.status(201).json({ ...row, ...email });
});

export default router;
