/**
 * Converts ACT1.pdf pages to PNG images, uploads them to UploadThing,
 * and saves each URL to the act_pages table in the database.
 *
 * Usage:
 *   node scripts/convert-act-pdf-to-images.mjs
 *
 * Requirements:
 *   - pdftoppm must be installed (part of poppler-utils)
 *   - UPLOADTHING_TOKEN and DATABASE_URL must be set in .env.local
 *   - Run from the project root
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PDF_PATH = join(ROOT, 'ACT1.pdf');

// Load .env.local
const envPath = join(ROOT, '.env.local');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

if (!process.env.UPLOADTHING_TOKEN) {
  console.error('ERROR: UPLOADTHING_TOKEN not set in .env.local');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set in .env.local');
  process.exit(1);
}

// Page ranges for each section (1-indexed page numbers in the PDF)
const SECTIONS = {
  english: { start: 1,  end: 12 },
  math:    { start: 13, end: 24 },
  reading: { start: 25, end: 32 },
  science: { start: 33, end: 46 },
};

if (!existsSync(PDF_PATH)) {
  console.error('ERROR: ACT1.pdf not found in project root.');
  process.exit(1);
}

const OUT_DIR = join(tmpdir(), `act-images-${randomUUID()}`);
mkdirSync(OUT_DIR, { recursive: true });

console.log('Converting ACT PDF to images...');
console.log(`PDF: ${PDF_PATH}`);
console.log(`Output dir: ${OUT_DIR}\n`);

try {
  execSync(
    `pdftoppm -r 150 -png "${PDF_PATH}" "${join(OUT_DIR, 'page')}"`,
    { stdio: 'inherit' }
  );
} catch {
  console.error('pdftoppm failed. Make sure poppler-utils is installed.');
  process.exit(1);
}

const files = readdirSync(OUT_DIR).filter(f => f.endsWith('.png')).sort();
console.log(`\nGenerated ${files.length} pages. Starting upload...\n`);

// Dynamically import UTApi (ESM)
const { UTApi } = await import('uploadthing/server');
const utapi = new UTApi();

// Dynamically import neon
const { neon } = await import('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

let uploaded = 0;
let failed = 0;

for (const [section, { start, end }] of Object.entries(SECTIONS)) {
  console.log(`\n── ${section.toUpperCase()} (pages ${start}–${end}) ──`);
  for (let pageNum = start; pageNum <= end; pageNum++) {
    const paddedPage = String(pageNum).padStart(2, '0');
    const filename = `page-${paddedPage}.png`;
    const filepath = join(OUT_DIR, filename);

    if (!existsSync(filepath)) {
      console.error(`  MISSING: ${filename}`);
      failed++;
      continue;
    }

    const sectionPageNum = pageNum - start + 1;
    process.stdout.write(`  Uploading page ${sectionPageNum}/${end - start + 1} (${filename})... `);

    try {
      const fileData = readFileSync(filepath);
      const blob = new Blob([fileData], { type: 'image/png' });
      const utFile = new File([blob], `act1-${section}-page${sectionPageNum}.png`, { type: 'image/png' });

      const response = await utapi.uploadFiles(utFile);
      if (response.error) throw new Error(response.error.message);

      const imageUrl = response.data.ufsUrl;

      await sql`
        INSERT INTO act_pages (section, page_number, image_url)
        VALUES (${section}, ${sectionPageNum}, ${imageUrl})
        ON CONFLICT (section, page_number) DO UPDATE SET image_url = EXCLUDED.image_url
      `;

      console.log(`done -> ${imageUrl}`);
      uploaded++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failed++;
    }
  }
}

// Cleanup temp files
rmSync(OUT_DIR, { recursive: true, force: true });

console.log(`\n══════════════════════════════`);
console.log(`Done. ${uploaded} uploaded, ${failed} failed.`);
if (failed === 0) {
  console.log('All pages are now in the database. Visit /admin/act-test to verify.');
}