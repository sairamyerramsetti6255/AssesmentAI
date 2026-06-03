-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- MASTER TABLES
-- ============================================

CREATE TABLE m_industry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE m_maturity_stage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name TEXT UNIQUE NOT NULL,
  stage_order INT NOT NULL,
  color_hex TEXT,
  focus_area TEXT,
  description TEXT
);

CREATE TABLE m_driver (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name TEXT UNIQUE NOT NULL,
  driver_key TEXT UNIQUE NOT NULL,
  display_order INT NOT NULL,
  description TEXT,
  icon_name TEXT
);

CREATE TABLE m_question (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES m_driver(id),
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'rating',
  rating_min INT DEFAULT 1,
  rating_max INT DEFAULT 5,
  rating_labels JSONB,
  options JSONB,
  expected_answer_time_seconds INT DEFAULT 60,
  display_order INT,
  is_required BOOLEAN DEFAULT true
);

CREATE TABLE m_solution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_name TEXT NOT NULL,
  solution_key TEXT UNIQUE,
  description TEXT,
  typical_effort TEXT,
  low_cost_options TEXT,
  icon_name TEXT
);

CREATE TABLE m_pain_point_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE m_user_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT UNIQUE NOT NULL,
  permissions JSONB
);

CREATE TABLE m_proposal_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_html TEXT,
  is_default BOOLEAN DEFAULT false
);

CREATE TABLE m_industry_benchmark (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id UUID REFERENCES m_industry(id),
  maturity_stage_id UUID REFERENCES m_maturity_stage(id),
  percentage INT,
  avg_driver_scores JSONB
);

-- ============================================
-- TRANSACTIONAL TABLES
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role_id UUID REFERENCES m_user_role(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry_id UUID REFERENCES m_industry(id),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  domain TEXT,
  website_url TEXT,
  website_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  assigned_rep_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  pre_assessment_notes TEXT,
  pain_point_ids UUID[] DEFAULT '{}',
  industry_benchmark_snapshot JSONB,
  current_step INT DEFAULT 1,
  completed_steps INT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assessment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  extraction_status TEXT DEFAULT 'pending',
  extraction_summary JSONB,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES assessment_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  source_question_id UUID REFERENCES m_question(id),
  driver_id UUID REFERENCES m_driver(id),
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'rating',
  rating_min INT DEFAULT 1,
  rating_max INT DEFAULT 5,
  rating_labels JSONB,
  options JSONB,
  expected_answer_time_seconds INT DEFAULT 60,
  display_order INT,
  is_required BOOLEAN DEFAULT true,
  is_ai_generated BOOLEAN DEFAULT false,
  session_status TEXT DEFAULT 'active',
  skip_reason TEXT,
  original_question_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  rep_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  current_question_index INT DEFAULT 0
);

CREATE TABLE session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES assessment_questions(id),
  audio_path TEXT,
  transcript TEXT,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES assessment_questions(id) ON DELETE CASCADE,
  rating_value INT,
  text_answer TEXT,
  transcript_answer TEXT,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

CREATE TABLE assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE UNIQUE,
  driver_scores JSONB NOT NULL,
  overall_score NUMERIC(5,2),
  maturity_stage_id UUID REFERENCES m_maturity_stage(id),
  benchmark_comparison JSONB,
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gap_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE UNIQUE,
  gaps JSONB NOT NULL,
  recommended_solutions JSONB,
  ai_prompt TEXT,
  ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE poc_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE UNIQUE,
  content JSONB NOT NULL,
  html_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE UNIQUE,
  template_id UUID REFERENCES m_proposal_template(id),
  rendered_html TEXT,
  status TEXT DEFAULT 'draft',
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  assessment_id UUID REFERENCES assessments(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_assigned_rep ON assessments(assigned_rep_id);
CREATE INDEX idx_assessment_documents_assessment ON assessment_documents(assessment_id);
CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Vector similarity search index
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
