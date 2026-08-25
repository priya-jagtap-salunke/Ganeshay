/**
 * Fail CI early if any Expo / branding PNG is unreadable by jimp-compact
 * (same reader Expo iOS prebuild uses). Prints the failing path.
 *
 * Usage: node scripts/verify-expo-pngs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadAppJsonImages() {
  const appJsonPath = path.join(root, 'app.json');
  const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const expo = app.expo ?? {};
  const paths = [];

  const push = (p, label) => {
    if (typeof p === 'string' && p.length) paths.push({ file: p, label });
  };

  push(expo.icon, 'expo.icon');
  push(expo.splash?.image, 'expo.splash.image');
  push(expo.android?.adaptiveIcon?.foregroundImage, 'expo.android.adaptiveIcon.foregroundImage');
  push(expo.android?.adaptiveIcon?.backgroundImage, 'expo.android.adaptiveIcon.backgroundImage');
  push(expo.android?.adaptiveIcon?.monochromeImage, 'expo.android.adaptiveIcon.monochromeImage');
  push(expo.web?.favicon, 'expo.web.favicon');
  push(expo.notification?.icon, 'expo.notification.icon');
  if (typeof expo.ios?.icon === 'string') push(expo.ios.icon, 'expo.ios.icon');
  if (expo.ios?.icon && typeof expo.ios.icon === 'object') {
    push(expo.ios.icon.light, 'expo.ios.icon.light');
    push(expo.ios.icon.dark, 'expo.ios.icon.dark');
    push(expo.ios.icon.tinted, 'expo.ios.icon.tinted');
  }

  return paths;
}

function resolveRepoPath(rel) {
  const cleaned = rel.replace(/^\.\//, '');
  return path.join(root, cleaned);
}

async function jimpRead(absPath) {
  let Jimp;
  try {
    Jimp = require('jimp-compact');
  } catch {
    // Expo brings jimp-compact; fall back to requiring through @expo/image-utils deps
    Jimp = require(path.join(root, 'node_modules', 'jimp-compact'));
  }
  const buf = fs.readFileSync(absPath);
  const img = await Jimp.read(buf);
  if (!img?.bitmap?.width) throw new Error('empty bitmap');
  return { bytes: buf.length, width: img.bitmap.width, height: img.bitmap.height };
}

async function main() {
  const candidates = [
    ...loadAppJsonImages(),
    { file: 'assets/branding/ganeshay-logo.png', label: 'branding.logo' },
    { file: 'assets/branding/ganeshay-icon.png', label: 'branding.icon' },
    { file: 'assets/branding/ganeshay-splash.png', label: 'branding.splash' },
  ];

  // de-dupe by resolved path
  const seen = new Set();
  const unique = [];
  for (const c of candidates) {
    const abs = resolveRepoPath(c.file);
    if (seen.has(abs)) continue;
    seen.add(abs);
    unique.push({ ...c, abs });
  }

  console.log('verify-expo-pngs: checking', unique.length, 'files with jimp-compact');
  console.log('cwd=', root);
  try {
    console.log('git=', require('child_process').execSync('git rev-parse HEAD', { cwd: root }).toString().trim());
  } catch {
    /* ignore */
  }

  let failed = 0;
  for (const c of unique) {
    const rel = path.relative(root, c.abs);
    if (!fs.existsSync(c.abs)) {
      console.error(`MISSING [${c.label}] ${rel}`);
      failed += 1;
      continue;
    }
    try {
      const meta = await jimpRead(c.abs);
      console.log(`OK [${c.label}] ${rel} (${meta.bytes} bytes, ${meta.width}x${meta.height})`);
    } catch (err) {
      console.error(`FAIL [${c.label}] ${rel}`);
      console.error(`  ${err.message}`);
      failed += 1;
    }
  }

  if (failed) {
    console.error(`\nverify-expo-pngs: ${failed} file(s) failed jimp-compact read.`);
    console.error('This is the Expo iOS prebuild CRC failure mode. Fix assets before prebuild.');
    process.exit(1);
  }
  console.log('verify-expo-pngs: all OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
