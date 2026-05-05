-- Worksheets: sequential multi-step assignments with instruction and problems pages

CREATE TABLE worksheets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  student_id  UUID NOT NULL REFERENCES users(id),
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE worksheet_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id    UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  step_order      INTEGER NOT NULL,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('instruction', 'problems')),
  stage_label     TEXT,
  locked_nav      BOOLEAN NOT NULL DEFAULT false,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE worksheet_step_pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id     UUID NOT NULL REFERENCES worksheet_steps(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_url   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE worksheet_step_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id         UUID NOT NULL REFERENCES worksheet_steps(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  page_number     INTEGER NOT NULL,
  x_percent       NUMERIC NOT NULL,
  y_percent       NUMERIC NOT NULL
);

CREATE TABLE worksheet_step_answer_key (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id         UUID NOT NULL REFERENCES worksheet_steps(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  correct_answer  TEXT NOT NULL CHECK (correct_answer IN ('A','B','C','D'))
);

CREATE TABLE worksheet_step_responses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id            UUID NOT NULL REFERENCES worksheet_steps(id) ON DELETE CASCADE,
  student_id         UUID NOT NULL REFERENCES users(id),
  question_number    INTEGER NOT NULL,
  selected_answer    TEXT CHECK (selected_answer IN ('A','B','C','D')),
  eliminated_choices TEXT[] DEFAULT '{}',
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (step_id, student_id, question_number)
);
