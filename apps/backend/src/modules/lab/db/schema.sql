-- API Cost Optimization Lab database schema
-- Provides normalized tables for experiments, API calls, baselines, and progress tracking

CREATE TABLE IF NOT EXISTS lab_experiments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  baseline_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_api_calls (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES lab_experiments(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  provider VARCHAR(64) NOT NULL,
  model VARCHAR(128) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  system_tokens INTEGER NOT NULL,
  cost NUMERIC(12, 6) NOT NULL,
  latency_ms INTEGER NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_api_calls_experiment_id ON lab_api_calls (experiment_id);
CREATE INDEX IF NOT EXISTS idx_lab_api_calls_occurred_at ON lab_api_calls (occurred_at DESC);

CREATE TABLE IF NOT EXISTS lab_baselines (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES lab_experiments(id) ON DELETE CASCADE,
  average_cost NUMERIC(12, 6) NOT NULL,
  total_tokens BIGINT NOT NULL,
  average_latency_ms INTEGER NOT NULL,
  call_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_user_progress (
  user_id UUID PRIMARY KEY,
  experiments_completed INTEGER DEFAULT 0,
  total_cost_savings NUMERIC(14, 2) DEFAULT 0,
  badges_earned JSONB DEFAULT '[]'::jsonb,
  challenges_completed JSONB DEFAULT '[]'::jsonb,
  skill_level INTEGER DEFAULT 1,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
