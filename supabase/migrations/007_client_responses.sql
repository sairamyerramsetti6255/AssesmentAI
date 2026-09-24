-- Client assessment timestamps on leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_assessment_started_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_assessment_submitted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_assessment_updated_at TIMESTAMPTZ;

-- Structured per-question client responses (readable in Pipeline)
CREATE TABLE IF NOT EXISTS prototype_client_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  question_id     UUID,
  question_text   TEXT NOT NULL,
  taxonomy_pillar TEXT DEFAULT '',
  response_type   TEXT DEFAULT 'text',
  answer_display  TEXT NOT NULL DEFAULT '',
  answer_json     JSONB,
  sort_order      INT NOT NULL DEFAULT 0,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_client_responses_lead ON prototype_client_responses(lead_id, sort_order);

-- Extended proposal fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS proposal_summary TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS proposal_next_steps TEXT[] DEFAULT '{}';
