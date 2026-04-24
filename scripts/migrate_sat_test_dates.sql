CREATE TABLE IF NOT EXISTS sat_test_dates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_date  DATE        NOT NULL,
  created_by UUID        NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
