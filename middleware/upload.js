/**
 * Kutubi - Multer Upload Middleware for PDF Documents
 */

const multer = require('multer');
const path = require('path');
const { TEMP_DIR, MAX_PDF_SIZE } = require('../services/pdf.service');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'temp-upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_PDF_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (file.mimetype === 'application/pdf' || ext === '.pdf') {
      cb(null, true);
    } else {
      const err = new Error('Only PDF documents (.pdf) are allowed.');
      err.code = 'INVALID_FILE_TYPE';
      cb(err);
    }
  }
});

/**
 * Middleware wrapper to handle multer errors gracefully without 500 crashes
 * @param {string} fieldName
 */
function pdfUploadMiddleware(fieldName = 'pdfFile') {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          req.uploadError = 'File exceeds the maximum 50 MB upload limit.';
        } else {
          req.uploadError = err.message || 'File upload failed.';
        }
      }
      next();
    });
  };
}

module.exports = {
  pdfUploadMiddleware
};
