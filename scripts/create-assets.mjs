/**
 * Generate Ganeshay product brand assets as real 8-bit PNGs (and Android mipmaps).
 *
 * Usage:
 *   node scripts/create-assets.mjs
 *   node scripts/create-assets.mjs --force
 *   node scripts/create-assets.mjs --source "C:/path/to/logo.png"
 *
 * postinstall: if committed Expo PNGs are already valid, leave them alone.
 * Never overwrite good icons with tiny/corrupt placeholders (Codemagic jimp CRC).
 *
 * Source may be JPEG or PNG; output is always valid PNG (magic 89 50 4E 47).
 * Does NOT touch vendor businessLogo / receipt artwork.
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

const SPLASH_BG = '#FFFAF5';
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

/** Valid tiny PNG (10x10) — NOT the corrupt placeholder that caused CRC 79495168. */
const SAFE_PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYGD4z0DwMDIwMiABT4ABpIEvQAAAABJRU5ErkJggg==',
  'base64'
);

function parseArgs(argv) {
  const args = { force: false, source: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--force' || a === '-f') args.force = true;
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

/** True if file is a real PNG large enough to not be a corrupt CI placeholder. */
function isValidExpoAsset(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const size = assertPngFile(filePath);
    const name = path.basename(filePath);
    if (name === 'favicon.png') return size >= 100;
    return size >= 1024;
  } catch {
    return false;
  }
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch (err) {
    throw new Error(
      `sharp is required to regenerate brand assets. Install it (npm i -D sharp) or commit valid assets/. (${err.message})`
    );
  }
}

async function assertJimpReadable(filePath) {
  let Jimp;
  try {
    Jimp = require('jimp-compact');
  } catch {
    console.warn('jimp-compact not installed — skipping CI CRC verification for', path.relative(root, filePath));
    return;
  }
  const buf = fs.readFileSync(filePath);
  try {
    const img = await Jimp.read(buf);
    if (!img?.bitmap?.width) throw new Error('empty bitmap');
  } catch (err) {
    throw new Error(
      `jimp-compact cannot read ${path.relative(root, filePath)} (${buf.length} bytes): ${err.message}. ` +
        'This is the Codemagic Expo prebuild CRC failure mode — regenerate with --force.'
    );
  }
}

/**
 * Re-encode RGBA through jimp-compact so Expo prebuild's PNG reader accepts CRC.
 * Sharp-only PNGs have occasionally failed on CI with identical CRC symptoms as corrupt placeholders.
 */
async function reencodeWithJimp(filePath, size) {
  let Jimp;
  try {
    Jimp = require('jimp-compact');
  } catch {
    return;
  }
  const sharp = await loadSharp();
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .resize(size, size, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const image = new Jimp(info.width, info.height);
  Buffer.from(data).copy(image.bitmap.data);
  const out = await new Promise((resolve, reject) => {
    image.getBuffer(Jimp.MIME_PNG, (err, b) => (err ? reject(err) : resolve(b)));
  });
  if (!isPngBuffer(out)) throw new Error(`jimp re-encode produced non-PNG for ${filePath}`);
  const tmp = `${filePath}.tmp.png`;
  fs.writeFileSync(tmp, out);
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
  fs.renameSync(tmp, filePath);
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
      background: SPLASH_BG,
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

function writeMissingPlaceholdersOnly() {
  ensureDir(assetsDir);
  for (const file of EXPO_ASSET_FILES) {
    const dest = path.join(assetsDir, file);
    if (isValidExpoAsset(dest)) continue;
    fs.writeFileSync(dest, SAFE_PLACEHOLDER_PNG);
    console.log(`Wrote safe placeholder assets/${file}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureDir(assetsDir);
  ensureDir(brandingDir);

  const expoPaths = EXPO_ASSET_FILES.map((f) => path.join(assetsDir, f));
  const allValid = expoPaths.every((p) => isValidExpoAsset(p));

  if (allValid && !args.force && !args.source) {
    for (const p of expoPaths) {
      console.log(`OK ${path.relative(root, p)} (${fs.statSync(p).size} bytes)`);
      await assertJimpReadable(p);
    }
    console.log('postinstall: committed Expo assets are valid — leaving unchanged (use --force to rebuild).');
    return;
  }

  const sourceCandidate =
    args.source ||
    process.env.BRAND_SOURCE ||
    (fs.existsSync(FULL_LOGO) ? FULL_LOGO : null);

  if (!sourceCandidate || !fs.existsSync(sourceCandidate)) {
    writeMissingPlaceholdersOnly();
    for (const p of expoPaths) {
      if (fs.existsSync(p)) await assertJimpReadable(p);
    }
    console.warn(
      'Missing brand source. Pass --source <path> or add assets/branding/ganeshay-logo.png'
    );
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

  // Permanent Codemagic fix: Expo prebuild uses jimp-compact; re-encode Expo public assets with it.
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
