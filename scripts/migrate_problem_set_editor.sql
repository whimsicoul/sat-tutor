-- Problem set editor migration
-- Adds: page images, question positions, image crop columns on questions

CREATE TABLE IF NOT EXISTS problem_set_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id UUID NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_set_id, page_number)
);

CREATE TABLE IF NOT EXISTS problem_set_question_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id UUID NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
  question_number INT NOT NULL,
  page_number INT NOT NULL,
  x_percent FLOAT NOT NULL,
  y_percent FLOAT NOT NULL,
  UNIQUE(problem_set_id, question_number)
);

ALTER TABLE problem_set_questions ADD COLUMN IF NOT EXISTS question_image_url TEXT;
ALTER TABLE problem_set_questions ADD COLUMN IF NOT EXISTS crop_top_px INT;
ALTER TABLE problem_set_questions ADD COLUMN IF NOT EXISTS crop_bottom_px INT;
ALTER TABLE problem_set_questions ADD COLUMN IF NOT EXISTS image_width_px INT;
ALTER TABLE problem_set_questions ADD COLUMN IF NOT EXISTS image_height_px INT;
