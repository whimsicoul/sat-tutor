-- DC SAT Tutor — Add answer_explanation to breakfast_problems
-- Run once against your Neon database.

ALTER TABLE breakfast_problems
  ADD COLUMN IF NOT EXISTS answer_explanation TEXT;
