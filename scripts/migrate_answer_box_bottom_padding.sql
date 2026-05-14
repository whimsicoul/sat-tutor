-- DC SAT Tutor — Add answer_box_bottom_padding column to worksheet_step_problems
-- Allows admins to add white space below a cropped question image so the answer
-- box can be placed clearly below the question text.
-- Run once against your Neon database.

ALTER TABLE worksheet_step_problems
  ADD COLUMN IF NOT EXISTS answer_box_bottom_padding INT NULL DEFAULT NULL;
