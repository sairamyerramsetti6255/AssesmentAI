-- Seed user roles
INSERT INTO m_user_role (role_name, permissions) VALUES
  ('super_admin', '{"all": true}'::jsonb),
  ('sales_manager', '{"assessments": true, "proposals": true, "reports": true}'::jsonb),
  ('sales_rep', '{"sessions": true, "assigned_assessments": true}'::jsonb);

-- Seed maturity stages
INSERT INTO m_maturity_stage (stage_name, stage_order, color_hex, focus_area, description) VALUES
  ('Exploring', 1, '#94A3B8', 'Awareness', 'Organization is exploring AI possibilities'),
  ('Planning', 2, '#60A5FA', 'Strategy', 'Organization is planning AI initiatives'),
  ('Implementing', 3, '#FBBF24', 'Execution', 'Organization is implementing AI solutions'),
  ('Scaling', 4, '#34D399', 'Growth', 'Organization is scaling AI across departments'),
  ('Realizing', 5, '#A78BFA', 'Value', 'Organization is realizing AI value at scale');

-- Seed drivers
INSERT INTO m_driver (driver_name, driver_key, display_order, description, icon_name) VALUES
  ('Business Strategy', 'business_strategy', 1, 'Alignment of AI with business goals', 'Target'),
  ('Technology & Data', 'technology_data', 2, 'Data infrastructure and technology readiness', 'Database'),
  ('AI Strategy', 'ai_strategy', 3, 'AI vision, governance, and roadmap', 'Brain'),
  ('Organization & Culture', 'org_culture', 4, 'Workforce readiness and change management', 'Users'),
  ('Infrastructure', 'infrastructure', 5, 'Cloud, compute, and MLOps capabilities', 'Server');

-- Seed industries
INSERT INTO m_industry (name) VALUES
  ('Financial Services'),
  ('Healthcare'),
  ('Retail'),
  ('Manufacturing'),
  ('Technology'),
  ('Energy'),
  ('Government');

-- Seed pain point categories
INSERT INTO m_pain_point_category (category_name) VALUES
  ('Manual Processes'),
  ('Data Silos'),
  ('Customer Experience'),
  ('Operational Efficiency'),
  ('Compliance & Risk'),
  ('Talent Shortage'),
  ('Legacy Systems');

-- Seed solutions
INSERT INTO m_solution (solution_name, solution_key, description, typical_effort, low_cost_options, icon_name) VALUES
  ('Computer Vision', 'computer_vision', 'Visual inspection, object detection, and image analysis', 'High', 'Pre-trained models, cloud APIs', 'Eye'),
  ('NLP', 'nlp', 'Text analysis, sentiment, document processing', 'Medium', 'Open-source models, API services', 'MessageSquare'),
  ('Predictive Analytics', 'predictive_analytics', 'Forecasting, anomaly detection, risk modeling', 'Medium', 'AutoML platforms', 'TrendingUp'),
  ('GenAI', 'genai', 'Generative AI for content, code, and automation', 'Medium', 'Prompt engineering, fine-tuning', 'Sparkles'),
  ('Recommendation Engine', 'recommendation_engine', 'Personalization and product recommendations', 'Low', 'Collaborative filtering', 'ThumbsUp');

-- Seed default questions (2 per driver)
INSERT INTO m_question (driver_id, question_text, question_type, display_order, rating_labels)
SELECT d.id, q.text, 'rating', q.ord, '{"1": "Not at all", "2": "Limited", "3": "Moderate", "4": "Strong", "5": "Fully"}'::jsonb
FROM m_driver d
JOIN (VALUES
  ('business_strategy', 1, 'How well is AI integrated into your business strategy?'),
  ('business_strategy', 2, 'Do you have clear ROI metrics for AI initiatives?'),
  ('technology_data', 1, 'How mature is your data infrastructure for AI?'),
  ('technology_data', 2, 'Is your data quality sufficient for AI/ML models?'),
  ('ai_strategy', 1, 'Do you have a documented AI strategy and roadmap?'),
  ('ai_strategy', 2, 'Is there AI governance and ethical guidelines in place?'),
  ('org_culture', 1, 'How ready is your workforce to adopt AI tools?'),
  ('org_culture', 2, 'Is there executive sponsorship for AI initiatives?'),
  ('infrastructure', 1, 'Do you have cloud/compute infrastructure for AI workloads?'),
  ('infrastructure', 2, 'Is MLOps or model deployment pipeline in place?')
) AS q(driver_key, ord, text) ON d.driver_key = q.driver_key;

-- Seed proposal template
INSERT INTO m_proposal_template (template_name, template_html, is_default) VALUES
  ('Default AI Readiness Proposal', '
<h1>AI Readiness Proposal for {{company_name}}</h1>
<h2>Executive Summary</h2>
<p>Based on our comprehensive AI readiness assessment, {{company_name}} has achieved an overall readiness score of <strong>{{readiness_score}}/5</strong>, placing you in the <strong>{{maturity_stage}}</strong> maturity stage.</p>
<h2>Assessment Results</h2>
{{driver_scores_table}}
<h2>Identified Gaps</h2>
{{gaps_section}}
<h2>Recommended Solutions</h2>
{{solutions_section}}
<h2>Proof of Concept Plan</h2>
{{poc_section}}
<h2>Next Steps</h2>
<p>We recommend proceeding with the PoC outlined above to demonstrate value within 90 days.</p>
', true);

-- Seed industry benchmarks (sample)
INSERT INTO m_industry_benchmark (industry_id, maturity_stage_id, percentage, avg_driver_scores)
SELECT i.id, ms.id, 35, '{"business_strategy": 3.2, "technology_data": 2.8, "ai_strategy": 2.5, "org_culture": 3.0, "infrastructure": 2.7}'::jsonb
FROM m_industry i, m_maturity_stage ms
WHERE i.name = 'Financial Services' AND ms.stage_name = 'Implementing';

INSERT INTO m_industry_benchmark (industry_id, maturity_stage_id, percentage, avg_driver_scores)
SELECT i.id, ms.id, 40, '{"business_strategy": 2.5, "technology_data": 2.3, "ai_strategy": 2.0, "org_culture": 2.8, "infrastructure": 2.2}'::jsonb
FROM m_industry i, m_maturity_stage ms
WHERE i.name = 'Healthcare' AND ms.stage_name = 'Planning';

-- Run seed_test_assignments.sql next for demo users + test assessments
