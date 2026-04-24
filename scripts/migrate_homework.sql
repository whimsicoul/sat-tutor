-- DC SAT Tutor — Homework Migration
-- Run this once against your Neon database to add homework support.

CREATE TABLE IF NOT EXISTS homework (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  student_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date  DATE        NOT NULL,
  problem_pdf_url TEXT        NOT NULL,
  answer_pdf_url  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
