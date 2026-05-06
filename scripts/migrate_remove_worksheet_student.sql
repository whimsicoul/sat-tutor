-- Remove student_id from worksheets; worksheets are now session-assigned, not student-specific
ALTER TABLE worksheets DROP COLUMN IF EXISTS student_id;
