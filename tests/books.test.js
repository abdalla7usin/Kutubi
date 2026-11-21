const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { initDatabase, closeDb } = require('../db/database');
const booksService = require('../services/books.service');

describe('Books Service & CRUD Operations', () => {
  let db;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('should retrieve all books and support search by English and Arabic terms', () => {
    const all = booksService.getBooks({}, db);
    assert.strictEqual(all.length, 24);

    // Search English
    const pragmatic = booksService.getBooks({ search: 'Pragmatic' }, db);
    assert.strictEqual(pragmatic.length, 1);
    assert.strictEqual(pragmatic[0].title, 'The Pragmatic Programmer');

    // Search Arabic
    const granada = booksService.getBooks({ search: 'غرناطة' }, db);
    assert.strictEqual(granada.length, 1);
    assert.strictEqual(granada[0].title, 'ثلاثية غرناطة');

    // Search Author
    const kleppmann = booksService.getBooks({ search: 'Kleppmann' }, db);
    assert.strictEqual(kleppmann.length, 1);
    assert.strictEqual(kleppmann[0].author, 'Martin Kleppmann');
  });

  it('should filter by status and category accurately', () => {
    const reading = booksService.getBooks({ status: 'Reading' }, db);
    assert.strictEqual(reading.length, 3);

    const engineering = booksService.getBooks({ category: 'Engineering' }, db);
    assert.strictEqual(engineering.length, 8);

    // Combined filter
    const readingEng = booksService.getBooks({ status: 'Reading', category: 'Engineering' }, db);
    assert.strictEqual(readingEng.length, 2);
  });

  it('should sort books by Title, Progress, Rating, and Recently Added', () => {
    const byTitle = booksService.getBooks({ sort: 'title' }, db);
    assert.ok(byTitle[0].title.localeCompare(byTitle[1].title) <= 0);

    const byRating = booksService.getBooks({ sort: 'rating' }, db);
    assert.strictEqual(byRating[0].rating, 5);

    const byProgress = booksService.getBooks({ sort: 'progress' }, db);
    assert.strictEqual(byProgress[0].status, 'Completed');
  });

  it('should create a valid book with proper status normalization', () => {
    const result = booksService.createBook({
      title: 'Operating Systems: Three Easy Pieces',
      author: 'Remzi Arpaci-Dusseau',
      category: 'Engineering',
      status: 'To Read',
      totalPages: 700,
      currentPage: 0,
      rating: 5,
      notes: 'Excellent systems text.'
    }, db);

    assert.strictEqual(result.success, true);
    assert.ok(result.book.id);
    assert.strictEqual(result.book.title, 'Operating Systems: Three Easy Pieces');
    assert.strictEqual(result.book.status, 'To Read');

    // Verification from DB
    const fetched = booksService.getBookById(result.book.id, db);
    assert.strictEqual(fetched.title, 'Operating Systems: Three Easy Pieces');
    assert.strictEqual(fetched.category, 'Engineering');
  });

  it('should auto-transition status to Completed when currentPage equals totalPages on create', () => {
    const result = booksService.createBook({
      title: 'Computer Networks',
      author: 'Andrew S. Tanenbaum',
      category: 'Engineering',
      status: 'Reading',
      totalPages: 900,
      currentPage: 900
    }, db);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.book.status, 'Completed');
    assert.strictEqual(result.book.currentPage, 900);
  });

  it('should reject creation when required fields are missing or invalid', () => {
    const noTitle = booksService.createBook({ author: 'Nobody', totalPages: 100 }, db);
    assert.strictEqual(noTitle.success, false);
    assert.ok(noTitle.errors.title);

    const invalidPages = booksService.createBook({ title: 'Test', author: 'Author', totalPages: -5 }, db);
    assert.strictEqual(invalidPages.success, false);
    assert.ok(invalidPages.errors.totalPages);
  });

  it('should update an existing book', () => {
    const all = booksService.getBooks({}, db);
    const book = all[0];

    const result = booksService.updateBook(book.id, {
      title: 'Updated Title',
      author: book.author,
      category: book.category,
      status: book.status,
      totalPages: book.totalPages,
      currentPage: book.currentPage,
      rating: 5
    }, db);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.book.title, 'Updated Title');
    assert.strictEqual(result.book.rating, 5);
  });

  it('should delete a book successfully', () => {
    const all = booksService.getBooks({}, db);
    const bookToDelete = all[all.length - 1];

    const result = booksService.deleteBook(bookToDelete.id, db);
    assert.strictEqual(result.success, true);

    const fetched = booksService.getBookById(bookToDelete.id, db);
    assert.strictEqual(fetched, null);
    assert.strictEqual(booksService.getBooks({}, db).length, 23);
  });
});
