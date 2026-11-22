const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const { TursoAdapter } = require('../db/adapter');

const booksService = require('../services/books.service');
const categoriesService = require('../services/categories.service');
const dashboardService = require('../services/dashboard.service');
const profileService = require('../services/profile.service');
const settingsService = require('../services/settings.service');

const TEST_TURSO_DB_PATH = path.join(__dirname, 'test_turso_suite.db');

function cleanup() {
  if (fs.existsSync(TEST_TURSO_DB_PATH)) {
    try { fs.unlinkSync(TEST_TURSO_DB_PATH); } catch {}
  }
}

test('Turso Dual-Mode Services: End-to-End Test Suite', async (t) => {
  cleanup();
  const client = createClient({ url: 'file:' + TEST_TURSO_DB_PATH });
  const db = new TursoAdapter(client);

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);

  const now = new Date().toISOString();

  // 1. Categories Service
  const catRes = await categoriesService.createCategory('Computer Science', db);
  assert.strictEqual(catRes.success, true);
  assert.ok(catRes.category.id > 0);
  const catId = catRes.category.id;

  const allCats = await categoriesService.getAllCategories(db);
  assert.strictEqual(allCats.length, 1);
  assert.strictEqual(allCats[0].name, 'Computer Science');

  const renameRes = await categoriesService.renameCategory(catId, 'Software Engineering', db);
  assert.strictEqual(renameRes.success, true);

  const catByName = await categoriesService.getCategoryByName('software engineering', db);
  assert.ok(catByName);
  assert.strictEqual(catByName.id, catId);

  // 2. Books Service: Create & Query
  const bookInput = {
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    categoryId: catId,
    status: 'Reading',
    totalPages: 600,
    currentPage: 150,
    rating: 5,
    description: 'The definitive guide to distributed data systems.',
    idempotencyKey: 'idemp-turso-001'
  };

  const createRes = await booksService.createBook(bookInput, db);
  assert.strictEqual(createRes.success, true);
  assert.strictEqual(createRes.book.title, 'Designing Data-Intensive Applications');
  assert.strictEqual(createRes.book.status, 'Reading');
  const bookId = createRes.book.id;

  // Idempotency check with same key
  const dupRes = await booksService.createBook(bookInput, db);
  assert.strictEqual(dupRes.success, true);
  assert.strictEqual(dupRes.isDuplicatePrevented, true);
  assert.strictEqual(dupRes.book.id, bookId);

  // Get book by ID
  const fetched = await booksService.getBookById(bookId, db);
  assert.ok(fetched);
  assert.strictEqual(fetched.title, 'Designing Data-Intensive Applications');
  assert.strictEqual(fetched.category, 'Software Engineering');

  // Search & Filters
  const searchResults = await booksService.getBooks({ search: 'Kleppmann' }, db);
  assert.strictEqual(searchResults.length, 1);

  const filtered = await booksService.getBooks({ status: 'Reading', category: 'Software Engineering' }, db);
  assert.strictEqual(filtered.length, 1);

  // Update book
  const updateRes = await booksService.updateBook(bookId, {
    title: 'DDIA: Second Edition',
    author: 'Martin Kleppmann',
    totalPages: 650,
    currentPage: 200,
    rating: 5,
    status: 'Reading'
  }, db);
  assert.strictEqual(updateRes.success, true);
  assert.strictEqual(updateRes.book.title, 'DDIA: Second Edition');
  assert.strictEqual(updateRes.book.currentPage, 200);

  // Update reading progress
  const progressRes = await booksService.updateProgress(bookId, 650, db);
  assert.strictEqual(progressRes.success, true);
  assert.strictEqual(progressRes.book.status, 'Completed');
  assert.strictEqual(progressRes.book.currentPage, 650);

  // Update reader position
  const readPosRes = await booksService.updateReadPosition(bookId, 120, db);
  assert.strictEqual(readPosRes.success, true);
  assert.strictEqual(readPosRes.lastReadPage, 120);

  // 3. Dashboard Service
  const dashboard = await dashboardService.getDashboardData(db);
  assert.strictEqual(dashboard.metrics.totalBooks, 1);
  assert.strictEqual(dashboard.metrics.completed, 1);
  assert.strictEqual(dashboard.metrics.reading, 0);
  assert.strictEqual(dashboard.metrics.completedPercent, 100);

  // 4. Profile Service
  const profile = await profileService.getProfile(db);
  assert.ok(profile);

  const updateProfRes = await profileService.updateProfile({
    displayName: 'Abdalla Husin',
    bio: 'Software engineer building Kutubi on Vercel.'
  }, db);
  assert.strictEqual(updateProfRes.success, true);
  assert.strictEqual(updateProfRes.profile.displayName, 'Abdalla Husin');
  assert.strictEqual(updateProfRes.profile.initials, 'AH');

  const stats = await profileService.getProfileStats(db);
  assert.strictEqual(stats.stats.completedBooks, 1);
  assert.strictEqual(stats.stats.totalPagesRead, 650);
  assert.strictEqual(stats.stats.favoriteCategory, 'Software Engineering');

  // 5. Settings Service
  const settings = await settingsService.getSettings(db);
  assert.ok(settings);

  const updateSetRes = await settingsService.updateSettings({
    defaultLibraryView: 'list',
    defaultSortOrder: 'rating'
  }, db);
  assert.strictEqual(updateSetRes.defaultLibraryView, 'list');
  assert.strictEqual(updateSetRes.defaultSortOrder, 'rating');

  const exportJson = await settingsService.exportLibraryJson(db);
  assert.strictEqual(exportJson.app, 'Kutubi');
  assert.strictEqual(exportJson.books.length, 1);

  // 6. Referential Integrity Verification on Turso
  // Foreign key trigger rejection: Delete referenced category
  let deleteCatThrew = false;
  try {
    await db.execute('DELETE FROM categories WHERE id = ?', [catId]);
  } catch (err) {
    deleteCatThrew = true;
    assert.match(err.message, /FOREIGN KEY constraint failed/);
  }
  assert.strictEqual(deleteCatThrew, true, 'Deleting referenced category without reassigning must fail');

  // Safe delete category through service (which reassigns books to Uncategorized atomically)
  const delCatRes = await categoriesService.deleteCategory(catId, db);
  assert.strictEqual(delCatRes.success, true);
  assert.strictEqual(delCatRes.reassignedCount, 1);

  const bookAfterCatDelete = await booksService.getBookById(bookId, db);
  assert.strictEqual(bookAfterCatDelete.category, 'Uncategorized');

  // 7. Delete Book
  const delBookRes = await booksService.deleteBook(bookId, db);
  assert.strictEqual(delBookRes.success, true);

  const bookAfterDelete = await booksService.getBookById(bookId, db);
  assert.strictEqual(bookAfterDelete, null);

  await db.close();
  cleanup();
});
