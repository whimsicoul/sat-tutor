-- Add 'warm_up' as a valid worksheet step type
ALTER TABLE worksheet_steps DROP CONSTRAINT worksheet_steps_type_check;
ALTER TABLE worksheet_steps ADD CONSTRAINT worksheet_steps_type_check
  CHECK (type IN ('instruction', 'problems', 'warm_up'));
