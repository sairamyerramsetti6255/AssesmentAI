-- Run all pending schema updates (safe to re-run)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS document_records JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS client_document_records JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS proposal_use_cases JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS proposal_architecture JSONB;

-- Ensure login accounts exist
INSERT INTO platform_users (id, name, email, role, password) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Elena Vasquez', 'admin@pbshope.com',   'super_admin',       'admin123'),
  ('00000000-0000-0000-0000-000000000002', 'Marcus Webb',   'manager@pbshope.com', 'team_lead',         'manager123'),
  ('00000000-0000-0000-0000-000000000003', 'Sarah Kim',     'rep@pbshope.com',     'account_executive', 'rep123')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  password = EXCLUDED.password;
