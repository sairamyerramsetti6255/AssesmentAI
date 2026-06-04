import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GEMINI_MODEL, isGeminiConfigured } from './lib/gemini.js';
import { getAllowedOrigins, isOriginAllowed } from './lib/corsConfig.js';
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
import portalRoutes from './routes/portal.js';
import prototypeAiRoutes from './routes/prototypeAi.js';
import { demoStore } from './lib/demoStore.js';
import { getOpenRouterConfigFromEnv } from './lib/openrouter/openrouterClient.js';
import { loadAuthSessions } from './lib/sessionStore.js';

dotenv.config();

demoStore.sessions_auth = loadAuthSessions();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, origin ?? true);
      } else {
        console.warn(`CORS blocked origin: ${origin ?? '(none)'}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  }),
);

/** Explicit preflight for browsers that hit API before route handlers */
app.options('*', cors({
  origin(origin, callback) {
    callback(null, isOriginAllowed(origin, allowedOrigins) ? (origin ?? true) : false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  const or = getOpenRouterConfigFromEnv();
  res.json({
    status: 'ok',
    mode: 'memory',
    gemini: isGeminiConfigured(),
    gemini_model: isGeminiConfigured() ? GEMINI_MODEL : null,
    openrouter: Boolean(or),
    openrouter_model: or?.model ?? null,
    cors_origins: allowedOrigins,
    timestamp: new Date().toISOString(),
  });
});

/** Prototype UI — OpenRouter AI routes only (same-origin /api/*). */
app.use('/api', prototypeAiRoutes);

app.use('/api/masters', mastersRoutes);
app.use('/api/portal', portalRoutes);
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

const publicDir = path.join(__dirname, '../public');
const indexHtml = path.join(publicDir, 'index.html');
if (process.env.SERVE_CLIENT !== 'false' && fs.existsSync(indexHtml)) {
  app.use(express.static(publicDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(indexHtml);
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Assessment ai API on http://0.0.0.0:${PORT}`);
  console.log(`CORS: ${allowedOrigins.join(', ')} + *.pbshope.in, *.graylogic.cloud`);
  if (fs.existsSync(indexHtml)) console.log('Serving frontend from /public (same-origin, no CORS)');
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or set PORT in .env.`);
    console.error(`Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F`);
    process.exit(1);
  }
  throw err;
});
