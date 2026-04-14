/**
 * Seed script — creates the admin user in the database.
 * Usage: npx tsx scripts/seed-admin.ts
 *
 * Requires these env vars (in .env.local):
 *   DATABASE_URL   — your Neon connection string
 *   ADMIN_EMAIL    — e.g. admin@dcsat.com
 *   ADMIN_PASSWORD — a strong password
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    'Missing required env vars: DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD'
  );
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  const existing = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1`;

  if (existing.length > 0) {
    console.log(`Admin user already exists (id: ${existing[0].id}). Nothing to do.`);
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD!, 12);

  const [user] = await sql`
    INSERT INTO users (name, email, hashed_password, role)
    VALUES ('Admin', ${ADMIN_EMAIL}, ${hashed}, 'admin')
    RETURNING id, name, email, role
  `;

  console.log('Admin user created:', user);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
