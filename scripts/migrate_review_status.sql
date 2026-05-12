ALTER TABLE breakfast_problems ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT NULL;

UPDATE breakfast_problems
SET review_status = 'flagged_for_review'
WHERE category = 'Reading and Writing'
  AND (
    question LIKE '%' || chr(65533) || '%' OR
    choice_a LIKE '%' || chr(65533) || '%' OR
    choice_b LIKE '%' || chr(65533) || '%' OR
    choice_c LIKE '%' || chr(65533) || '%' OR
    choice_d LIKE '%' || chr(65533) || '%'
  );
