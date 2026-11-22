/**
 * Kutubi - Vercel Build Script
 * Copies client-side PDF.js vendor assets to public/vendor/pdfjs
 * so they are served directly by Vercel Edge CDN without serverless invocations.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist');
const destDir = path.join(__dirname, '..', 'public', 'vendor', 'pdfjs');

const foldersToCopy = ['build', 'cmaps', 'iccs', 'standard_fonts', 'wasm'];

console.log('[Build] Preparing client-side PDF.js assets...');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const folder of foldersToCopy) {
  const src = path.join(srcDir, folder);
  const dest = path.join(destDir, folder);

  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`✓ Copied ${folder} to public/vendor/pdfjs/${folder}`);
  }
}

console.log('[Build] PDF.js client assets staged successfully for Edge CDN.');
