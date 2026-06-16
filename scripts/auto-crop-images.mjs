import sharp from 'sharp';
import pg from 'pg';
import Tesseract from 'tesseract.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const TOP_PADDING_PX = 15;
const FALLBACK_TOP_PX = 220;
const ID_COMBINED_RE = /^ID:[0-9a-f]{6,8}$/i;
const ID_LABEL_RE = /^ID:?$/i;
const ID_HEX_RE = /^[0-9a-f]{6,8}$/i;

async function findIdBadgeBottom(worker, imageBuffer) {
  const { data } = await worker.recognize(imageBuffer);
  const words = data.words;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (ID_COMBINED_RE.test(w.text.trim())) {
      return w.bbox.y1;
    }
    if (ID_LABEL_RE.test(w.text.trim()) && i + 1 < words.length) {
      const next = words[i + 1];
      if (ID_HEX_RE.test(next.text.trim())) {
        return Math.max(w.bbox.y1, next.bbox.y1);
      }
    }
  }
  return null;
}

async function makeClient() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

const reprocess = process.argv.includes('--reprocess');
const dryRun = process.argv.includes('--dry-run');

if (reprocess) console.log('REPROCESS mode: ALL images with a URL will be updated.\n');
if (dryRun) console.log('DRY RUN mode: no DB writes will occur.\n');

const query = reprocess
  ? `SELECT id, question_image_url FROM daily_practice WHERE question_image_url IS NOT NULL ORDER BY created_at`
  : `SELECT id, question_image_url FROM daily_practice WHERE question_image_url IS NOT NULL AND image_height_px = 0 ORDER BY created_at`;

let client = await makeClient();
const { rows } = await client.query(query);
await client.end();

console.log(`${rows.length} images to process...\n`);

const worker = await Tesseract.createWorker('eng', 1, {
  logger: () => {},
  workerPath: require.resolve('tesseract.js/src/worker/node/index.js'),
  corePath: require.resolve('tesseract.js-core/tesseract-core-lstm.wasm'),
});

let success = 0, fallback = 0, failed = 0;

try {
  for (let i = 0; i < rows.length; i++) {
    const { id, question_image_url } = rows[i];
    process.stdout.write(`[${i+1}/${rows.length}] ${question_image_url.split('/').pop().substring(0, 20)}... `);

    try {
      const res = await fetch(question_image_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      const idBottomY = await findIdBadgeBottom(worker, buf);

      let crop_top_px, crop_bottom_px;
      if (idBottomY !== null) {
        crop_top_px = idBottomY + TOP_PADDING_PX;
        crop_bottom_px = 0;
        console.log(`OK (id_bottom=${idBottomY}, top=${crop_top_px}, ${meta.width}x${meta.height})`);
        success++;
      } else {
        crop_top_px = FALLBACK_TOP_PX;
        crop_bottom_px = 0;
        console.log(`FALLBACK (ocr miss, top=${crop_top_px}, ${meta.width}x${meta.height})`);
        fallback++;
      }

      if (!dryRun) {
        const c = await makeClient();
        await c.query(
          `UPDATE daily_practice SET crop_top_px=$1, crop_bottom_px=$2, image_width_px=$3, image_height_px=$4 WHERE id=$5`,
          [crop_top_px, crop_bottom_px, meta.width, meta.height, id]
        );
        await c.end();
      }
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      failed++;
    }
  }
} finally {
  await worker.terminate();
}

console.log(`\nDone. ocr_success=${success}, fallback=${fallback}, failed=${failed}${dryRun ? ' (DRY RUN — no DB changes)' : ''}`);
