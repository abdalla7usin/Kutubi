const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initDatabase, closeDb } = require('../db/database');
const booksService = require('../services/books.service');
const categoriesService = require('../services/categories.service');

const TEST_ISOLATED_DB_PATH = path.join(__dirname, '..', 'data', 'test_starter_lifecycle.db');

describe('Starter Books First-Run Seeding & Idempotency Protection', () => {
  before(() => {
    if (fs.existsSync(TEST_ISOLATED_DB_PATH)) fs.unlinkSync(TEST_ISOLATED_DB_PATH);
  });

  after(() => {
    closeDb();
    try {
      if (fs.existsSync(TEST_ISOLATED_DB_PATH)) fs.unlinkSync(TEST_ISOLATED_DB_PATH);
      const wal = TEST_ISOLATED_DB_PATH + '-wal';
      const shm = TEST_ISOLATED_DB_PATH + '-shm';
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {}
  });

  it('1 & 2: Genuinely fresh database must seed exactly 8 starter books and 5 default categories', () => {
    const db = initDatabase(TEST_ISOLATED_DB_PATH);

    const books = db.prepare('SELECT * FROM books').all();
    const categories = categoriesService.getAllCategories(db);

    assert.strictEqual(books.length, 8, 'Fresh installation must have exactly 8 starter books');
    assert.strictEqual(categories.length, 5, 'Fresh installation must have exactly 5 default categories');

    // Verify diversity
    const statuses = books.map(b => b.status);
    assert.ok(statuses.includes('Reading'), 'Has Reading status');
    assert.ok(statuses.includes('Completed'), 'Has Completed status');
    assert.ok(statuses.includes('To Read'), 'Has To Read status');

    // Verify Arabic & English presence
    const titles = books.map(b => b.title);
    assert.ok(titles.some(t => /[\u0600-\u06FF]/.test(t)), 'Contains Arabic titles');
    assert.ok(titles.some(t => /[a-zA-Z]/.test(t)), 'Contains English titles');

    // Verify all 5 categories are used
    const categoryIds = new Set(books.map(b => b.category_id));
    assert.strictEqual(categoryIds.size, 5, 'All 5 default categories are represented across starter books');

    // Verify marker in app_metadata
    const marker = db.prepare("SELECT value FROM app_metadata WHERE key = 'starter_books_seeded'").get();
    assert.ok(marker, 'starter_books_seeded marker must be recorded in app_metadata');
    assert.strictEqual(marker.value, '1');

    closeDb();
  });

  it('3 & 4: Restarting application must preserve the 8 books and not re-seed or duplicate', () => {
    const db = initDatabase(TEST_ISOLATED_DB_PATH);
    const count = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
    assert.strictEqual(count, 8, 'Must remain at exactly 8 books after restart');
    closeDb();
  });

  it('5 & 6: Deleting one starter book and restarting must leave exactly 7 books', () => {
    let db = initDatabase(TEST_ISOLATED_DB_PATH);
    const firstBook = db.prepare('SELECT id FROM books LIMIT 1').get();
    const delRes = booksService.deleteBook(firstBook.id, db);
    assert.strictEqual(delRes.success, true);

    const countBeforeRestart = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
    assert.strictEqual(countBeforeRestart, 7);
    closeDb();

    // Restart
    db = initDatabase(TEST_ISOLATED_DB_PATH);
    const countAfterRestart = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
    assert.strictEqual(countAfterRestart, 7, 'Must remain at exactly 7 books across restart');
    closeDb();
  });

  it('7 & 8: Deleting all remaining starter books and restarting must remain at 0 books (never repopulate)', () => {
    let db = initDatabase(TEST_ISOLATED_DB_PATH);
    db.prepare('DELETE FROM books').run();

    const countEmpty = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
    assert.strictEqual(countEmpty, 0);
    closeDb();

    // Restart
    db = initDatabase(TEST_ISOLATED_DB_PATH);
    const countAfterRestart = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
    assert.strictEqual(countAfterRestart, 0, 'Empty database must NEVER repopulate starter books after deletion');
    closeDb();
  });

  it('9 & 10: Adding personal book and restarting must persist personal book normally', () => {
    let db = initDatabase(TEST_ISOLATED_DB_PATH);
    const created = booksService.createBook({
      title: 'Personal Book Title',
      author: 'Personal Author',
      category: 'Engineering',
      status: 'Reading',
      totalPages: 300,
      currentPage: 50,
      idempotencyKey: 'token-personal-1'
    }, db);
    assert.strictEqual(created.success, true);
    assert.strictEqual(created.book.title, 'Personal Book Title');
    closeDb();

    // Restart
    db = initDatabase(TEST_ISOLATED_DB_PATH);
    const countAfterRestart = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
    assert.strictEqual(countAfterRestart, 1, 'Exactly 1 personal book');
    const book = db.prepare('SELECT title, author FROM books WHERE id = ?').get(created.book.id);
    assert.strictEqual(book.title, 'Personal Book Title');
    closeDb();
  });

  it('11: Repeated submissions with the same idempotency token must not create duplicate records', () => {
    const db = initDatabase(TEST_ISOLATED_DB_PATH);
    const initialCount = db.prepare('SELECT COUNT(*) as c FROM books').get().c;

    const submissionToken = 'idemp-duplicate-test-key-12345';

    // First submission
    const res1 = booksService.createBook({
      title: 'Idempotent Masterpiece',
      author: 'Craftsman',
      category: 'Engineering',
      status: 'Reading',
      totalPages: 250,
      currentPage: 25,
      idempotencyKey: submissionToken
    }, db);
    assert.strictEqual(res1.success, true);
    const createdId = res1.book.id;

    // Second repeated submission with same token (e.g. double click)
    const res2 = booksService.createBook({
      title: 'Idempotent Masterpiece',
      author: 'Craftsman',
      category: 'Engineering',
      status: 'Reading',
      totalPages: 250,
      currentPage: 25,
      idempotencyKey: submissionToken
    }, db);

    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.book.id, createdId, 'Must return the existing book ID');
    assert.strictEqual(res2.isDuplicatePrevented, true, 'isDuplicatePrevented flag set');

    // Verify row count increased by exactly 1, not 2
    const finalCount = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
    assert.strictEqual(finalCount, initialCount + 1, 'Database count must only increment by 1');

    closeDb();
  });

  it('12: Distinct intentional submissions with identical title and author must remain allowed', () => {
    const db = initDatabase(TEST_ISOLATED_DB_PATH);
    const initialCount = db.prepare('SELECT COUNT(*) as c FROM books').get().c;

    // Distinct submission 1
    const res1 = booksService.createBook({
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      category: 'Fiction & Sci-Fi',
      status: 'Completed',
      totalPages: 180,
      idempotencyKey: 'distinct-token-alpha'
    }, db);
    assert.strictEqual(res1.success, true);

    // Distinct submission 2 (e.g. different edition or deliberate second copy)
    const res2 = booksService.createBook({
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      category: 'Fiction & Sci-Fi',
      status: 'To Read',
      totalPages: 195,
      idempotencyKey: 'distinct-token-beta'
    }, db);
    assert.strictEqual(res2.success, true);
    assert.notStrictEqual(res1.book.id, res2.book.id, 'Different tokens must create separate distinct records');

    const finalCount = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
    assert.strictEqual(finalCount, initialCount + 2, 'Database count must increment by 2');

    closeDb();
  });
});
