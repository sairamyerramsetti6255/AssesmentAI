#  Pbshope.com AI Readiness Platform - Complete Build Specification

## Project Overview

Build a full-stack web application for Pbshope.com' sales team to assess client AI readiness, capture voice answers, generate proposals, and manage leads.

### Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL + pgvector + Storage + Auth + Edge Functions)
- **AI/ML**: OpenAI API (GPT-4o for text, Whisper for speech-to-text)
- **Voice Recording**: MediaRecorder API + Web Audio API

### Target Users
1. **Super Admin** - Full system control
2. **Sales Manager** - Pre-assessment research, assign reps, create proposals
3. **Sales Rep** - Study pre-assessments, conduct live meetings with voice recording

---

## Database Schema (Supabase)

### MASTER TABLES

```sql
-- 1. Industries
CREATE TABLE m_industry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Maturity Stages
CREATE TABLE m_maturity_stage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name TEXT UNIQUE NOT NULL, -- 'Exploring', 'Planning', 'Implementing', 'Scaling', 'Realizing'
  stage_order INT NOT NULL,
  color_hex TEXT,
  focus_area TEXT,
  description TEXT
);

-- 3. AI Readiness Drivers (5 areas)
CREATE TABLE m_driver (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name TEXT UNIQUE NOT NULL,
  driver_key TEXT UNIQUE NOT NULL, -- 'business_strategy', 'technology_data', 'ai_strategy', 'org_culture', 'infrastructure'
  display_order INT NOT NULL,
  description TEXT,
  icon_name TEXT
);

-- 4. Assessment Questions
CREATE TABLE m_question (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES m_driver(id),
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'rating', -- 'rating', 'text', 'multi_select'
  rating_min INT DEFAULT 1,
  rating_max INT DEFAULT 5,
  rating_labels JSONB, -- {"1": "Not at all", "5": "Fully"}
  expected_answer_time_seconds INT DEFAULT 60,
  display_order INT,
  is_required BOOLEAN DEFAULT true
);

-- 5. pbshope.com Solutions
CREATE TABLE m_solution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_name TEXT NOT NULL, -- 'Computer Vision', 'NLP', 'Predictive Analytics', 'GenAI', 'Recommendation Engine'
  solution_key TEXT UNIQUE,
  description TEXT,
  typical_effort TEXT, -- 'Low', 'Medium', 'High'
  low_cost_options TEXT,
  icon_name TEXT
);

-- 6. Pain Point Categories
CREATE TABLE m_pain_point_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- 7. User Roles
CREATE TABLE m_user_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT UNIQUE NOT NULL, -- 'super_admin', 'sales_manager', 'sales_rep'
  permissions JSONB
);

-- 8. Proposal Templates
CREATE TABLE m_proposal_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_html TEXT, -- HTML with placeholders {{company_name}}, {{readiness_score}}, etc.
  is_default BOOLEAN DEFAULT false
);

-- 9. Industry Benchmarks
CREATE TABLE m_industry_benchmark (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id UUID REFERENCES m_industry(id),
  maturity_stage_id UUID REFERENCES m_maturity_stage(id),
  percentage INT, -- e.g., 40% of Financial Services are in Implementing stage
  avg_driver_scores JSONB
);