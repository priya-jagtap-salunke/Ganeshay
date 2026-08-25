/**
 * Generate Ganeshay Expo / brand PNGs.
 *
 * Usage:
 *   node scripts/create-assets.mjs
 *   node scripts/create-assets.mjs --force
 *   node scripts/create-assets.mjs --solid --force
 *   node scripts/create-assets.mjs --source "C:/path/to/logo.png"
 *
 * --solid: write jimp-compact-generated solid/simple PNGs only (no sharp).
 *   Use on Codemagic BEFORE expo prebuild so CI never depends on git PNG bytes.
 *
 * postinstall: if Expo PNGs already jimp-readable, leave them alone.
 * Never write the historical 76-byte corrupt placeholder (CRC 79495168).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const brandingDir = path.join(assetsDir, 'branding');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');

const FULL_LOGO = path.join(brandingDir, 'ganeshay-logo.png');
const ICON_MARK = path.join(brandingDir, 'ganeshay-icon.png');
const SPLASH_ART = path.join(brandingDir, 'ganeshay-splash.png');

const SPLASH_BG = 0xfffaf5ff; // #FFFAF5
const ICON_SIZE = 1024;
const FAVICON_SIZE = 48;

const EXPO_ASSET_FILES = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'];

const ANDROID_MIPMAP = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

const ANDROID_SPLASH = [
  ['drawable-mdpi', 200],
  ['drawable-hdpi', 300],
  ['drawable-xhdpi', 400],
  ['drawable-xxhdpi', 600],
  ['drawable-xxxhdpi', 800],
];

function parseArgs(argv) {
  const args = { force: false, solid: false, source: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--force' || a === '-f') args.force = true;
    else if (a === '--solid') args.solid = true;
    else if (a === '--source' || a === '-s') {
      args.source = argv[i + 1] ?? null;
      i += 1;
    }
  }
  return args;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isPngBuffer(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

function assertPngFile(filePath) {
  const buf = fs.readFileSync(filePath);
  if (!isPngBuffer(buf)) {
    throw new Error(`Not a real PNG (bad magic): ${filePath}`);
  }
  return buf.length;
}

function loadJimp() {
  try {
    return require('jimp-compact');
  } catch {
    return require(path.join(root, 'node_modules', 'jimp-compact'));
  }
}

async function assertJimpReadable(filePath) {
  const Jimp = loadJimp();
  const buf = fs.readFileSync(filePath);
  try {
    const img = await Jimp.read(buf);
    if (!img?.bitmap?.width) throw new Error('empty bitmap');
  } catch (err) {
    throw new Error(
      `jimp-compact cannot read ${path.relative(root, filePath)} (${buf.length} bytes): ${err.message}. ` +
        'This is the Codemagic Expo prebuild CRC failure mode — regenerate with --solid --force.'
    );
  }
}

/** True if file is a real PNG and jimp-compact can decode it. */
async function isJimpValidExpoAsset(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    assertPngFile(filePath);
    await assertJimpReadable(filePath);
    return true;
  } catch {
    return false;
  }
}

function jimpGetBuffer(image, Jimp) {
  return new Promise((resolve, reject) => {
    image.getBuffer(Jimp.MIME_PNG, (err, b) => (err ? reject(err) : resolve(b)));
  });
}

function jimpCreate(width, height, color, Jimp) {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-new
    new Jimp(width, height, color, (err, image) => (err ? reject(err) : resolve(image)));
  });
}

/**
 * Solid ivory background + centered saffron circle (no external source, no sharp).
 * Guaranteed readable by the same jimp-compact Expo uses.
 */
async function buildSolidMarkBuffer(size, Jimp) {
  const image = await jimpCreate(size, size, SPLASH_BG, Jimp);
  const r = Math.floor(size * 0.36);
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const r2 = r * r;
  image.scan(cx - r, cy - r, r * 2, r * 2, function (x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy <= r2) {
      this.bitmap.data[idx + 0] = 0xff;
      this.bitmap.data[idx + 1] = 0x8c;
      this.bitmap.data[idx + 2] = 0x00;
      this.bitmap.data[idx + 3] = 0xff;
    }
  });
  return jimpGetBuffer(image, Jimp);
}

async function writeBufferPng(dest, buf) {
  ensureDir(path.dirname(dest));
  if (!isPngBuffer(buf)) throw new Error(`Refusing to write non-PNG: ${dest}`);
  fs.writeFileSync(dest, buf);
  assertPngFile(dest);
  await assertJimpReadable(dest);
  console.log(`Wrote ${path.relative(root, dest)} (${buf.length} bytes, jimp-OK)`);
}

async function writeSolidExpoAssets() {
  const Jimp = loadJimp();
  ensureDir(assetsDir);
  ensureDir(brandingDir);

  const iconBuf = await buildSolidMarkBuffer(ICON_SIZE, Jimp);
  // Splash uses the same mark (ivory + saffron circle) — fully jimp-authored.
  const splashWithMark = await Jimp.read(iconBuf);
  const splashOut = await jimpGetBuffer(splashWithMark, Jimp);

  const favImage = await Jimp.read(iconBuf);
  favImage.resize(FAVICON_SIZE, FAVICON_SIZE);
  const favBuf = await jimpGetBuffer(favImage, Jimp);

  const iconPath = path.join(assetsDir, 'icon.png');
  const adaptivePath = path.join(assetsDir, 'adaptive-icon.png');
  const faviconPath = path.join(assetsDir, 'favicon.png');
  const splashPath = path.join(assetsDir, 'splash.png');

  await writeBufferPng(iconPath, iconBuf);
  await writeBufferPng(adaptivePath, iconBuf);
  await writeBufferPng(splashPath, splashOut);
  await writeBufferPng(faviconPath, favBuf);
  await writeBufferPng(FULL_LOGO, iconBuf);
  await writeBufferPng(ICON_MARK, iconBuf);
  await writeBufferPng(SPLASH_ART, splashOut);

  // Optional android mipmaps if native tree exists (jimp-only)
  if (fs.existsSync(androidRes)) {
    for (const [folder, size] of ANDROID_MIPMAP) {
      const dir = path.join(androidRes, folder);
      ensureDir(dir);
      const scaled = await Jimp.read(iconBuf);
      scaled.resize(size, size);
      const buf = await jimpGetBuffer(scaled, Jimp);
      await writeBufferPng(path.join(dir, 'ic_launcher.png'), buf);
      await writeBufferPng(path.join(dir, 'ic_launcher_round.png'), buf);
    }
    for (const [folder, size] of ANDROID_SPLASH) {
      const dir = path.join(androidRes, folder);
      ensureDir(dir);
      const scaled = await Jimp.read(splashOut);
      scaled.resize(size, size);
      const buf = await jimpGetBuffer(scaled, Jimp);
      await writeBufferPng(path.join(dir, 'splashscreen_logo.png'), buf);
    }
  }

  console.log('Solid jimp assets written and verified.');
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch (err) {
    throw new Error(
      `sharp is required for brand regenerate (non --solid). Install sharp or use --solid. (${err.message})`
    );
  }
}

/**
 * Re-encode RGBA through jimp-compact so Expo prebuild's PNG reader accepts CRC.
 */
async function reencodeWithJimp(filePath, size) {
  const Jimp = loadJimp();
  const sharp = await loadSharp();
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .resize(size, size, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const image = new Jimp(info.width, info.height);
  Buffer.from(data).copy(image.bitmap.data);
  const out = await jimpGetBuffer(image, Jimp);
  if (!isPngBuffer(out)) throw new Error(`jimp re-encode produced non-PNG for ${filePath}`);
  const tmp = `${filePath}.tmp.png`;
  fs.writeFileSync(tmp, out);
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
  fs.renameSync(tmp, filePath);
  await assertJimpReadable(filePath);
}

async function writePng(sharp, pipeline, dest) {
  ensureDir(path.dirname(dest));
  await pipeline.png({ compressionLevel: 9, adaptiveFiltering: false, palette: false, force: true }).toFile(dest);
  const bytes = assertPngFile(dest);
  console.log(`Wrote ${path.relative(root, dest)} (${bytes} bytes, PNG)`);
}

function circularMaskSvg(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/>` +
      `</svg>`
  );
}

async function loadCircularMark(sharp, sourcePath, size = ICON_SIZE) {
  const meta = await sharp(sourcePath).metadata();
  const side = Math.min(meta.width ?? size, meta.height ?? size);

  const base = await sharp(sourcePath)
    .rotate()
    .ensureAlpha()
    .resize(side, side, { fit: 'cover', position: 'centre' })
    .resize(size, size, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const masked = await sharp(base.data, {
    raw: { width: size, height: size, channels: 4 },
  })
    .composite([{ input: circularMaskSvg(size), blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp(masked);
}

async function composeSplash(sharp, circularPngBuffer, size = ICON_SIZE) {
  const bg = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: '#FFFAF5',
    },
  })
    .png()
    .toBuffer();

  const inset = Math.round(size * 0.08);
  const mark = await sharp(circularPngBuffer)
    .resize(size - inset * 2, size - inset * 2, { fit: 'contain' })
    .png()
    .toBuffer();

  return sharp(bg).composite([{ input: mark, gravity: 'centre' }]);
}

async function writeAndroidIcons(sharp, circularPngBuffer) {
  if (!fs.existsSync(androidRes)) {
    console.warn('android/ res missing — skipping mipmap/splash drawable sync');
    return;
  }

  for (const [folder, size] of ANDROID_MIPMAP) {
    const dir = path.join(androidRes, folder);
    ensureDir(dir);

    for (const name of ['ic_launcher.webp', 'ic_launcher_round.webp']) {
      const stale = path.join(dir, name);
      if (fs.existsSync(stale)) fs.unlinkSync(stale);
    }

    const pipeline = sharp(circularPngBuffer).resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    await writePng(sharp, pipeline.clone(), path.join(dir, 'ic_launcher.png'));
    await writePng(sharp, pipeline.clone(), path.join(dir, 'ic_launcher_round.png'));
  }

  for (const [folder, size] of ANDROID_SPLASH) {
    const dir = path.join(androidRes, folder);
    ensureDir(dir);
    const splashPipeline = await composeSplash(sharp, circularPngBuffer, size);
    await writePng(sharp, splashPipeline, path.join(dir, 'splashscreen_logo.png'));
  }
}

async function writeJimpPlaceholdersOnly() {
  console.warn('Writing jimp-verified solid placeholders (brand source missing).');
  await writeSolidExpoAssets();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureDir(assetsDir);
  ensureDir(brandingDir);

  if (args.solid) {
    await writeSolidExpoAssets();
    return;
  }

  const expoPaths = EXPO_ASSET_FILES.map((f) => path.join(assetsDir, f));
  const validity = await Promise.all(expoPaths.map((p) => isJimpValidExpoAsset(p)));
  const allValid = validity.every(Boolean);

  if (allValid && !args.force && !args.source) {
    for (const p of expoPaths) {
      console.log(`OK ${path.relative(root, p)} (${fs.statSync(p).size} bytes)`);
    }
    console.log('postinstall: Expo assets are jimp-readable — leaving unchanged (use --force or --solid).');
    return;
  }

  const sourceCandidate =
    args.source ||
    process.env.BRAND_SOURCE ||
    (fs.existsSync(FULL_LOGO) ? FULL_LOGO : null);

  if (!sourceCandidate || !fs.existsSync(sourceCandidate)) {
    await writeJimpPlaceholdersOnly();
    return;
  }

  const sharp = await loadSharp();
  const meta = await sharp(sourceCandidate).metadata();
  console.log(
    `Source: ${sourceCandidate} (${meta.format}, ${meta.width}x${meta.height}, channels=${meta.channels})`
  );

  const circular = await loadCircularMark(sharp, sourceCandidate, ICON_SIZE);
  const circularBuf = await circular.png().toBuffer();
  if (!isPngBuffer(circularBuf)) {
    throw new Error('Internal error: circular mark is not PNG');
  }

  await writePng(sharp, sharp(circularBuf), FULL_LOGO);
  await writePng(sharp, sharp(circularBuf), ICON_MARK);

  const splashMaster = await composeSplash(sharp, circularBuf, ICON_SIZE);
  await writePng(sharp, splashMaster, SPLASH_ART);

  const iconPath = path.join(assetsDir, 'icon.png');
  const adaptivePath = path.join(assetsDir, 'adaptive-icon.png');
  const faviconPath = path.join(assetsDir, 'favicon.png');
  const splashPath = path.join(assetsDir, 'splash.png');

  await writePng(sharp, sharp(circularBuf), iconPath);
  await writePng(sharp, sharp(circularBuf), adaptivePath);
  await writePng(
    sharp,
    sharp(circularBuf).resize(FAVICON_SIZE, FAVICON_SIZE, { fit: 'contain' }),
    faviconPath
  );
  await writePng(sharp, await composeSplash(sharp, circularBuf, ICON_SIZE), splashPath);

  await reencodeWithJimp(iconPath, ICON_SIZE);
  await reencodeWithJimp(adaptivePath, ICON_SIZE);
  await reencodeWithJimp(splashPath, ICON_SIZE);
  await reencodeWithJimp(faviconPath, FAVICON_SIZE);
  await reencodeWithJimp(FULL_LOGO, ICON_SIZE);
  await reencodeWithJimp(ICON_MARK, ICON_SIZE);
  await reencodeWithJimp(SPLASH_ART, ICON_SIZE);

  await writeAndroidIcons(sharp, circularBuf);

  const verify = [
    FULL_LOGO,
    ICON_MARK,
    SPLASH_ART,
    iconPath,
    adaptivePath,
    splashPath,
    faviconPath,
  ];
  for (const f of verify) {
    assertPngFile(f);
    await assertJimpReadable(f);
  }
  console.log('All brand assets verified as real PNG + jimp-compact readable.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
