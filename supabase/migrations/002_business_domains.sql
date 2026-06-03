-- Wizard / client fields (safe to re-run on existing Supabase projects)

ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_domains TEXT[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website_details TEXT;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS current_step INT DEFAULT 1;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS completed_steps INT[] DEFAULT '{}';

ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS rating_min INT DEFAULT 1;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS rating_max INT DEFAULT 5;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS rating_labels JSONB;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS expected_answer_time_seconds INT DEFAULT 60;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS display_order INT;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'active';
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS skip_reason TEXT;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS original_question_text TEXT;
