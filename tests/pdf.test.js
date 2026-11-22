/**
 * Kutubi - In-App PDF Reader & Storage Integration Tests
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const pdfService = require('../services/pdf.service');
const booksService = require('../services/books.service');
const { initDatabase } = require('../db/database');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test_pdf_suite.db');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// Minimal valid 3-page PDF fixture
const VALID_3PAGE_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 9 0 R >> >> >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 7 0 R /Resources << /Font << /F1 9 0 R >> >> >>
endobj
5 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 8 0 R /Resources << /Font << /F1 9 0 R >> >> >>
endobj
6 0 obj
<< /Length 35 >>
stream
BT /F1 24 Tf 50 700 Td (Page 1 Cover) ET
endstream
endobj
7 0 obj
<< /Length 38 >>
stream
BT /F1 18 Tf 50 700 Td (Page 2 Content) ET
endstream
endobj
8 0 obj
<< /Length 38 >>
stream
BT /F1 18 Tf 50 700 Td (Page 3 Content) ET
endstream
endobj
9 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 10
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000129 00000 n 
0000000250 00000 n 
0000000371 00000 n 
0000000492 00000 n 
0000000578 00000 n 
0000000667 00000 n 
0000000756 00000 n 
trailer
<< /Size 10 /Root 1 0 R >>
startxref
844
%%EOF`;

describe('In-App PDF Service & Document Reader Operations', () => {
  let db;
  let testPdfPath;
  let invalidPdfPath;

  before(() => {
    // Setup isolated SQLite database
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = initDatabase(TEST_DB_PATH);

    // Setup fixtures
    testPdfPath = path.join(FIXTURES_DIR, 'valid_test.pdf');
    fs.writeFileSync(testPdfPath, VALID_3PAGE_PDF);

    invalidPdfPath = path.join(FIXTURES_DIR, 'fake.pdf');
    fs.writeFileSync(invalidPdfPath, 'This is a text file posing as a PDF without magic bytes.');
  });

  after(() => {
    try {
      db.close();
      if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
      if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
      if (fs.existsSync(invalidPdfPath)) fs.unlinkSync(invalidPdfPath);
      if (fs.existsSync(FIXTURES_DIR)) fs.rmdirSync(FIXTURES_DIR);
    } catch {}
  });

  it('should validate PDF magic bytes signature accurately', () => {
    assert.equal(pdfService.isValidPdfSignature(testPdfPath), true);
    assert.equal(pdfService.isValidPdfSignature(invalidPdfPath), false);
  });

  it('should reject invalid or spoofed PDF documents', async () => {
    await assert.rejects(
      async () => {
        await pdfService.processUploadedPdf(invalidPdfPath, 'fake.pdf');
      },
      /Invalid file format/
    );
  });

  it('should process valid PDF, detect 3 pages, and extract first-page thumbnail', async () => {
    // Create copy for processing
    const tempCopy = path.join(pdfService.TEMP_DIR, 'temp_valid.pdf');
    fs.copyFileSync(testPdfPath, tempCopy);

    const result = await pdfService.processUploadedPdf(tempCopy, 'sample_manual.pdf');

    assert.ok(result.pdfPath, 'Should return generated pdfPath');
    assert.equal(result.pdfFilename, 'sample_manual.pdf');
    assert.equal(result.pdfPageCount, 3, 'Should detect exactly 3 pages');
    assert.ok(result.pdfSize > 0, 'File size must be greater than zero');
    assert.ok(result.coverImage, 'Should generate cover thumbnail');

    const fullPdfPath = pdfService.getSafePdfPath(result.pdfPath);
    const fullCoverPath = pdfService.getSafeCoverPath(result.coverImage);

    assert.ok(fs.existsSync(fullPdfPath), 'PDF file must exist on disk');
    assert.ok(fs.existsSync(fullCoverPath), 'Cover thumbnail must exist on disk');

    // Clean up
    pdfService.cleanupPdfFiles(result.pdfPath, result.coverImage);
    assert.equal(fs.existsSync(fullPdfPath), false, 'PDF must be removed on cleanup');
    assert.equal(fs.existsSync(fullCoverPath), false, 'Cover must be removed on cleanup');
  });

  it('should attach PDF metadata to created book and persist in database', async () => {
    const tempCopy = path.join(pdfService.TEMP_DIR, 'temp_book.pdf');
    fs.copyFileSync(testPdfPath, tempCopy);
    const pdfData = await pdfService.processUploadedPdf(tempCopy, 'architecture.pdf');

    const createResult = booksService.createBook({
      title: 'Software Architecture Notes',
      author: 'Test Author',
      totalPages: 3,
      currentPage: 1,
      status: 'Reading',
      ...pdfData
    }, db);

    assert.equal(createResult.success, true);
    const book = createResult.book;
    assert.equal(book.pdfFilename, 'architecture.pdf');
    assert.equal(book.pdfPageCount, 3);
    assert.equal(book.lastReadPage, 1);
    assert.ok(book.coverImage);

    // Update reading position without changing confirmed progress
    const posResult = booksService.updateReadPosition(book.id, 2, db);
    assert.equal(posResult.success, true);
    assert.equal(posResult.lastReadPage, 2);

    const reloaded = booksService.getBookById(book.id, db);
    assert.equal(reloaded.lastReadPage, 2);
    assert.equal(reloaded.currentPage, 1, 'Confirmed progress must not be affected by reading position');

    // Delete book and verify associated files are cleaned up from disk
    const fullPdfPath = pdfService.getSafePdfPath(book.pdfPath);
    const fullCoverPath = pdfService.getSafeCoverPath(book.coverImage);

    const deleteResult = booksService.deleteBook(book.id, db);
    assert.equal(deleteResult.success, true);
    assert.equal(fs.existsSync(fullPdfPath), false, 'PDF file must be safely unlinked');
    assert.equal(fs.existsSync(fullCoverPath), false, 'Generated cover must be safely unlinked');
  });
});
