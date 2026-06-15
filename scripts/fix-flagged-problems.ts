/**
 * Fix corrupted characters (U+FFFD) in flagged breakfast problems using Claude AI.
 *
 * Problems where corruption appears adjacent to a digit (e.g. "19??" years) are
 * separated into a manual-review list so you can fix them by hand.
 *
 * Usage:
 *   npx tsx scripts/fix-flagged-problems.ts           # dry run — preview only
 *   npx tsx scripts/fix-flagged-problems.ts --apply   # apply fixes and mark reviewed
 *
 * Requires in .env.local:
 *   DATABASE_URL
 *   ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ─── Types ───────────────────────────────────────────────────────────────────

const TEXT_FIELDS = ['question', 'choice_a', 'choice_b', 'choice_c', 'choice_d', 'answer_explanation'] as const;
type TextField = typeof TEXT_FIELDS[number];

interface Problem {
  id: string;
  external_id: string | null;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  answer_explanation: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REPLACEMENT = '�';

function hasCorruption(val: string | null): val is string {
  return typeof val === 'string' && val.includes(REPLACEMENT);
}

// A digit itself is missing: 2+ digits then replacement NOT followed by another digit
// (e.g. "196?"). Date-range separators ("1873–1908") and copyright symbols
// ("©2020") are NOT caught, since replacement is followed by a digit or not preceded by 2+.
function hasNumericAdjacentCorruption(val: string): boolean {
  return /\d{2,}�(?!\d)/.test(val);
}

function corruptedFields(p: Problem): TextField[] {
  return TEXT_FIELDS.filter(f => hasCorruption(p[f] as string | null));
}

function anyNumericCorruption(p: Problem): boolean {
  return TEXT_FIELDS.some(f => {
    const v = p[f];
    return typeof v === 'string' && hasNumericAdjacentCorruption(v);
  });
}

// Display U+FFFD as a visible ? for console output
function show(s: string | null): string {
  return (s ?? '').replace(/�/g, '\x1b[31m?\x1b[0m');
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Claude fix ──────────────────────────────────────────────────────────────

async function fixWithClaude(
  client: Anthropic,
  fields: Partial<Record<TextField, string>>
): Promise<Partial<Record<TextField, string>>> {
  const inputJson = JSON.stringify(fields, null, 2);

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: `You repair corrupted SAT exam question text. The character � (Unicode replacement character U+FFFD) marks a single character that failed to encode. Common replacements are:
- accented letters (é à ñ ü ö ç â î etc.)
- em dash (—) or en dash (–)
- smart quotes (" " ' ')
- ellipsis (…)
- other special punctuation

Rules:
1. Return ONLY a valid JSON object with the same keys as the input.
2. Replace each � with your best single-character inference based on context.
3. If you are genuinely unsure about a character, leave it as � — do not guess randomly.
4. Make NO other changes to the text whatsoever.`,
    messages: [
      {
        role: 'user',
        content: `Repair the corrupted characters in this JSON and return corrected JSON only:\n\n${inputJson}`,
      },
    ],
  });

  const content = msg.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response type');

  // Strip markdown code fences if present
  const cleaned = content.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(cleaned) as Partial<Record<TextField, string>>;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const applyChanges = process.argv.includes('--apply');

  const DATABASE_URL = process.env.DATABASE_URL;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env.local');
    process.exit(1);
  }
  if (!ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in .env.local');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);
  const claude = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  console.log(applyChanges
    ? '\x1b[33m--- APPLY MODE: changes will be written to the database ---\x1b[0m'
    : '\x1b[36m--- DRY RUN: no changes written (pass --apply to commit) ---\x1b[0m'
  );

  console.log('\nFetching flagged problems...\n');

  const rows = await sql`
    SELECT id, external_id, question, choice_a, choice_b, choice_c, choice_d, answer_explanation
    FROM breakfast_problems
    WHERE review_status = 'flagged_for_review'
    ORDER BY external_id NULLS LAST
  `;

  const problems = rows as unknown as Problem[];
  console.log(`Found ${problems.length} flagged problems.\n`);

  const manualReview: Problem[] = [];
  let countFixed = 0;
  let countPartial = 0; // Claude left some ? chars unfilled
  let countNoCorruption = 0;
  let countErrors = 0;

  for (let i = 0; i < problems.length; i++) {
    const p = problems[i];
    const label = p.external_id ?? p.id;
    const prefix = `[${String(i + 1).padStart(3)}/${problems.length}]`;

    // Route year/numeric corruptions to manual review
    if (anyNumericCorruption(p)) {
      console.log(`${prefix} MANUAL   ${label}`);
      manualReview.push(p);
      continue;
    }

    const badFields = corruptedFields(p);

    // Flagged but replacement char not found — just clear the flag
    if (badFields.length === 0) {
      countNoCorruption++;
      process.stdout.write(`${prefix} CLEAR    ${label} (no corruption found)`);
      if (applyChanges) {
        await sql`UPDATE breakfast_problems SET review_status = NULL WHERE id = ${p.id}`;
        process.stdout.write(' → cleared');
      }
      console.log();
      continue;
    }

    // Build input for Claude: only send the corrupted fields
    const input: Partial<Record<TextField, string>> = {};
    for (const f of badFields) input[f] = p[f] as string;

    process.stdout.write(`${prefix} FIXING   ${label} (${badFields.join(', ')}) ... `);

    let fixed: Partial<Record<TextField, string>>;
    try {
      fixed = await fixWithClaude(claude, input);
    } catch (err) {
      console.log(`\x1b[31mERROR: ${err instanceof Error ? err.message : err}\x1b[0m`);
      countErrors++;
      continue;
    }

    // Detect whether any ? chars remain after Claude's attempt
    const remainingCorruption = Object.values(fixed).some(v => typeof v === 'string' && v.includes(REPLACEMENT));
    if (remainingCorruption) {
      countPartial++;
      console.log('\x1b[33mPARTIAL\x1b[0m (some chars left unfixed)');
    } else {
      countFixed++;
      console.log('\x1b[32mOK\x1b[0m');
    }

    // Print per-field diff
    for (const [field, original] of Object.entries(input)) {
      const corrected = fixed[field as TextField] ?? original;
      if (corrected !== original) {
        console.log(`  \x1b[2m${field}:\x1b[0m`);
        console.log(`    BEFORE: ${show(original)}`);
        console.log(`    AFTER:  ${show(corrected)}`);
      }
    }

    if (applyChanges) {
      // Merge fixes back over the original problem, then do one UPDATE
      const updated = {
        question:           fixed.question           ?? p.question,
        choice_a:           fixed.choice_a           ?? p.choice_a,
        choice_b:           fixed.choice_b           ?? p.choice_b,
        choice_c:           fixed.choice_c           ?? p.choice_c,
        choice_d:           fixed.choice_d           ?? p.choice_d,
        answer_explanation: fixed.answer_explanation ?? p.answer_explanation,
      };

      // Only clear the flag if no corruption remains
      const newStatus = remainingCorruption ? 'flagged_for_review' : null;

      await sql`
        UPDATE breakfast_problems
        SET
          question           = ${updated.question},
          choice_a           = ${updated.choice_a},
          choice_b           = ${updated.choice_b},
          choice_c           = ${updated.choice_c},
          choice_d           = ${updated.choice_d},
          answer_explanation = ${updated.answer_explanation},
          review_status      = ${newStatus}
        WHERE id = ${p.id}
      `;
    }

    // Polite pause between API calls
    await sleep(150);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log('\n\x1b[1m--- Summary ---\x1b[0m');
  console.log(`Total flagged:         ${problems.length}`);
  console.log(`Auto-fixed (fully):    ${countFixed}`);
  console.log(`Partially fixed:       ${countPartial}  ← still flagged, some ? remain`);
  console.log(`Manual review needed:  ${manualReview.length}  ← digit-adjacent corruption`);
  console.log(`No corruption found:   ${countNoCorruption}  ← flag cleared`);
  console.log(`Errors:                ${countErrors}`);

  if (!applyChanges && (countFixed + countPartial) > 0) {
    console.log('\n\x1b[36mRe-run with --apply to write these fixes to the database.\x1b[0m');
  }

  // ─── Manual review list ────────────────────────────────────────────────────

  if (manualReview.length > 0) {
    console.log('\n\x1b[1m--- Problems needing manual review (digit/year corruption) ---\x1b[0m');
    for (const p of manualReview) {
      console.log(`\n\x1b[33m${p.external_id ?? p.id}\x1b[0m`);
      for (const f of corruptedFields(p)) {
        console.log(`  ${f}: ${show(p[f] as string)}`);
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
