#!/usr/bin/env node
/**
 * Imports Math PDFs into breakfast_problems by:
 * 1. Rendering each page to a cropped PNG via mupdf (answers hidden)
 * 2. Uploading the PNG to UploadThing
 * 3. Inserting the question into the database
 *
 * Usage (from project root):
 *   node -r dotenv/config scripts/import-math-pdfs.js dotenv_config_path=.env.local
 *
 * Requires: mupdf (npm install mupdf), UPLOADTHING_TOKEN and DATABASE_URL in .env.local
 */

import * as mupdf from 'mupdf';
import { UTApi } from 'uploadthing/server';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PDF_CONFIGS = [
  { path: 'C:/Users/qylga/Desktop/Breakfast Problems/Math/Algebra-Part1-Breakfast.pdf',      problemSet: 'Algebra' },
  { path: 'C:/Users/qylga/Desktop/Breakfast Problems/Math/Algebra-Part2-Breakfast.pdf',      problemSet: 'Algebra' },
  { path: 'C:/Users/qylga/Desktop/Breakfast Problems/Math/Algebra-Part3-Breakfast.pdf',      problemSet: 'Algebra' },
  { path: 'C:/Users/qylga/Desktop/Breakfast Problems/Math/Algebra-Part4-Breakfast.pdf',      problemSet: 'Algebra' },
  { path: 'C:/Users/qylga/Desktop/Breakfast Problems/Math/AdvancedMath-Part1-Breakfast.pdf', problemSet: 'Advanced Math' },
  { path: 'C:/Users/qylga/Desktop/Breakfast Problems/Math/AdvancedMath-Part2-Breakfast.pdf', problemSet: 'Advanced Math' },
  { path: 'C:/Users/qylga/Desktop/Breakfast Problems/Math/AdvancedMath-Part3-Breakfast.pdf', problemSet: 'Advanced Math' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePageText(text) {
  const externalIdMatch = text.match(/Question ID ([a-f0-9]+)/i);
  if (!externalIdMatch) return null; // not a question page

  const externalId = externalIdMatch[1];

  // Skill
  let skill = '';
  const skillMatch = text.match(/Skill\s*\n([^\n]+)/i);
  if (skillMatch) skill = skillMatch[1].trim();

  // Difficulty
  let difficulty = '';
  const diffMatch = text.match(/Question Difficulty:\s*([^\n]+)/i);
  if (diffMatch) difficulty = diffMatch[1].trim();

  // Correct answer — must be A/B/C/D (skip free-response)
  const answerMatch = text.match(/Correct Answer:\s*([A-D])\b/i);
  if (!answerMatch) return null; // free-response, skip

  const correctAnswer = answerMatch[1].toUpperCase();

  return { externalId, skill, difficulty, correctAnswer };
}

function findAnswerBannerY(page) {
  // Use structured text JSON to find the bounding box of "ID: [hex] Answer" line
  // bbox is an object {x, y, w, h} in PDF points
  const json = JSON.parse(page.toStructuredText('preserve-whitespace').asJSON());
  for (const block of json.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const lineText = line.text ?? (line.spans ?? []).map((s) => s.text).join('');
      if (lineText && /ID:\s*[a-f0-9]+\s+Answer/i.test(lineText)) {
        return line.bbox.y;
      }
    }
  }
  return null;
}

function renderCroppedPage(page, cropY, scale = 3) {
  const matrix = mupdf.Matrix.scale(scale, scale);
  const fullPixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);

  const fullWidth = fullPixmap.getWidth();
  const cropPixelY = Math.floor((cropY - 2) * scale); // 2pt padding above banner

  // Slice the raw pixel buffer to the cropped height, then write into a new Pixmap
  const pixels = fullPixmap.getPixels(); // Uint8Array, RGB stride = width * 3
  const stride = fullWidth * 3;
  const croppedPixels = pixels.slice(0, stride * cropPixelY);

  const croppedPixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, fullWidth, cropPixelY], false);
  croppedPixmap.clear(255);
  croppedPixmap.getPixels().set(croppedPixels);

  return croppedPixmap.asPNG();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set. Pass dotenv_config_path=.env.local');
    process.exit(1);
  }
  if (!process.env.UPLOADTHING_TOKEN) {
    console.error('ERROR: UPLOADTHING_TOKEN not set.');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const utapi = new UTApi();

  // Pre-load existing external_ids to skip duplicates without hitting DB per-page
  const existing = await sql`SELECT external_id FROM breakfast_problems WHERE external_id IS NOT NULL`;
  const existingIds = new Set(existing.map((r) => r.external_id));
  console.log(`Existing Math questions in DB: ${[...existingIds].filter(() => true).length} total rows loaded`);

  let totalInserted = 0;
  let totalSkippedDuplicate = 0;
  let totalSkippedFreeResponse = 0;
  let totalSkippedNoBanner = 0;
  let totalSkippedNoQuestion = 0;

  for (const config of PDF_CONFIGS) {
    console.log(`\n── ${path.basename(config.path)} (${config.problemSet}) ──`);

    let pdfBytes;
    try {
      pdfBytes = fs.readFileSync(config.path);
    } catch (e) {
      console.error(`  ✗ Could not read file: ${e.message}`);
      continue;
    }

    const doc = mupdf.Document.openDocument(pdfBytes, 'application/pdf');
    const pageCount = doc.countPages();
    let inserted = 0, skipped = 0;

    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      const text = page.toStructuredText('preserve-whitespace').asText();

      // Parse metadata from page text
      const parsed = parsePageText(text);
      if (!parsed) {
        totalSkippedNoQuestion++;
        continue; // no question ID or free-response
      }

      const { externalId, skill, difficulty, correctAnswer } = parsed;

      // Skip free-response (already filtered by parsePageText returning null for non A-D answers)
      // Skip duplicates
      if (existingIds.has(externalId)) {
        totalSkippedDuplicate++;
        continue;
      }

      // Find the answer banner Y position for cropping
      const cropY = findAnswerBannerY(page);
      if (cropY === null) {
        console.warn(`  ⚠ Page ${i + 1} (${externalId}): could not find answer banner, skipping`);
        totalSkippedNoBanner++;
        continue;
      }

      // Render and crop the page
      let pngBuffer;
      try {
        pngBuffer = renderCroppedPage(page, cropY);
      } catch (e) {
        console.warn(`  ⚠ Page ${i + 1} (${externalId}): render failed: ${e.message}`);
        skipped++;
        continue;
      }

      // Upload to UploadThing
      let imageUrl;
      try {
        const blob = new Blob([pngBuffer], { type: 'image/png' });
        const file = new File([blob], `math-${externalId}.png`, { type: 'image/png' });
        const result = await utapi.uploadFiles(file);
        if (result.error) throw new Error(result.error.message);
        imageUrl = result.data.ufsUrl;
      } catch (e) {
        console.warn(`  ⚠ Page ${i + 1} (${externalId}): upload failed: ${e.message}`);
        skipped++;
        continue;
      }

      // Insert into DB
      try {
        const rows = await sql`
          INSERT INTO breakfast_problems
            (question, choice_a, choice_b, choice_c, choice_d, correct_answer,
             category, skill, difficulty, external_id, question_image_url, problem_set)
          VALUES
            (${''},  ${''},  ${''},  ${''},  ${''},
             ${correctAnswer}, ${'Math'}, ${skill}, ${difficulty},
             ${externalId}, ${imageUrl}, ${config.problemSet})
          ON CONFLICT (external_id) DO NOTHING
          RETURNING id
        `;
        if (rows.length > 0) {
          existingIds.add(externalId);
          inserted++;
          totalInserted++;
          process.stdout.write('.');
        } else {
          totalSkippedDuplicate++;
        }
      } catch (e) {
        console.warn(`\n  ⚠ Page ${i + 1} (${externalId}): DB insert failed: ${e.message}`);
        skipped++;
      }
    }

    console.log(`\n  ✓ ${inserted} inserted, ${skipped} errors`);
  }

  console.log('\n══ Summary ══');
  console.log(`Inserted:           ${totalInserted}`);
  console.log(`Skipped (duplicate):${totalSkippedDuplicate}`);
  console.log(`Skipped (free resp):${totalSkippedFreeResponse}`);
  console.log(`Skipped (no banner):${totalSkippedNoBanner}`);
  console.log(`Skipped (no Q ID):  ${totalSkippedNoQuestion}`);
}

main().catch((e) => {
  console.error('\nFatal error:', e);
  process.exit(1);
});
