-- Proposal content persisted per lead (from AI or manual edits)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS proposal_use_cases JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS proposal_architecture JSONB;
