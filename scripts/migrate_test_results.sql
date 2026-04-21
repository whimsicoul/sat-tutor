-- DC SAT Tutor — Test Results Migration
-- Run this once against your Neon database to add test results tracking.

CREATE TABLE IF NOT EXISTS test_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_name             TEXT        NOT NULL,
  test_date             DATE        NOT NULL,
  total_score           INTEGER,
  math_score            INTEGER,
  reading_writing_score INTEGER,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
