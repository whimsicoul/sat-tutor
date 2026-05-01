-- Interactive problem sets migration
-- Adds: extracted questions, answer keys, student responses, extraction status

-- Extracted questions from problem set PDFs (via Claude AI)
CREATE TABLE IF NOT EXISTS problem_set_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id UUID NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
  question_number INT NOT NULL,
  stem TEXT NOT NULL,
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  choice_c TEXT NOT NULL,
  choice_d TEXT NOT NULL,
  passage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_set_id, question_number)
);

-- Extracted answers from answer key PDFs
CREATE TABLE IF NOT EXISTS problem_set_answer_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id UUID NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
  question_number INT NOT NULL,
  correct_answer CHAR(1) NOT NULL,
  UNIQUE(problem_set_id, question_number)
);

-- Student responses: one row per (student, problem_set, question), upserted on each interaction
CREATE TABLE IF NOT EXISTS problem_set_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id UUID NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_number INT NOT NULL,
  selected_answer CHAR(1),
  eliminated_choices TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_set_id, student_id, question_number)
);

-- Extraction lifecycle on problem_sets
ALTER TABLE problem_sets ADD COLUMN IF NOT EXISTS extraction_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE problem_sets ADD COLUMN IF NOT EXISTS question_count INT;
ALTER TABLE problem_sets ADD COLUMN IF NOT EXISTS answer_key_status TEXT NOT NULL DEFAULT 'none';
