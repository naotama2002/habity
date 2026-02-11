-- Add unique constraint on (user_id, external_id) for habits table (for import deduplication)
-- Replace the existing non-unique index with a unique partial index
DROP INDEX IF EXISTS idx_habits_external;
CREATE UNIQUE INDEX idx_habits_user_external_id
  ON habits (user_id, external_id)
  WHERE external_id IS NOT NULL;

-- Add unique constraint on (user_id, name) for categories table (for import deduplication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_categories_user_name'
  ) THEN
    CREATE UNIQUE INDEX idx_categories_user_name ON categories (user_id, name);
  END IF;
END $$;
