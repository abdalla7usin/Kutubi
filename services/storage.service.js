/**
 * Kutubi - Unified Storage Service
 * Provides dual-mode file storage:
 * 1. LocalStorageAdapter (Local filesystem in storage/pdfs and storage/covers)
 * 2. VercelBlobStorageAdapter (Vercel Private Blob Store with signed scoped URLs)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');
const PDFS_DIR = path.join(STORAGE_ROOT, 'pdfs');
const COVERS_DIR = path.join(STORAGE_ROOT, 'covers');
const TEMP_DIR = path.join(STORAGE_ROOT, 'temp');

// Ensure local directories exist
[PDFS_DIR, COVERS_DIR, TEMP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validates PDF magic bytes signature (%PDF-)
 */
function isValidPdfSignature(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(5);
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);
    return buffer.toString('utf8', 0, 5) === '%PDF-';
  } catch {
    return false;
  }
}

class LocalStorageAdapter {
  constructor() {
    this.type = 'local';
  }

  isCloudStorage() {
    return false;
  }

  async processUploadedPdf(tempPath, originalName) {
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

    fs.copyFileSync(tempPath, pdfDestPath);
    try { fs.unlinkSync(tempPath); } catch {}

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
      console.warn('[LocalStorageAdapter] Thumbnail extraction warning:', err.message);
      coverStoredName = '';
    }

    const safeOriginalName = path.basename(originalName || 'document.pdf');

    return {
      pdfPath: pdfStoredName,
      pdfFilename: safeOriginalName,
      pdfSize: stats.size,
      pdfPageCount,
      coverImage: coverStoredName
    };
  }

  cleanupFiles(pdfPath, coverImage) {
    if (pdfPath) {
      const resolvedPdf = path.join(PDFS_DIR, path.basename(pdfPath));
      if (fs.existsSync(resolvedPdf) && !resolvedPdf.endsWith('.gitkeep')) {
        try { fs.unlinkSync(resolvedPdf); } catch {}
      }
    }

    if (coverImage) {
      const resolvedCover = path.join(COVERS_DIR, path.basename(coverImage));
      if (fs.existsSync(resolvedCover) && !resolvedCover.endsWith('.gitkeep')) {
        try { fs.unlinkSync(resolvedCover); } catch {}
      }
    }
  }

  getSafePdfPath(pdfFilename) {
    if (!pdfFilename) return null;
    const safeName = path.basename(pdfFilename);
    const resolved = path.join(PDFS_DIR, safeName);
    return fs.existsSync(resolved) ? resolved : null;
  }

  getSafeCoverPath(coverFilename) {
    if (!coverFilename) return null;
    const safeName = path.basename(coverFilename);
    const resolved = path.join(COVERS_DIR, safeName);
    return fs.existsSync(resolved) ? resolved : null;
  }

  async getSignedPdfUrl(pdfPath) {
    // In local mode, served via /books/:id/pdf
    return null;
  }

  getCoverUrl(coverFilename) {
    if (!coverFilename) return null;
    return `/storage/covers/${path.basename(coverFilename)}`;
  }
}

class VercelBlobStorageAdapter {
  constructor(token) {
    this.type = 'vercel-blob';
    this.token = token || process.env.BLOB_READ_WRITE_TOKEN;
    this.blobSdk = require('@vercel/blob');
  }

  isCloudStorage() {
    return true;
  }

  async processUploadedPdf(tempPath, originalName) {
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
    const pdfBlobPath = `kutubi/pdfs/${fileId}.pdf`;
    const coverBlobPath = `kutubi/covers/${fileId}.png`;

    const fileBuffer = fs.readFileSync(tempPath);

    // Render thumbnail locally before uploading to blob
    let pdfPageCount = 0;
    let coverBuffer = null;

    try {
      const { pdf } = await import('pdf-to-img');
      const doc = await pdf(tempPath, { scale: 1.5 });
      pdfPageCount = doc.length || 0;
      if (pdfPageCount > 0) {
        coverBuffer = await doc.getPage(1);
      }
      await doc.destroy();
    } catch (err) {
      console.warn('[VercelBlobAdapter] Thumbnail extraction fallback:', err.message);
    }

    try { fs.unlinkSync(tempPath); } catch {}

    // Upload PDF to Vercel Private Blob
    await this.blobSdk.put(pdfBlobPath, fileBuffer, {
      access: 'private',
      contentType: 'application/pdf',
      token: this.token
    });

    let storedCoverImage = '';
    if (coverBuffer) {
      await this.blobSdk.put(coverBlobPath, coverBuffer, {
        access: 'private',
        contentType: 'image/png',
        token: this.token
      });
      storedCoverImage = coverBlobPath;
    }

    const safeOriginalName = path.basename(originalName || 'document.pdf');

    return {
      pdfPath: pdfBlobPath,
      pdfFilename: safeOriginalName,
      pdfSize: stats.size,
      pdfPageCount,
      coverImage: storedCoverImage
    };
  }

  async cleanupFiles(pdfPath, coverImage) {
    const urlsToDelete = [];
    if (pdfPath) urlsToDelete.push(pdfPath);
    if (coverImage) urlsToDelete.push(coverImage);

    if (urlsToDelete.length > 0) {
      try {
        await this.blobSdk.del(urlsToDelete, { token: this.token });
      } catch (err) {
        console.warn('[VercelBlobAdapter] Cleanup warning:', err.message);
      }
    }
  }

  getSafePdfPath(pdfFilename) {
    // Files are in cloud blob, not on local disk
    return null;
  }

  getSafeCoverPath(coverFilename) {
    return null;
  }

  /**
   * Issue a short-lived (15 minutes), strictly scoped signed GET URL for reading a private PDF
   */
  async getSignedPdfUrl(pdfPath, expiresInSeconds = 900) {
    if (!pdfPath) return null;
    const validUntil = Date.now() + expiresInSeconds * 1000;

    const signedToken = await this.blobSdk.issueSignedToken({
      pathname: pdfPath,
      access: 'private',
      validUntil,
      allowedOperations: ['get'],
      token: this.token
    });

    const { presignedUrl } = await this.blobSdk.presignUrl(signedToken, {
      operation: 'get',
      pathname: pdfPath,
      access: 'private'
    });

    return presignedUrl;
  }

  /**
   * Issue a signed GET URL for cover image delivery
   */
  async getSignedCoverUrl(coverPath, expiresInSeconds = 3600) {
    if (!coverPath) return null;
    const validUntil = Date.now() + expiresInSeconds * 1000;

    const signedToken = await this.blobSdk.issueSignedToken({
      pathname: coverPath,
      access: 'private',
      validUntil,
      allowedOperations: ['get'],
      token: this.token
    });

    const { presignedUrl } = await this.blobSdk.presignUrl(signedToken, {
      operation: 'get',
      pathname: coverPath,
      access: 'private'
    });

    return presignedUrl;
  }

  getCoverUrl(coverFilename) {
    if (!coverFilename) return null;
    if (coverFilename.startsWith('http://') || coverFilename.startsWith('https://')) {
      return coverFilename;
    }
    // Route through cover proxy endpoint in production
    return `/storage/covers/${encodeURIComponent(coverFilename)}`;
  }
}

let activeStorageInstance = null;

function getStorage() {
  if (!activeStorageInstance) {
    if (process.env.STORAGE_ADAPTER === 'blob' || (process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV === 'production')) {
      activeStorageInstance = new VercelBlobStorageAdapter();
    } else {
      activeStorageInstance = new LocalStorageAdapter();
    }
  }
  return activeStorageInstance;
}

module.exports = {
  LocalStorageAdapter,
  VercelBlobStorageAdapter,
  getStorage,
  isValidPdfSignature,
  STORAGE_ROOT,
  PDFS_DIR,
  COVERS_DIR,
  TEMP_DIR,
  MAX_PDF_SIZE
};
