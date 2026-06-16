-- DC SAT Tutor — Add answer_explanation to daily_practice
-- Run once against your Neon database.

ALTER TABLE daily_practice
  ADD COLUMN IF NOT EXISTS answer_explanation TEXT;
