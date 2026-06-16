-- Analytics migration
-- Ensures daily_practice has skill + difficulty (defined in app code but absent from original migration)
ALTER TABLE daily_practice
  ADD COLUMN IF NOT EXISTS skill       TEXT,
  ADD COLUMN IF NOT EXISTS difficulty  TEXT;

-- Add analytics metadata to worksheet problems
ALTER TABLE worksheet_step_problems
  ADD COLUMN IF NOT EXISTS category   TEXT,
  ADD COLUMN IF NOT EXISTS skill      TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- Indexes for analytics query performance
CREATE INDEX IF NOT EXISTS idx_sdpr_submitted_at    ON student_daily_practice_responses (submitted_at);
CREATE INDEX IF NOT EXISTS idx_sdpr_student_problem ON student_daily_practice_responses (student_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_wsr_updated_at      ON worksheet_step_responses (updated_at);
CREATE INDEX IF NOT EXISTS idx_wsp_skill           ON worksheet_step_problems (step_id, skill, difficulty, category);
