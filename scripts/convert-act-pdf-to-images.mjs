/**
 * Converts ACT1.pdf pages to PNG images and uploads them to UploadThing.
 *
 * Usage:
 *   node scripts/convert-act-pdf-to-images.mjs
 *
 * Requirements:
 *   - pdftoppm must be installed (part of poppler-utils)
 *   - UPLOADTHING_TOKEN env var must be set (from .env.local)
 *   - Run from the project root
 *
 * The ACT PDF has 4 sections starting at these pages (1-indexed within the extracted PDF):
 *   english:  pages 1–12   (50 questions, Test 1)
 *   math:     pages 13–24  (45 questions, Test 2)
 *   reading:  pages 25–32  (36 questions, Test 3)
 *   science:  pages 33–46  (40 questions, Test 4)
 *
 * After running, copy the printed JSON into the database via the admin answer-key page.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = join(__dirname, '..', 'ACT1.pdf');

// Page ranges for each section (1-indexed page numbers in the PDF)
const SECTIONS = {
  english:  { start: 1,  end: 12 },
  math:     { start: 13, end: 24 },
  reading:  { start: 25, end: 32 },
  science:  { start: 33, end: 46 },
};

const OUT_DIR = join(tmpdir(), `act-images-${randomUUID()}`);
mkdirSync(OUT_DIR, { recursive: true });

console.log('Converting ACT PDF to images...');
console.log(`PDF: ${PDF_PATH}`);
console.log(`Output dir: ${OUT_DIR}`);

if (!existsSync(PDF_PATH)) {
  console.error('ERROR: ACT-Practice-Test.pdf not found in project root.');
  process.exit(1);
}

// Convert all pages at 150dpi (good quality, reasonable file size)
try {
  execSync(
    `pdftoppm -r 150 -png "${PDF_PATH}" "${join(OUT_DIR, 'page')}"`,
    { stdio: 'inherit' }
  );
} catch (e) {
  console.error('pdftoppm failed. Make sure poppler-utils is installed.');
  console.error('  Windows: choco install poppler  OR  download from https://github.com/oschwartz10612/poppler-Windows');
  console.error('  Mac: brew install poppler');
  console.error('  Linux: apt-get install poppler-utils');
  process.exit(1);
}

const files = readdirSync(OUT_DIR)
  .filter(f => f.endsWith('.png'))
  .sort();

console.log(`\nGenerated ${files.length} pages.`);
console.log('\nPage mapping by section:');
for (const [section, { start, end }] of Object.entries(SECTIONS)) {
  console.log(`  ${section}: pages ${start}–${end} → files page-${String(start).padStart(3,'0')}.png through page-${String(end).padStart(3,'0')}.png`);
}

console.log('\n--- NEXT STEPS ---');
console.log('1. The PNG files are in:', OUT_DIR);
console.log('2. Go to /admin/act-test in the app and upload each section\'s pages using the page upload tool.');
console.log('3. After uploading, use the bubble placement tool to mark question choice positions.');
console.log('4. Enter the answer key in the admin answer key section.');
console.log('\nFiles generated:');
files.forEach((f, i) => console.log(`  ${String(i + 1).padStart(3, ' ')}. ${f}`));
