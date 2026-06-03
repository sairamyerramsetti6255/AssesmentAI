const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role_name: 'super_admin' | 'sales_manager' | 'sales_rep';
  role_id: string;
}

class ApiClient {
  private token: string | null = localStorage.getItem('token');

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  getToken() {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      if (res.status === 401) {
        this.setToken(null);
      }
      throw new Error(err.error || 'Request failed');
    }
    if (res.headers.get('content-type')?.includes('text/csv')) {
      return res.text() as unknown as T;
    }
    return res.json();
  }

  login(email: string, password: string) {
    return this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  me() {
    return this.request<User>('/auth/me');
  }

  register(data: { email: string; password: string; full_name: string; role_name: string }) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }

  getUsers() {
    return this.request<User[]>('/users');
  }

  getAssessments(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<Assessment[]>(`/assessments${qs}`);
  }

  getAssessment(id: string) {
    return this.request<Assessment>(`/assessments/${id}`);
  }

  createAssessment(data: CreateAssessmentInput) {
    return this.request<Assessment>('/assessments', { method: 'POST', body: JSON.stringify(data) });
  }

  updateAssessment(id: string, data: Partial<CreateAssessmentInput & { current_step?: number; completed_steps?: number[]; mark_step_complete?: number; status?: string }>) {
    return this.request<Assessment>(`/assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  saveDraftStep(id: string, step: number, data: Record<string, unknown>, advance = false) {
    const payload: Record<string, unknown> = { ...data, mark_step_complete: step };
    if (advance) payload.current_step = Math.min(step + 1, 5);
    return this.request<Assessment>(`/assessments/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  assignAssessment(id: string, rep_id: string) {
    return this.request<Assessment>(`/assessments/${id}/assign`, { method: 'POST', body: JSON.stringify({ rep_id }) });
  }

  getDocuments(assessmentId: string) {
    return this.request<Document[]>(`/assessments/${assessmentId}/documents`);
  }

  uploadDocument(assessmentId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.request<Document>(`/assessments/${assessmentId}/documents`, { method: 'POST', body: form });
  }

  async uploadDocuments(assessmentId: string, files: File[]) {
    for (const file of files) {
      await this.uploadDocument(assessmentId, file);
    }
  }

  getQuestions(assessmentId: string) {
    return this.request<Question[]>(`/assessments/${assessmentId}/questions`);
  }

  generateQuestions(assessmentId: string) {
    return this.request<Question[]>(`/assessments/${assessmentId}/generate-questions`, { method: 'POST' });
  }

  generateResearch(assessmentId: string, clientData?: Record<string, unknown>) {
    return this.request<{ research_notes: string; pain_point_ids: string[]; pre_assessment_notes: string }>(
      `/assessments/${assessmentId}/generate-research`,
      { method: 'POST', body: JSON.stringify(clientData || {}) },
    );
  }

  updateQuestions(assessmentId: string, questions: Array<{ id: string; question_text?: string; display_order?: number; expected_answer?: string | null }>) {
    return this.request<Question[]>(`/assessments/${assessmentId}/questions`, { method: 'PUT', body: JSON.stringify({ questions }) });
  }

  addQuestion(assessmentId: string, data: CreateQuestionInput) {
    return this.request<Question>(`/assessments/${assessmentId}/questions`, { method: 'POST', body: JSON.stringify(data) });
  }

  deleteQuestion(assessmentId: string, questionId: string) {
    return this.request(`/assessments/${assessmentId}/questions/${questionId}`, { method: 'DELETE' });
  }

  generateExpectedAnswer(assessmentId: string, questionId: string) {
    return this.request<{ expected_answer: string }>(
      `/assessments/${assessmentId}/questions/${questionId}/generate-expected-answer`,
      { method: 'POST' },
    );
  }

  startSession(assessment_id: string) {
    return this.request<Session>('/sessions', { method: 'POST', body: JSON.stringify({ assessment_id }) });
  }

  getSession(id: string) {
    return this.request<SessionDetail>(`/sessions/${id}`);
  }

  saveAnswer(sessionId: string, data: { question_id: string; rating_value?: number; text_answer?: string; transcript_answer?: string }) {
    return this.request(`/sessions/${sessionId}/answers`, { method: 'PUT', body: JSON.stringify(data) });
  }

  patchQuestion(sessionId: string, questionId: string, data: { action: string; question_text?: string; skip_reason?: string }) {
    return this.request(`/sessions/${sessionId}/questions/${questionId}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  uploadRecording(sessionId: string, file: Blob, question_id: string, duration_seconds: number) {
    const form = new FormData();
    form.append('audio', file);
    form.append('question_id', question_id);
    form.append('duration_seconds', String(duration_seconds));
    return this.request(`/sessions/${sessionId}/recordings`, { method: 'POST', body: form });
  }

  transcribe(sessionId: string, data: { recording_id?: string; question_id: string; audio_base64?: string; mime_type?: string }) {
    return this.request<{ transcript: string }>(`/sessions/${sessionId}/transcribe`, { method: 'POST', body: JSON.stringify(data) });
  }

  completeSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}/complete`, { method: 'POST' });
  }

  scoreAssessment(assessmentId: string) {
    return this.request<Score>(`/assessments/${assessmentId}/score`, { method: 'POST' });
  }

  getResults(assessmentId: string) {
    return this.request<Results>(`/assessments/${assessmentId}/results`);
  }

  generateGapAnalysis(assessmentId: string) {
    return this.request<GapAnalysis>(`/assessments/${assessmentId}/gap-analysis`, { method: 'POST' });
  }

  getGapAnalysis(assessmentId: string) {
    return this.request<GapAnalysis | null>(`/assessments/${assessmentId}/gap-analysis`);
  }

  generatePoc(assessmentId: string) {
    return this.request<PocPlan>(`/assessments/${assessmentId}/poc-plan`, { method: 'POST' });
  }

  getPoc(assessmentId: string) {
    return this.request<PocPlan | null>(`/assessments/${assessmentId}/poc-plan`);
  }

  generateProposal(assessmentId: string) {
    return this.request<Proposal>(`/assessments/${assessmentId}/proposal`, { method: 'POST' });
  }

  getProposal(assessmentId: string) {
    return this.request<Proposal | null>(`/assessments/${assessmentId}/proposal`);
  }

  finalizeProposal(assessmentId: string, rendered_html: string) {
    return this.request<Proposal>(`/assessments/${assessmentId}/proposal`, { method: 'PUT', body: JSON.stringify({ rendered_html, status: 'finalized' }) });
  }

  getReports(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<ReportOverview>(`/reports/overview${qs}`);
  }

  exportReports() {
    return this.request<string>('/reports/export');
  }

  chat(message: string, assessment_id?: string) {
    return this.request<{ message: { content: string } }>('/chat', { method: 'POST', body: JSON.stringify({ message, assessment_id }) });
  }

  getNotifications() {
    return this.request<Notification[]>('/notifications');
  }

  markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  getMasterData(table: string) {
    return this.request<unknown[]>(`/masters/${table}`);
  }

  createMasterItem(table: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`/admin/masters/${table}`, { method: 'POST', body: JSON.stringify(data) });
  }

  updateMasterItem(table: string, id: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`/admin/masters/${table}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  deleteMasterItem(table: string, id: string) {
    return this.request(`/admin/masters/${table}/${id}`, { method: 'DELETE' });
  }

  getAuditLogs(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<AuditLog[]>(`/admin/audit-logs${qs}`);
  }
}

export interface Assessment {
  id: string;
  client_id: string;
  status: string;
  assigned_rep_id: string | null;
  created_by: string;
  pre_assessment_notes: string | null;
  pain_point_ids: string[];
  industry_benchmark_snapshot: Record<string, unknown> | null;
  current_step?: number;
  completed_steps?: number[];
  created_at: string;
  updated_at: string;
  client?: {
    company_name: string;
    industry_id: string;
    industry_name?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    domain?: string;
    business_domains?: string[];
    website_url?: string;
    website_details?: string;
  };
  assigned_rep?: { id: string; full_name: string; email: string };
}

export interface CreateAssessmentInput {
  company_name: string;
  industry_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  domain?: string;
  business_domains?: string[];
  website_url?: string;
  website_details?: string;
  pre_assessment_notes?: string;
  research_notes?: string;
  pain_point_ids?: string[];
}

export interface CreateQuestionInput {
  question_text: string;
  question_type: 'rating' | 'text' | 'voice' | 'multi_select';
  options?: string[];
  driver_id?: string;
  is_required?: boolean;
  rating_min?: number;
  rating_max?: number;
  expected_answer_time_seconds?: number;
}

export interface Document {
  id: string;
  file_name: string;
  extraction_status: string;
  extraction_summary: Record<string, unknown> | null;
  created_at: string;
}

export interface Question {
  id: string;
  question_text: string;
  question_type: string;
  rating_min: number;
  rating_max: number;
  rating_labels: Record<string, string> | null;
  options: string[] | null;
  driver_id: string;
  display_order: number;
  is_required: boolean;
  is_ai_generated: boolean;
  session_status: string;
  expected_answer_time_seconds: number;
  expected_answer: string | null;
}

export const QUESTION_TYPES = [
  { value: 'rating', label: 'Rating Scale (1–5)' },
  { value: 'text', label: 'Text Box' },
  { value: 'voice', label: 'Voice Recording' },
  { value: 'multi_select', label: 'Multiple Choice' },
] as const;

export interface Session {
  id: string;
  assessment_id: string;
  status: string;
  current_question_index: number;
}

export interface SessionDetail extends Session {
  questions: Question[];
  answers: Array<{ question_id: string; rating_value: number | null; text_answer: string | null; transcript_answer: string | null }>;
  assessment?: {
    id: string;
    company_name: string;
    industry_name: string;
    pre_assessment_notes: string | null;
    business_domains: string[];
    pain_points: string[];
  } | null;
}

export interface QuestionAnalysis {
  question_id: string;
  question_text?: string;
  driver_key?: string;
  driver_name?: string;
  score: number;
  analysis: string;
  strengths?: string[];
  gaps?: string[];
  client_answer_summary: string;
  expected_answer?: string | null;
}

export interface Score {
  driver_scores: Record<string, number>;
  overall_score: number;
  maturity_stage_name?: string;
  benchmark_comparison: Record<string, unknown> | null;
  executive_summary?: string;
  key_findings?: string[];
  recommendations?: string[];
  question_analyses?: QuestionAnalysis[];
}

export interface Results {
  score: Score | null;
  questions: Question[];
  answers: SessionDetail['answers'];
  drivers: Array<{ id: string; driver_name: string; driver_key: string }>;
  maturityStages: Array<{ stage_name: string; color_hex: string }>;
}

export interface GapAnalysis {
  gaps: Array<{ driver: string; gap: string; severity: string }>;
  recommended_solutions: Array<{ solution_name: string; solution_key: string; rationale: string }>;
}

export interface PocPlan {
  content: Record<string, unknown>;
  html_content: string;
}

export interface Proposal {
  rendered_html: string;
  status: string;
}

export interface ReportOverview {
  total_assessments: number;
  by_status: Record<string, number>;
  avg_readiness_score: number;
  maturity_distribution: Record<string, number>;
  by_industry: Record<string, { count: number; avgScore: number }>;
  rep_activity: Array<{ rep_name: string; assigned: number; completed: number }>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_name?: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const api = new ApiClient();
