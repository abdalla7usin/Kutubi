const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { initDatabase, closeDb } = require('../db/database');
const { seedSampleBooksForTests } = require('../db/seed');
const categoriesService = require('../services/categories.service');
const booksService = require('../services/books.service');

describe('Categories Management & System Protection', () => {
  let db;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('should list all categories with accurate book counts', () => {
    // 1. In fresh empty database, all 5 categories have 0 books
    const initialCats = categoriesService.getAllCategories(db);
    assert.strictEqual(initialCats.length, 5);
    for (const cat of initialCats) {
      assert.strictEqual(cat.bookCount, 0);
    }

    // 2. With fixture data populated, book counts reflect category distribution
    seedSampleBooksForTests(db);
    const categories = categoriesService.getAllCategories(db);
    assert.strictEqual(categories.length, 5);

    const eng = categories.find(c => c.name === 'Engineering');
    assert.strictEqual(eng.bookCount, 8);

    const arabic = categories.find(c => c.name === 'Arabic Literature');
    assert.strictEqual(arabic.bookCount, 6);
  });

  it('should create a custom category and prevent duplicates case-insensitively', () => {
    const res = categoriesService.createCategory('Data Science', db);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.category.name, 'Data Science');

    // Duplicate attempt
    const dup = categoriesService.createCategory('data science', db);
    assert.strictEqual(dup.success, false);
    assert.ok(dup.error.includes('already exists'));

    // Empty attempt
    const empty = categoriesService.createCategory('   ', db);
    assert.strictEqual(empty.success, false);
  });

  it('should rename a custom category and reject duplicate names', () => {
    const res = categoriesService.createCategory('Cloud Computing', db);
    const catId = res.category.id;

    const renameRes = categoriesService.renameCategory(catId, 'Cloud & DevOps', db);
    assert.strictEqual(renameRes.success, true);

    const updated = categoriesService.getCategoryById(catId, db);
    assert.strictEqual(updated.name, 'Cloud & DevOps');

    // Attempt rename to existing name
    const dupRename = categoriesService.renameCategory(catId, 'Engineering', db);
    assert.strictEqual(dupRename.success, false);
  });

  it('should protect system Uncategorized category from rename and delete', () => {
    const uncategorized = categoriesService.getUncategorizedCategory(db);

    const renameAttempt = categoriesService.renameCategory(uncategorized.id, 'Other', db);
    assert.strictEqual(renameAttempt.success, false);
    assert.ok(renameAttempt.error.includes('system default'));

    const deleteAttempt = categoriesService.deleteCategory(uncategorized.id, db);
    assert.strictEqual(deleteAttempt.success, false);
    assert.ok(deleteAttempt.error.includes('system default'));
  });

  it('should safely delete custom category and reassign all its books to Uncategorized', () => {
    seedSampleBooksForTests(db);
    // Self-Development has 3 books
    const selfDev = categoriesService.getAllCategories(db).find(c => c.name === 'Self-Development');
    assert.strictEqual(selfDev.bookCount, 3);

    const uncategorizedBefore = categoriesService.getAllCategories(db).find(c => c.name === 'Uncategorized');
    assert.strictEqual(uncategorizedBefore.bookCount, 2);

    // Delete Self-Development
    const delResult = categoriesService.deleteCategory(selfDev.id, db);
    assert.strictEqual(delResult.success, true);
    assert.strictEqual(delResult.reassignedCount, 3);

    // Check Uncategorized now has 2 + 3 = 5 books
    const uncategorizedAfter = categoriesService.getAllCategories(db).find(c => c.name === 'Uncategorized');
    assert.strictEqual(uncategorizedAfter.bookCount, 5);

    // Total books remains 24
    assert.strictEqual(booksService.getBooks({}, db).length, 24);
  });
});
