-- Test users, clients, and assessments for Pbshope AI Readiness Platform
-- Run AFTER 001_initial_schema.sql, 002_business_domains.sql, and seed.sql
-- Passwords for all test accounts: admin123 / manager123 / rep123

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure wizard columns exist (handles partial / older schemas)
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

-- Fixed UUIDs for reproducible test data
-- admin@pbshope.com   / admin123
-- manager@pbshope.com / manager123
-- rep@pbshope.com     / rep123

DO $$
DECLARE
  v_admin_id   UUID := 'a0000001-0001-4001-8001-000000000001';
  v_manager_id UUID := 'a0000001-0001-4001-8001-000000000002';
  v_rep_id     UUID := 'a0000001-0001-4001-8001-000000000003';
  v_role_admin UUID;
  v_role_manager UUID;
  v_role_rep UUID;
  v_ind_financial UUID;
  v_ind_healthcare UUID;
  v_ind_technology UUID;
  v_pp_manual UUID;
  v_pp_data UUID;
  v_pp_legacy UUID;
  v_client_acme UUID := 'b0000001-0001-4001-8001-000000000001';
  v_client_nova UUID := 'b0000001-0001-4001-8001-000000000002';
  v_client_pilot UUID := 'b0000001-0001-4001-8001-000000000003';
  v_client_draft UUID := 'b0000001-0001-4001-8001-000000000004';
BEGIN
  SELECT id INTO v_role_admin FROM m_user_role WHERE role_name = 'super_admin';
  SELECT id INTO v_role_manager FROM m_user_role WHERE role_name = 'sales_manager';
  SELECT id INTO v_role_rep FROM m_user_role WHERE role_name = 'sales_rep';
  SELECT id INTO v_ind_financial FROM m_industry WHERE name = 'Financial Services';
  SELECT id INTO v_ind_healthcare FROM m_industry WHERE name = 'Healthcare';
  SELECT id INTO v_ind_technology FROM m_industry WHERE name = 'Technology';
  SELECT id INTO v_pp_manual FROM m_pain_point_category WHERE category_name = 'Manual Processes';
  SELECT id INTO v_pp_data FROM m_pain_point_category WHERE category_name = 'Data Silos';
  SELECT id INTO v_pp_legacy FROM m_pain_point_category WHERE category_name = 'Legacy Systems';

  -- Auth users (email/password login)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
     'admin@pbshope.com', crypt('admin123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Admin User"}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000000', v_manager_id, 'authenticated', 'authenticated',
     'manager@pbshope.com', crypt('manager123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Sales Manager"}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000000', v_rep_id, 'authenticated', 'authenticated',
     'rep@pbshope.com', crypt('rep123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Sales Rep"}', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM auth.identities WHERE user_id IN (v_admin_id, v_manager_id, v_rep_id);

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@pbshope.com'), 'email', v_admin_id::text, NOW(), NOW(), NOW()),
    (gen_random_uuid(), v_manager_id, jsonb_build_object('sub', v_manager_id::text, 'email', 'manager@pbshope.com'), 'email', v_manager_id::text, NOW(), NOW(), NOW()),
    (gen_random_uuid(), v_rep_id, jsonb_build_object('sub', v_rep_id::text, 'email', 'rep@pbshope.com'), 'email', v_rep_id::text, NOW(), NOW(), NOW());

  -- Public user profiles
  INSERT INTO users (id, email, full_name, role_id, is_active) VALUES
    (v_admin_id, 'admin@pbshope.com', 'Admin User', v_role_admin, true),
    (v_manager_id, 'manager@pbshope.com', 'Sales Manager', v_role_manager, true),
    (v_rep_id, 'rep@pbshope.com', 'Sales Rep', v_role_rep, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    is_active = EXCLUDED.is_active;

  -- Test clients (uses business_domains only — no legacy domain column)
  INSERT INTO clients (id, company_name, industry_id, contact_name, contact_email, contact_phone, business_domains, website_url, website_details) VALUES
    (v_client_acme, 'Acme Financial Corp', v_ind_financial, 'Jane Smith', 'jane.smith@acme.com', '+1-555-0101',
     ARRAY['Financial Services', 'B2B SaaS'],
     'https://www.acmefinancial.com', 'Regional bank expanding digital lending and fraud detection capabilities.'),
    (v_client_nova, 'Nova Health Systems', v_ind_healthcare, 'Dr. Robert Chen', 'rchen@novahealth.org', '+1-555-0102',
     ARRAY['Healthcare', 'Technology'],
     'https://www.novahealth.org', 'Hospital network piloting clinical documentation and patient triage AI.'),
    (v_client_pilot, 'Pilot Logistics Inc', v_ind_technology, 'Maria Garcia', 'maria@pilotlogistics.com', '+1-555-0103',
     ARRAY['Logistics', 'E-commerce'],
     'https://www.pilotlogistics.com', 'Mid-size 3PL seeking route optimization and warehouse automation.'),
    (v_client_draft, 'New Client Assessment', v_ind_technology, NULL, NULL, NULL,
     ARRAY[]::TEXT[], NULL, NULL)
  ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    industry_id = EXCLUDED.industry_id,
    business_domains = EXCLUDED.business_domains,
    website_url = EXCLUDED.website_url,
    website_details = EXCLUDED.website_details;

  -- Test assessments (various wizard stages + assigned)
  INSERT INTO assessments (
    id, client_id, status, assigned_rep_id, created_by,
    pre_assessment_notes, pain_point_ids, current_step, completed_steps
  ) VALUES
    (
      'c0000001-0001-4001-8001-000000000001',
      v_client_draft,
      'draft',
      NULL,
      v_manager_id,
      NULL,
      '{}',
      1,
      ARRAY[]::INT[]
    ),
    (
      'c0000001-0001-4001-8001-000000000002',
      v_client_acme,
      'pre_assessment',
      NULL,
      v_manager_id,
      E'## Acme Financial Corp — Pre-Assessment Research\n\n**Industry:** Financial Services\n**Focus:** Digital lending, fraud detection, regulatory compliance.\n\nAcme is a regional bank investing in AI for credit scoring and AML monitoring. Key gaps likely include data governance and model explainability for regulators.',
      ARRAY[v_pp_manual, v_pp_data]::UUID[],
      3,
      ARRAY[1, 2]::INT[]
    ),
    (
      'c0000001-0001-4001-8001-000000000003',
      v_client_nova,
      'assigned',
      v_rep_id,
      v_manager_id,
      E'## Nova Health Systems — Pre-Assessment Research\n\n**Industry:** Healthcare\n**Focus:** Clinical documentation, patient triage, HIPAA-compliant AI.\n\nNova operates 12 hospitals exploring ambient clinical notes and ED triage support. Primary concerns: PHI handling, clinician adoption, and EHR integration.',
      ARRAY[v_pp_data, v_pp_legacy]::UUID[],
      5,
      ARRAY[1, 2, 3, 4]::INT[]
    ),
    (
      'c0000001-0001-4001-8001-000000000004',
      v_client_pilot,
      'assigned',
      v_rep_id,
      v_manager_id,
      E'## Pilot Logistics Inc — Pre-Assessment Research\n\n**Industry:** Technology / Logistics\n**Focus:** Route optimization, warehouse automation, demand forecasting.\n\nPilot Logistics runs 8 distribution centers. They have siloed TMS/WMS data and want quick wins in dispatch optimization before broader GenAI adoption.',
      ARRAY[v_pp_manual, v_pp_data, v_pp_legacy]::UUID[],
      5,
      ARRAY[1, 2, 3, 4]::INT[]
    )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    assigned_rep_id = EXCLUDED.assigned_rep_id,
    pre_assessment_notes = EXCLUDED.pre_assessment_notes,
    pain_point_ids = EXCLUDED.pain_point_ids,
    current_step = EXCLUDED.current_step,
    completed_steps = EXCLUDED.completed_steps,
    updated_at = NOW();

  -- Sample questions for assigned assessment (Nova Health)
  DELETE FROM assessment_questions WHERE assessment_id = 'c0000001-0001-4001-8001-000000000003';

  INSERT INTO assessment_questions (
    assessment_id, driver_id, question_text, question_type,
    rating_min, rating_max, rating_labels, display_order, is_required, is_ai_generated
  )
  SELECT
    'c0000001-0001-4001-8001-000000000003',
    d.id,
    q.text,
    q.qtype,
    1, 5,
    '{"1": "Not at all", "5": "Fully"}'::jsonb,
    q.ord,
    true,
    true
  FROM (VALUES
    ('business_strategy', 1, 'How clearly has Nova Health linked AI investments to clinical outcome KPIs?', 'rating'),
    ('technology_data', 2, 'Is patient data across your 12 hospitals integrated enough for enterprise AI models?', 'rating'),
    ('ai_strategy', 3, 'Do you have a HIPAA-reviewed AI governance framework for clinical use cases?', 'text'),
    ('org_culture', 4, 'How ready are frontline clinicians to adopt ambient documentation tools?', 'voice'),
    ('infrastructure', 5, 'Which EHR integration patterns do you use for real-time AI inference?', 'multi_select')
  ) AS q(driver_key, ord, text, qtype)
  JOIN m_driver d ON d.driver_key = q.driver_key;

  UPDATE assessment_questions
  SET options = '["HL7 FHIR APIs", "Batch ETL", "Direct DB access", "None yet"]'::jsonb
  WHERE assessment_id = 'c0000001-0001-4001-8001-000000000003'
    AND question_type = 'multi_select';

  -- Notification for rep: assigned assessments
  INSERT INTO notifications (user_id, title, message, type, link, is_read) VALUES
    (v_rep_id, 'Assessment Assigned', 'You have been assigned Nova Health Systems assessment', 'info', '/assessments/c0000001-0001-4001-8001-000000000003', false),
    (v_rep_id, 'Assessment Assigned', 'You have been assigned Pilot Logistics Inc assessment', 'info', '/assessments/c0000001-0001-4001-8001-000000000004', false);

END $$;
