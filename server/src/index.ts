import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GEMINI_MODEL, isGeminiConfigured } from './lib/gemini.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import assessmentRoutes from './routes/assessments.js';
import documentRoutes from './routes/documents.js';
import questionRoutes from './routes/questions.js';
import sessionRoutes from './routes/sessions.js';
import scoringRoutes from './routes/scoring.js';
import gapAnalysisRoutes from './routes/gapAnalysis.js';
import pocRoutes from './routes/poc.js';
import proposalRoutes from './routes/proposals.js';
import reportRoutes from './routes/reports.js';
import chatRoutes from './routes/chat.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import auditRoutes from './routes/audit.js';
import mastersRoutes from './routes/masters.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: 'memory',
    gemini: isGeminiConfigured(),
    gemini_model: isGeminiConfigured() ? GEMINI_MODEL : null,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/masters', mastersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/assessments/:id/documents', documentRoutes);
app.use('/api/assessments/:id', questionRoutes);
app.use('/api/assessments/:id', scoringRoutes);
app.use('/api/assessments/:id/gap-analysis', gapAnalysisRoutes);
app.use('/api/assessments/:id/poc-plan', pocRoutes);
app.use('/api/assessments/:id/proposal', proposalRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/audit-logs', auditRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Pbshope AI Readiness API running on http://localhost:${PORT}`);
  console.log('Mode: Demo (in-memory)');
});
