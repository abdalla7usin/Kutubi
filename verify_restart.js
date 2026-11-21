/**
 * Kutubi - Server Restart Persistence Verification
 */
const { getDb, closeDb } = require('./db/database');
const booksService = require('./services/books.service');

async function testPersistence() {
  console.log('[Persistence Test] Starting server restart persistence check...');
  const db = getDb();

  // 1. Create a unique test book directly or through service
  const testTitle = 'Persistence Test Book ' + Date.now();
  console.log('  Creating book in SQLite:', testTitle);
  const created = booksService.createBook({
    title: testTitle,
    author: 'Test Architect',
    category: 'Engineering',
    totalPages: 300,
    currentPage: 100,
    status: 'Reading',
    rating: 5,
    notes: 'Testing persistence across SQLite database reloads.'
  });

  const createdId = created.book.id;
  console.log('  Book created with ID:', createdId);

  // 2. Fetch directly from database connection
  const rowBefore = db.prepare('SELECT * FROM books WHERE id = ?').get(createdId);
  if (!rowBefore) throw new Error('Book not found in database before restart!');
  console.log('  Book verified in SQLite before restart. Title:', rowBefore.title);

  // 3. Close database connection to simulate shutdown
  closeDb();
  console.log('  SQLite connection closed successfully (simulating server shutdown).');

  // 4. Re-open database connection
  const dbNew = getDb();
  const rowAfter = dbNew.prepare('SELECT * FROM books WHERE id = ?').get(createdId);
  if (!rowAfter) throw new Error('Book NOT found in database after reconnecting!');
  console.log('  Book verified in SQLite after reconnecting. Title:', rowAfter.title);

  // 5. Query through Books Service
  const serviceBook = booksService.getBookById(createdId);
  if (!serviceBook) throw new Error('Book service failed to retrieve book after restart!');
  console.log('  Book service successfully retrieved persisted book.');

  // 6. Clean up test book
  booksService.deleteBook(createdId);
  console.log('  Test book cleaned up.');

  console.log('PERSISTENCE ACROSS RESTART VERIFIED 100%!');
}

testPersistence().catch(err => {
  console.error('Persistence Test Failed:', err);
  process.exit(1);
});
