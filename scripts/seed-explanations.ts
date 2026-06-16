/**
 * One-time script — reads all daily practice PDFs, extracts the Rationale
 * for each problem, and saves it to daily_practice.answer_explanation.
 *
 * Usage: npx tsx scripts/seed-explanations.ts
 *
 * Requires:
 *   DATABASE_URL in .env.local
 *   pdftotext on PATH (part of poppler-utils; `choco install poppler` on Windows)
 */

import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

function clean(s: string) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\f/g, '\n');
}

function extractExplanations(raw: string): Map<string, string> {
  const normalised = clean(raw);
  const blocks = normalised.split(/(?=Question ID [a-f0-9]+\b)/i).filter((b) => b.trim());
  const results = new Map<string, string>();

  for (const block of blocks) {
    const idMatch = block.match(/Question ID ([a-f0-9]+)/i);
    if (!idMatch) continue;
    const externalId = idMatch[1].toLowerCase();

    // "Rationale" may appear: on the same line as "Correct Answer:", on the next line,
    // or with content immediately following on the same line (no newline after "Rationale").
    // The [\s\S]{0,5} allows for at most one newline between "Correct Answer:…" and "Rationale".
    const rationaleMatch = block.match(
      /Correct Answer:[^\n]*\n?Rationale[^\S\n]*([\s\S]*?)(?=\nQuestion Difficulty:|\nQuestion ID\b|$)/i
    );
    if (!rationaleMatch) continue;

    const rationale = rationaleMatch[1].replace(/\s+/g, ' ').trim();
    if (rationale) results.set(externalId, rationale);
  }

  return results;
}

function getPdfPaths(baseDir: string): string[] {
  const paths: string[] = [];
  for (const sub of ['math', 'english']) {
    const dir = join(baseDir, sub);
    try {
      const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'));
      for (const f of files) paths.push(join(dir, f));
    } catch {
      console.warn(`Could not read directory: ${dir}`);
    }
  }
  return paths;
}

async function main() {
  const dailyPracticeDir = resolve('daily_practice');
  const pdfPaths = getPdfPaths(dailyPracticeDir);

  if (pdfPaths.length === 0) {
    console.error('No PDF files found under daily_practice/');
    process.exit(1);
  }

  console.log(`Found ${pdfPaths.length} PDFs to process.\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;
  let totalNoRationale = 0;

  for (const pdfPath of pdfPaths) {
    const label = pdfPath.replace(/\\/g, '/').split('/').slice(-2).join('/');
    process.stdout.write(`Processing ${label} ... `);

    let rawText: string;
    try {
      rawText = execSync(`pdftotext "${pdfPath}" -`, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: 60_000,
      });
    } catch {
      console.log('FAILED (pdftotext error — is poppler installed?)');
      continue;
    }

    const explanations = extractExplanations(rawText);
    console.log(`${explanations.size} rationales extracted`);

    if (explanations.size === 0) {
      totalNoRationale += 1;
      continue;
    }

    for (const [externalId, rationale] of explanations) {
      const rows = await sql`
        UPDATE daily_practice
        SET answer_explanation = ${rationale}
        WHERE external_id = ${externalId}
          AND answer_explanation IS NULL
        RETURNING id
      `;

      if (rows.length > 0) {
        totalUpdated++;
      } else {
        // Check whether the row exists but already has an explanation
        const existing = await sql`
          SELECT id, answer_explanation IS NOT NULL AS has_explanation
          FROM daily_practice
          WHERE external_id = ${externalId}
          LIMIT 1
        `;
        if (existing.length === 0) {
          totalNotFound++;
        } else {
          totalSkipped++; // already had an explanation
        }
      }
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Updated:      ${totalUpdated}`);
  console.log(`Skipped (already had explanation): ${totalSkipped}`);
  console.log(`Not found in DB: ${totalNotFound}`);
  if (totalNoRationale > 0) console.log(`PDFs with no rationales parsed: ${totalNoRationale}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
