/**
 * Kutubi - PDF Processing & Storage Service
 * Handles secure file uploads, magic byte validation, page count detection,
 * automatic cover extraction, and file lifecycle management.
 * Delegates to Unified Storage Service (LocalStorageAdapter or VercelBlobStorageAdapter).
 */

const {
  getStorage,
  STORAGE_ROOT,
  PDFS_DIR,
  COVERS_DIR,
  TEMP_DIR,
  MAX_PDF_SIZE,
  isValidPdfSignature
} = require('./storage.service');

/**
 * Process an uploaded temporary PDF file
 */
async function processUploadedPdf(tempPath, originalName) {
  return await getStorage().processUploadedPdf(tempPath, originalName);
}

/**
 * Safely delete persistent PDF and generated cover
 */
function cleanupPdfFiles(pdfPath, coverImage) {
  return getStorage().cleanupFiles(pdfPath, coverImage);
}

/**
 * Get safe absolute path to a stored PDF (local mode)
 */
function getSafePdfPath(pdfFilename) {
  return getStorage().getSafePdfPath(pdfFilename);
}

/**
 * Get safe absolute path to a stored cover image (local mode)
 */
function getSafeCoverPath(coverFilename) {
  return getStorage().getSafeCoverPath(coverFilename);
}

/**
 * Get signed URL for PDF reader (blob mode)
 */
async function getSignedPdfUrl(pdfPath, expiresInSeconds) {
  return await getStorage().getSignedPdfUrl(pdfPath, expiresInSeconds);
}

/**
 * Check if active storage is cloud blob
 */
function isCloudStorage() {
  return getStorage().isCloudStorage();
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
  getSafeCoverPath,
  getSignedPdfUrl,
  isCloudStorage
};
