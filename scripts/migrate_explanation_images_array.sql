-- DC SAT Tutor — Add explanation_image_urls array column to worksheet_step_problems
-- Supports up to 3 explanation screenshots per problem.
-- The old explanation_image_url column is kept for backward-compat reads.
-- Run once against your Neon database.

ALTER TABLE worksheet_step_problems
  ADD COLUMN IF NOT EXISTS explanation_image_urls TEXT[] NOT NULL DEFAULT '{}';
