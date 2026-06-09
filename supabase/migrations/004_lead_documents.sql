-- Lead document metadata (name, match status, transaction date, storage path)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS document_records JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS client_document_records JSONB DEFAULT '[]';
