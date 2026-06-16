-- DC SAT Tutor — Rename breakfast_problems tables to daily_practice
-- Run once against your Neon database to apply the naming change.

-- 1. Rename the main problem pool table
ALTER TABLE IF EXISTS breakfast_problems RENAME TO daily_practice;

-- 2. Rename the student assignment table
ALTER TABLE IF EXISTS student_breakfast_assignments RENAME TO student_daily_practice_assignments;

-- 3. Rename the student response table
ALTER TABLE IF EXISTS student_breakfast_responses RENAME TO student_daily_practice_responses;

-- 4. Rename indexes (drop old, create new pointing at renamed tables)
DROP INDEX IF EXISTS idx_sba_student_date;
CREATE INDEX IF NOT EXISTS idx_sdpa_student_date ON student_daily_practice_assignments(student_id, assigned_date);

DROP INDEX IF EXISTS idx_sbr_student;
CREATE INDEX IF NOT EXISTS idx_sdpr_student ON student_daily_practice_responses(student_id);

DROP INDEX IF EXISTS idx_sbr_submitted_at;
CREATE INDEX IF NOT EXISTS idx_sdpr_submitted_at ON student_daily_practice_responses(submitted_at);

DROP INDEX IF EXISTS idx_sbr_student_problem;
CREATE INDEX IF NOT EXISTS idx_sdpr_student_problem ON student_daily_practice_responses(student_id, problem_id);
