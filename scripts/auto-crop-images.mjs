import sharp from 'sharp';
import pg from 'pg';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

function detectCropOffsets(data, width, height, channels) {
  const blueCountPerRow = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i], g = data[i+1], b = data[i+2];
      if (b > r + 40 && b > g + 40 && b > 80) blueCountPerRow[y]++;
    }
  }

  const bands = [];
  let bandStart = null;
  for (let y = 0; y < height; y++) {
    if (blueCountPerRow[y] >= 100) {
      if (bandStart === null) bandStart = y;
    } else {
      if (bandStart !== null) { bands.push({ start: bandStart, end: y - 1, height: y - bandStart }); bandStart = null; }
    }
  }
  if (bandStart !== null) bands.push({ start: bandStart, end: height - 1, height: height - bandStart });

  if (bands.length === 0) return null;

  const headerBand = bands.reduce((max, b) => b.height > max.height ? b : max, bands[0]);
  const footerBand = bands.filter(b => b.start > height * 0.85).at(-1);

  return {
    crop_top_px: headerBand.end + 1,
    crop_bottom_px: footerBand ? height - footerBand.start : 0,
  };
}

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();

const { rows } = await client.query(
  `SELECT id, question_image_url FROM breakfast_problems WHERE question_image_url IS NOT NULL ORDER BY created_at`
);

console.log(`Processing ${rows.length} images...\n`);

let success = 0, failed = 0, skipped = 0;

for (let i = 0; i < rows.length; i++) {
  const { id, question_image_url } = rows[i];
  process.stdout.write(`[${i+1}/${rows.length}] ${question_image_url.split('/').pop().substring(0, 20)}... `);

  try {
    const res = await fetch(question_image_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const offsets = detectCropOffsets(data, info.width, info.height, info.channels);

    if (!offsets) {
      console.log(`SKIP (no blue bands detected)`);
      skipped++;
      continue;
    }

    await client.query(
      `UPDATE breakfast_problems SET crop_top_px=$1, crop_bottom_px=$2 WHERE id=$3`,
      [offsets.crop_top_px, offsets.crop_bottom_px, id]
    );
    console.log(`OK (top=${offsets.crop_top_px}, bottom=${offsets.crop_bottom_px})`);
    success++;
  } catch (err) {
    console.log(`FAIL: ${err.message}`);
    failed++;
  }
}

await client.end();
console.log(`\nDone. success=${success}, failed=${failed}, skipped=${skipped}`);
