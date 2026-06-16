-- DC SAT Tutor — Daily Practice Migration
-- Run once against your Neon database.

-- Global problem pool (not student-specific)
CREATE TABLE IF NOT EXISTS daily_practice (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  question       TEXT    NOT NULL,
  choice_a       TEXT    NOT NULL,
  choice_b       TEXT    NOT NULL,
  choice_c       TEXT    NOT NULL,
  choice_d       TEXT    NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  category       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily assignments: which problems a student is assigned on which date.
-- UNIQUE(student_id, problem_id) ensures a student never sees the same problem twice.
CREATE TABLE IF NOT EXISTS student_daily_practice_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id    UUID NOT NULL REFERENCES daily_practice(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, problem_id)
);

-- Student answers (one row per problem per student per day)
CREATE TABLE IF NOT EXISTS student_daily_practice_responses (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id  UUID    NOT NULL REFERENCES student_daily_practice_assignments(id) ON DELETE CASCADE,
  student_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id     UUID    NOT NULL REFERENCES daily_practice(id) ON DELETE CASCADE,
  student_answer CHAR(1) CHECK (student_answer IN ('A','B','C','D')),
  is_correct     BOOLEAN NOT NULL,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sbr_assignment UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_sdpa_student_date ON student_daily_practice_assignments(student_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_sdpr_student ON student_daily_practice_responses(student_id);
