/**
 * Converts ACT1.pdf pages to PNG images using mupdf (already installed).
 * Run from the project root: node scripts/convert-act-pdf-to-images-mupdf.mjs
 *
 * Output: act-images/ directory in the project root with PNGs named by section and page number.
 */

import mupdf from 'mupdf';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = join(__dirname, '..', 'ACT1.pdf');
const OUT_DIR = join(__dirname, '..', 'act-images');

const SECTIONS = {
  english: { start: 1, end: 12 },
  math:    { start: 13, end: 24 },
  reading: { start: 25, end: 32 },
  science: { start: 33, end: 46 },
};

if (!existsSync(PDF_PATH)) {
  console.error('ERROR: ACT1.pdf not found in project root.');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

console.log('Loading PDF...');
const pdfBuffer = readFileSync(PDF_PATH);
const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
const pageCount = doc.countPages();
console.log(`PDF has ${pageCount} pages. Converting at 150dpi (scale 2.08x)...`);

// 150dpi = 150/72 ≈ 2.08 scale factor
const SCALE = 150 / 72;

let converted = 0;

for (const [section, { start, end }] of Object.entries(SECTIONS)) {
  const sectionDir = join(OUT_DIR, section);
  mkdirSync(sectionDir, { recursive: true });

  for (let pageNum = start; pageNum <= end; pageNum++) {
    const pageIndex = pageNum - 1; // mupdf is 0-indexed
    if (pageIndex >= pageCount) {
      console.warn(`  WARNING: page ${pageNum} exceeds PDF page count (${pageCount}), skipping.`);
      continue;
    }

    const page = doc.loadPage(pageIndex);
    const bounds = page.getBounds();

    // Scale matrix for 150dpi
    const matrix = mupdf.Matrix.scale(SCALE, SCALE);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);

    const pngBytes = pixmap.asPNG();
    const localPageNum = pageNum - start + 1;
    const filename = `page-${String(localPageNum).padStart(3, '0')}.png`;
    const outPath = join(sectionDir, filename);
    writeFileSync(outPath, pngBytes);

    converted++;
    process.stdout.write(`\r  [${section}] page ${pageNum} → ${filename} (${converted} total)`);
  }
  console.log();
}

console.log(`\nDone! ${converted} images saved to: ${OUT_DIR}`);
console.log('\nFolder structure:');
for (const section of Object.keys(SECTIONS)) {
  const { start, end } = SECTIONS[section];
  const count = end - start + 1;
  console.log(`  act-images/${section}/  (${count} pages: page-001.png … page-${String(count).padStart(3,'0')}.png)`);
}
console.log('\nNext steps:');
console.log('1. Go to /admin/act-test in the app');
console.log('2. Select a section, go to "Page Images" tab, and upload the PNGs from act-images/<section>/');
console.log('3. Use the "Bubble Placement" tab to mark answer positions');
console.log('4. Enter the answer key in the "Answer Key" tab');
