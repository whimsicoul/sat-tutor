-- ACT Practice Test Schema

CREATE TABLE IF NOT EXISTS act_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('english', 'math', 'reading', 'science')),
  page_number INT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (section, page_number)
);

CREATE TABLE IF NOT EXISTS act_bubble_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('english', 'math', 'reading', 'science')),
  page_number INT NOT NULL,
  question_number INT NOT NULL,
  choice CHAR(1) NOT NULL CHECK (choice IN ('A','B','C','D','F','G','H','J')),
  x_percent FLOAT NOT NULL,
  y_percent FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (section, question_number, choice)
);

CREATE TABLE IF NOT EXISTS act_answer_key (
  section TEXT NOT NULL CHECK (section IN ('english', 'math', 'reading', 'science')),
  question_number INT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D','F','G','H','J')),
  PRIMARY KEY (section, question_number)
);

CREATE TABLE IF NOT EXISTS act_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('english', 'math', 'reading', 'science')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (student_id, section, started_at)
);

CREATE TABLE IF NOT EXISTS act_test_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES act_test_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  question_number INT NOT NULL,
  student_answer CHAR(1) NOT NULL,
  is_correct BOOLEAN,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attempt_id, question_number)
);
