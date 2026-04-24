import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS sat_test_dates (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      test_date  DATE        NOT NULL,
      created_by UUID        NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('sat_test_dates table created (or already exists).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
