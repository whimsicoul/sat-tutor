import sharp from 'sharp';

const URLS = [
  'https://1saixefqih.ufs.sh/f/DgdPyQTQgvzZcTyb4cfosZ5GPY06IlJp8hnM3NOuSVjWkLUK',
  'https://1saixefqih.ufs.sh/f/DgdPyQTQgvzZHIJqKha49fwFMaeqB8oQW6LXiIyuUcNYKg7l',
  'https://1saixefqih.ufs.sh/f/DgdPyQTQgvzZodjHc1MDIqyWiUkeMNRzuXODPF9QYf6AacmL',
  'https://1saixefqih.ufs.sh/f/DgdPyQTQgvzZyuDplHEHaxfFVMSsYT0K1RkU3LEAQyb67w8t',
  'https://1saixefqih.ufs.sh/f/DgdPyQTQgvzZf40MuqyQT5eOPuchzCxLR41H0jE82skMNgod',
];

export function detectCropOffsets(data, width, height, channels) {
  // Count blue pixels per row
  const blueCountPerRow = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i], g = data[i+1], b = data[i+2];
      if (b > r + 40 && b > g + 40 && b > 80) blueCountPerRow[y]++;
    }
  }

  // Group into bands (consecutive rows with >= 100 blue pixels)
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

  if (bands.length === 0) return { crop_top_px: 0, crop_bottom_px: 0, bands };

  // The header band = the tallest blue band (the metadata table)
  const headerBand = bands.reduce((max, b) => b.height > max.height ? b : max, bands[0]);

  // The footer band = last band in the bottom 10% of the image
  const footerBand = bands.filter(b => b.start > height * 0.85).at(-1);

  const crop_top_px = headerBand.end + 1;
  const crop_bottom_px = footerBand ? height - footerBand.start : 0;

  return { crop_top_px, crop_bottom_px, bands };
}

for (const url of URLS) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const { crop_top_px, crop_bottom_px, bands } = detectCropOffsets(data, width, height, channels);
  console.log(`${url.split('/').pop().substring(0, 20)}  ${width}x${height}`);
  console.log(`  bands: ${bands.map(b => `[${b.start}-${b.end}](h=${b.height})`).join(', ')}`);
  console.log(`  → crop_top_px=${crop_top_px}, crop_bottom_px=${crop_bottom_px}`);
  console.log();
}
