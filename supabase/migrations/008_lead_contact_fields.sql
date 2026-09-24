-- Lead contact & qualification fields (intake form)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS available_time TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS intake_remarks TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'inbound';
