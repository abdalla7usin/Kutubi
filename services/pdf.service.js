/**
 * Kutubi - PDF Processing & Storage Service
 * Handles secure file uploads, magic byte validation, page count detection,
 * automatic cover extraction, and file lifecycle management.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');
const PDFS_DIR = path.join(STORAGE_ROOT, 'pdfs');
const COVERS_DIR = path.join(STORAGE_ROOT, 'covers');
const TEMP_DIR = path.join(STORAGE_ROOT, 'temp');

// Ensure directories exist
[PDFS_DIR, COVERS_DIR, TEMP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Maximum upload size: 50MB
const MAX_PDF_SIZE = 50 * 1024 * 1024;

/**
 * Validates whether a file begins with the official PDF magic bytes (%PDF-)
 * @param {string} filePath
 * @returns {boolean}
 */
function isValidPdfSignature(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(5);
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);
    return buffer.toString('utf8', 0, 5) === '%PDF-';
  } catch (err) {
    return false;
  }
}

/**
 * Process an uploaded temporary PDF file:
 * 1. Validates magic bytes
 * 2. Generates safe persistent filenames
 * 3. Extracts page count and renders page 1 thumbnail
 * 4. Moves PDF into persistent storage
 * @param {string} tempPath - Temporary file path from multer
 * @param {string} originalName - User's original uploaded filename
 * @returns {Promise<{ pdfPath: string, pdfFilename: string, pdfSize: number, pdfPageCount: number, coverImage: string }>}
 */
async function processUploadedPdf(tempPath, originalName) {
  if (!fs.existsSync(tempPath)) {
    throw new Error('Uploaded file could not be found.');
  }

  const stats = fs.statSync(tempPath);
  if (stats.size > MAX_PDF_SIZE) {
    fs.unlinkSync(tempPath);
    throw new Error('File exceeds the maximum 50 MB size limit.');
  }

  if (!isValidPdfSignature(tempPath)) {
    fs.unlinkSync(tempPath);
    throw new Error('Invalid file format. File does not contain a valid PDF signature.');
  }

  const fileId = crypto.randomUUID();
  const pdfStoredName = `${fileId}.pdf`;
  const pdfDestPath = path.join(PDFS_DIR, pdfStoredName);

  // Move temporary file to persistent pdfs directory
  fs.copyFileSync(tempPath, pdfDestPath);
  fs.unlinkSync(tempPath);

  let pdfPageCount = 0;
  let coverStoredName = '';

  try {
    const { pdf } = await import('pdf-to-img');
    const doc = await pdf(pdfDestPath, { scale: 1.5 });
    pdfPageCount = doc.length || 0;

    if (pdfPageCount > 0) {
      const page1Buffer = await doc.getPage(1);
      coverStoredName = `${fileId}.png`;
      const coverDestPath = path.join(COVERS_DIR, coverStoredName);
      fs.writeFileSync(coverDestPath, page1Buffer);
    }
    await doc.destroy();
  } catch (err) {
    console.error('[PDF Service] Cover extraction warning:', err.message);
    // If thumbnail extraction fails, keep PDF and fallback gracefully
    coverStoredName = '';
  }

  // Sanitize original filename for display
  const safeOriginalName = path.basename(originalName || 'document.pdf');

  return {
    pdfPath: pdfStoredName,
    pdfFilename: safeOriginalName,
    pdfSize: stats.size,
    pdfPageCount,
    coverImage: coverStoredName
  };
}

/**
 * Safely delete persistent PDF and generated cover from disk
 * @param {string} [pdfPath] - Relative filename inside storage/pdfs
 * @param {string} [coverImage] - Relative filename inside storage/covers
 */
function cleanupPdfFiles(pdfPath, coverImage) {
  if (pdfPath) {
    const resolvedPdf = path.join(PDFS_DIR, path.basename(pdfPath));
    if (fs.existsSync(resolvedPdf) && !resolvedPdf.endsWith('.gitkeep')) {
      try {
        fs.unlinkSync(resolvedPdf);
      } catch (err) {
        console.error('[PDF Service] Could not remove PDF file:', err.message);
      }
    }
  }

  if (coverImage) {
    const resolvedCover = path.join(COVERS_DIR, path.basename(coverImage));
    if (fs.existsSync(resolvedCover) && !resolvedCover.endsWith('.gitkeep')) {
      try {
        fs.unlinkSync(resolvedCover);
      } catch (err) {
        console.error('[PDF Service] Could not remove cover file:', err.message);
      }
    }
  }
}

/**
 * Get safe absolute path to a stored PDF
 * @param {string} pdfFilename
 * @returns {string|null}
 */
function getSafePdfPath(pdfFilename) {
  if (!pdfFilename) return null;
  const safeName = path.basename(pdfFilename);
  const resolved = path.join(PDFS_DIR, safeName);
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  return null;
}

/**
 * Get safe absolute path to a stored cover image
 * @param {string} coverFilename
 * @returns {string|null}
 */
function getSafeCoverPath(coverFilename) {
  if (!coverFilename) return null;
  const safeName = path.basename(coverFilename);
  const resolved = path.join(COVERS_DIR, safeName);
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  return null;
}

module.exports = {
  STORAGE_ROOT,
  PDFS_DIR,
  COVERS_DIR,
  TEMP_DIR,
  MAX_PDF_SIZE,
  isValidPdfSignature,
  processUploadedPdf,
  cleanupPdfFiles,
  getSafePdfPath,
  getSafeCoverPath
};
