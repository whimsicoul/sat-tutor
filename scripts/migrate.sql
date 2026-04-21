-- DC SAT Tutor — Admin Migration
-- Run this once against your Neon database before using the admin dashboard.

-- 1. Add 'active' column to users (soft-delete / deactivation support)
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- 2. Tutor-student formal pairings
CREATE TABLE IF NOT EXISTS tutor_student_assignments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tutor_id, student_id)
);

-- 3. Recurring session series
CREATE TABLE IF NOT EXISTS session_series (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recurrence_rule  TEXT        NOT NULL, -- e.g. 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=16;BYMINUTE=0'
  start_date       DATE        NOT NULL,
  end_date         DATE,                 -- NULL = open-ended
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Link individual sessions to a series
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES session_series(id) ON DELETE SET NULL;

-- 5. Link problem sets to sessions (many-to-many)
CREATE TABLE IF NOT EXISTS session_problem_sets (
  session_id     UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  problem_set_id UUID NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, problem_set_id)
);
