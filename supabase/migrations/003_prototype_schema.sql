-- ============================================================
-- Prototype schema — leads, platform_users, activity_log,
-- prototype_questions, prototype_answers, mandatory_questions,
-- master_data
-- ============================================================

-- Platform users (internal sales team — separate from Supabase auth users)
CREATE TABLE IF NOT EXISTS platform_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'account_executive', -- super_admin | team_lead | account_executive
  password    TEXT,                                       -- demo hash, swap for proper auth in prod
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (prospects / opportunities)
CREATE TABLE IF NOT EXISTS leads (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name           TEXT NOT NULL,
  industry               TEXT NOT NULL,
  domain                 TEXT NOT NULL,
  country                TEXT NOT NULL DEFAULT '',
  assigned_executive     TEXT NOT NULL DEFAULT '',
  funnel_status          TEXT NOT NULL DEFAULT 'intake',
  -- intake | research | review | client_portal | analysis | proposal | converted | lost
  assessment_status      TEXT NOT NULL DEFAULT 'draft',  -- draft | approved
  portal_token           TEXT UNIQUE,
  research_progress      INT  NOT NULL DEFAULT 0,
  client_progress        INT,
  documents              TEXT[] DEFAULT '{}',
  remarks                TEXT[] DEFAULT '{}',
  client_answers         JSONB,
  client_richtext        JSONB,
  client_other_text      JSONB,
  client_uploaded_docs   TEXT[] DEFAULT '{}',
  ai_research            JSONB,
  assessment_taxonomy    JSONB,
  last_interaction       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Prototype assessment questions (per-lead set)
CREATE TABLE IF NOT EXISTS prototype_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID REFERENCES leads(id) ON DELETE CASCADE,
  sort_order       INT  NOT NULL DEFAULT 0,
  taxonomy_pillar  TEXT NOT NULL DEFAULT 'Technical Pain Points',
  domain_context   TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT 'Technology Stack',
  text             TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'singlechoice',
  -- singlechoice | multichoice | scale | text
  options          TEXT[] DEFAULT '{}',
  suggested_options TEXT[] DEFAULT '{}',
  is_mandatory     BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Mandatory questions (always included in every assessment)
CREATE TABLE IF NOT EXISTS mandatory_questions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'singlechoice',
  options    TEXT[] DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         TEXT NOT NULL,
  actor_name   TEXT NOT NULL,
  actor_role   TEXT NOT NULL,
  summary      TEXT NOT NULL,
  lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  company_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Master data (flat key→value list)
CREATE TABLE IF NOT EXISTS master_data (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,  -- industries | drivers | solutions | painPoints | maturityStages
  name     TEXT NOT NULL,
  UNIQUE(category, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_funnel     ON leads(funnel_status);
CREATE INDEX IF NOT EXISTS idx_leads_executive  ON leads(assigned_executive);
CREATE INDEX IF NOT EXISTS idx_proto_qs_lead    ON prototype_questions(lead_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_activity_lead    ON activity_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_at      ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_master_cat       ON master_data(category);

-- ============================================================
-- Seed platform users (demo)
-- ============================================================
INSERT INTO platform_users (id, name, email, role, password) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Elena Vasquez', 'admin@pbshope.com',    'super_admin',         'admin123'),
  ('00000000-0000-0000-0000-000000000002', 'Marcus Webb',   'manager@pbshope.com',  'team_lead',           'manager123'),
  ('00000000-0000-0000-0000-000000000003', 'Sarah Kim',     'rep@pbshope.com',      'account_executive',   'rep123')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Seed master data
-- ============================================================
INSERT INTO master_data (category, name) VALUES
  ('industries', 'Financial Services'),
  ('industries', 'Healthcare'),
  ('industries', 'Retail'),
  ('industries', 'Manufacturing'),
  ('industries', 'Technology'),
  ('industries', 'Energy'),
  ('industries', 'Government'),
  ('industries', 'Supply Chain & Logistics'),
  ('industries', 'Education'),
  ('drivers', 'Business Strategy'),
  ('drivers', 'Technology & Data'),
  ('drivers', 'AI Strategy'),
  ('drivers', 'Organization & Culture'),
  ('drivers', 'Infrastructure'),
  ('solutions', 'Computer Vision'),
  ('solutions', 'NLP'),
  ('solutions', 'Predictive Analytics'),
  ('solutions', 'GenAI'),
  ('solutions', 'Recommendation Engine'),
  ('painPoints', 'Manual Processes'),
  ('painPoints', 'Data Silos'),
  ('painPoints', 'Customer Experience'),
  ('painPoints', 'Operational Efficiency'),
  ('painPoints', 'Compliance & Risk'),
  ('painPoints', 'Talent Shortage'),
  ('painPoints', 'Legacy Systems'),
  ('maturityStages', 'Exploring'),
  ('maturityStages', 'Planning'),
  ('maturityStages', 'Implementing'),
  ('maturityStages', 'Scaling'),
  ('maturityStages', 'Realizing')
ON CONFLICT (category, name) DO NOTHING;

-- ============================================================
-- Seed mandatory questions
-- ============================================================
INSERT INTO mandatory_questions (text, type, options, sort_order) VALUES
  ('What is your primary AI/automation priority for the next 12 months?',
   'singlechoice',
   ARRAY['Cost reduction', 'Revenue growth', 'Customer experience', 'Compliance', 'Competitive advantage'],
   0),
  ('Which best describes your current data infrastructure maturity?',
   'singlechoice',
   ARRAY['Fragmented / siloed', 'Centralised but limited', 'Integrated data platform', 'Real-time data mesh', 'AI-native'],
   1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed demo leads
-- ============================================================
INSERT INTO leads (id, company_name, industry, domain, country, assigned_executive, funnel_status, assessment_status, research_progress, last_interaction)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Acme Financial Corp',    'Financial Services',      'acmefinancial.com',  'USA',         'Marcus Webb', 'review',         'draft',    100, CURRENT_DATE),
  ('10000000-0000-0000-0000-000000000002', 'Pacific Retail Group',   'Retail',                  'pacificretail.com',  'Australia',   'Sarah Kim',   'client_portal',  'approved', 100, CURRENT_DATE),
  ('10000000-0000-0000-0000-000000000003', 'Nova Health Systems',    'Healthcare',              'novahealth.com',     'Canada',      'Marcus Webb', 'intake',         'draft',    0,   CURRENT_DATE),
  ('10000000-0000-0000-0000-000000000004', 'Pilot Logistics Ltd',    'Supply Chain & Logistics','pilotlogistics.com', 'UK',          'Sarah Kim',   'research',       'draft',    45,  CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;
