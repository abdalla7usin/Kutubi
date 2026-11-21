const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { initDatabase, closeDb } = require('../db/database');
const booksService = require('../services/books.service');

describe('Reading Progress Logic & State Transitions', () => {
  let db;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('should transition to Reading when partial progress is submitted on a To Read book', () => {
    const toReadBook = booksService.getBooks({ status: 'To Read' }, db)[0];
    assert.strictEqual(toReadBook.status, 'To Read');
    assert.strictEqual(toReadBook.currentPage, 0);

    const result = booksService.updateProgress(toReadBook.id, 50, db);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.book.currentPage, 50);
    assert.strictEqual(result.book.status, 'Reading');
  });

  it('should auto-transition to Completed when currentPage equals totalPages', () => {
    const readingBook = booksService.getBooks({ status: 'Reading' }, db)[0];
    assert.strictEqual(readingBook.status, 'Reading');

    const result = booksService.updateProgress(readingBook.id, readingBook.totalPages, db);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.book.currentPage, readingBook.totalPages);
    assert.strictEqual(result.book.status, 'Completed');
  });

  it('should reset status to To Read when currentPage is updated to 0', () => {
    const readingBook = booksService.getBooks({ status: 'Reading' }, db)[0];

    const result = booksService.updateProgress(readingBook.id, 0, db);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.book.currentPage, 0);
    assert.strictEqual(result.book.status, 'To Read');
  });

  it('should reject invalid progress values exceeding total pages', () => {
    const book = booksService.getBooks({}, db)[0];

    const result = booksService.updateProgress(book.id, book.totalPages + 50, db);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Current page cannot exceed total pages.');
  });

  it('should reject negative, decimal, and non-numeric page values', () => {
    const book = booksService.getBooks({}, db)[0];

    const negResult = booksService.updateProgress(book.id, -10, db);
    assert.strictEqual(negResult.success, false);
    assert.strictEqual(negResult.error, 'Current page cannot be negative.');

    const decResult = booksService.updateProgress(book.id, 12.5, db);
    assert.strictEqual(decResult.success, false);
    assert.strictEqual(decResult.error, 'Current page must be a whole number.');

    const strResult = booksService.updateProgress(book.id, 'invalid', db);
    assert.strictEqual(strResult.success, false);
  });
});
