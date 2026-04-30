-- Add scoring metadata to answer key
ALTER TABLE act_answer_key
  ADD COLUMN IF NOT EXISTS is_scored BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reporting_category TEXT;

-- Extend test_results for ACT composite cards
ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS score_type TEXT NOT NULL DEFAULT 'sat',
  ADD COLUMN IF NOT EXISTS act_english_score INT,
  ADD COLUMN IF NOT EXISTS act_reading_score INT;

-- Unique constraint to prevent duplicate ACT composite entries per student per test
ALTER TABLE test_results
  DROP CONSTRAINT IF EXISTS test_results_student_test_type_unique;

ALTER TABLE test_results
  ADD CONSTRAINT test_results_student_test_type_unique
  UNIQUE (student_id, test_name, score_type);
