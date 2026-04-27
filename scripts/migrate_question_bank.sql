-- DC SAT Tutor — Question Bank Migration
-- Adds skill, difficulty, external_id columns to breakfast_problems.
-- Run once against your Neon database.

ALTER TABLE breakfast_problems
  ADD COLUMN IF NOT EXISTS skill        TEXT,
  ADD COLUMN IF NOT EXISTS difficulty   TEXT,
  ADD COLUMN IF NOT EXISTS external_id  TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_bp_category    ON breakfast_problems(category);
CREATE INDEX IF NOT EXISTS idx_bp_skill       ON breakfast_problems(skill);
CREATE INDEX IF NOT EXISTS idx_bp_difficulty  ON breakfast_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_bp_external_id ON breakfast_problems(external_id);
