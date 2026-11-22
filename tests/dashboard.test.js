const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { initDatabase, closeDb } = require('../db/database');
const { seedSampleBooksForTests } = require('../db/seed');
const dashboardService = require('../services/dashboard.service');
const booksService = require('../services/books.service');

describe('Dashboard Live Metrics & Section Queries', () => {
  let db;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('should handle fresh zero-books state gracefully without NaN or division by zero', () => {
    const data = dashboardService.getDashboardData(db);
    assert.strictEqual(data.metrics.totalBooks, 0);
    assert.strictEqual(data.metrics.categoriesCount, 5);
    assert.strictEqual(data.metrics.reading, 0);
    assert.strictEqual(data.metrics.completed, 0);
    assert.strictEqual(data.metrics.toRead, 0);
    assert.strictEqual(data.metrics.completedPercent, 0);
    assert.strictEqual(data.currentlyReading.length, 0);
    assert.strictEqual(data.recentlyAdded.length, 0);
  });

  it('should calculate live metrics accurately when fixture books are present', () => {
    seedSampleBooksForTests(db);
    const data = dashboardService.getDashboardData(db);

    assert.strictEqual(data.metrics.totalBooks, 24);
    assert.strictEqual(data.metrics.categoriesCount, 5);
    assert.strictEqual(data.metrics.reading, 3);
    assert.strictEqual(data.metrics.completed, 14);
    assert.strictEqual(data.metrics.toRead, 7);
    assert.strictEqual(data.metrics.completedPercent, 58); // Math.round(14 / 24 * 100) = 58
  });

  it('should retrieve up to 3 currently reading books with calculated percentage', () => {
    seedSampleBooksForTests(db);
    const data = dashboardService.getDashboardData(db);

    assert.strictEqual(data.currentlyReading.length, 3);
    for (const book of data.currentlyReading) {
      assert.strictEqual(book.status, 'Reading');
      assert.ok(book.progressPercent > 0 && book.progressPercent < 100);
    }
  });

  it('should retrieve 4 most recently added books', () => {
    seedSampleBooksForTests(db);
    const data = dashboardService.getDashboardData(db);

    assert.strictEqual(data.recentlyAdded.length, 4);
  });
});
