import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'assets');

// 10x10 maroon PNG placeholder
const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYGD4z0BDwMDIwMiABT4ABpIEvQAAAABJRU5ErkJggg==';
const buffer = Buffer.from(pngBase64, 'base64');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

['icon.png', 'splash.png', 'adaptive-icon.png'].forEach((file) => {
  fs.writeFileSync(path.join(assetsDir, file), buffer);
  console.log(`Created assets/${file}`);
});
