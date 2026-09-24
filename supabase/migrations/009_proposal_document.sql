-- Structured PBS scope-of-work proposal document (JSON sections for Word export)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS proposal_document JSONB;
