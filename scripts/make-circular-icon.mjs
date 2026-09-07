/**
 * Build circular Ganeshay app icons with clearer Marathi tagline.
 * Keeps full circular logo. Redraws the bottom Marathi line larger/bolder
 * so it stays readable at Android launcher sizes.
 *
 * Usage: node scripts/make-circular-icon.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const Jimp = require('jimp-compact');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'assets', 'branding', 'ganeshay-logo.png');
const ICON_SIZE = 1024;
const FAVICON_SIZE = 48;
const assetsDir = path.join(root, 'assets');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const NIRMALA_FONT = path.join(
  process.env.WINDIR || 'C:/Windows',
  'Fonts',
  'Nirmala.ttc'
).replace(/\\/g, '/');

const ZOOM = 1.0;
const MARATHI = '॥ व्यवसाय तुमचा, साथ आमची ॥';

const ANDROID_MIPMAP = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

function circularMaskSvg(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/>` +
      `</svg>`
  );
}

/** Cover old tiny Marathi + paint clearer text fully below "Ganeshay". */
function clearerMarathiOverlaySvg(size) {
  // Keep this band under the Ganeshay wordmark so nothing is clipped.
  const bandY = Math.round(size * 0.855);
  const bandH = Math.round(size * 0.085);
  const fontSize = Math.round(size * 0.036);
  const textY = bandY + Math.round(bandH * 0.72);
  const cx = size / 2;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<defs>` +
      `<linearGradient id="cover" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="#C9182E"/>` +
      `<stop offset="100%" stop-color="#9A0C22"/>` +
      `</linearGradient>` +
      `<style>` +
      `@font-face { font-family: 'NirmalaLocal'; src: url('file:///${NIRMALA_FONT}'); }` +
      `.marathi { font-family: 'NirmalaLocal', 'Nirmala UI', Mangal, sans-serif; ` +
      `font-size: ${fontSize}px; font-weight: 700; fill: #ffffff; ` +
      `stroke: #3a000c; stroke-width: ${Math.max(2, size * 0.0028)}px; paint-order: stroke fill; }` +
      `</style>` +
      `</defs>` +
      `<ellipse cx="${cx}" cy="${bandY + bandH * 0.48}" rx="${size * 0.36}" ry="${bandH * 0.7}" fill="url(#cover)"/>` +
      `<text class="marathi" x="${cx}" y="${textY}" text-anchor="middle">${MARATHI}</text>` +
      `</svg>`
  );
}

async function jimpReencode(filePath, size) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .resize(size, size, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const image = new Jimp(info.width, info.height);
  Buffer.from(data).copy(image.bitmap.data);
  const out = await new Promise((resolve, reject) => {
    image.getBuffer(Jimp.MIME_PNG, (err, buf) => (err ? reject(err) : resolve(buf)));
  });
  fs.writeFileSync(filePath, out);
}

async function buildCircularIcon(size) {
  const zoomedSize = Math.round(size * ZOOM);
  const zoomed = await sharp(sourcePath)
    .rotate()
    .ensureAlpha()
    .resize(zoomedSize, zoomedSize, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  const left = Math.round((zoomedSize - size) / 2);
  const cropped = await sharp(zoomed)
    .extract({ left, top: left, width: size, height: size })
    .ensureAlpha()
    .png()
    .toBuffer();

  const withMarathi = await sharp(cropped)
    .composite([{ input: clearerMarathiOverlaySvg(size), blend: 'over' }])
    .sharpen({ sigma: 1.1, m1: 1.1, m2: 0.6 })
    .png()
    .toBuffer();

  return sharp(withMarathi)
    .composite([{ input: circularMaskSvg(size), blend: 'dest-in' }])
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      force: true,
    })
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(NIRMALA_FONT)) {
    console.warn('Nirmala font not found at', NIRMALA_FONT);
  }

  const circularBuf = await buildCircularIcon(ICON_SIZE);

  const iconPath = path.join(assetsDir, 'icon.png');
  const adaptivePath = path.join(assetsDir, 'adaptive-icon.png');
  const faviconPath = path.join(assetsDir, 'favicon.png');

  fs.writeFileSync(iconPath, circularBuf);
  fs.writeFileSync(adaptivePath, circularBuf);
  await sharp(circularBuf)
    .resize(FAVICON_SIZE, FAVICON_SIZE)
    .sharpen()
    .png()
    .toFile(faviconPath);

  await jimpReencode(iconPath, ICON_SIZE);
  await jimpReencode(adaptivePath, ICON_SIZE);
  await jimpReencode(faviconPath, FAVICON_SIZE);

  for (const [folder, size] of ANDROID_MIPMAP) {
    const dir = path.join(androidRes, folder);
    fs.mkdirSync(dir, { recursive: true });
    for (const stale of ['ic_launcher.webp', 'ic_launcher_round.webp']) {
      const p = path.join(dir, stale);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    const scaled = await sharp(iconPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'lanczos3',
      })
      .sharpen({
        sigma: size < 96 ? 1.6 : 1.0,
        m1: size < 96 ? 1.4 : 1.0,
        m2: 0.6,
      })
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), scaled);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), scaled);
    await jimpReencode(path.join(dir, 'ic_launcher.png'), size);
    await jimpReencode(path.join(dir, 'ic_launcher_round.png'), size);
  }

  console.log('Circular icons updated with clearer Marathi text.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
